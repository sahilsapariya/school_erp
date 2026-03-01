"""
Payment Service

Handles payment creation, refunds, and status recalculations.
Uses db.session.begin() transactions and row-level locking to prevent race conditions.
"""

from decimal import Decimal
from typing import Dict, Optional, Any

from backend.core.database import db
from backend.core.tenant import get_tenant_id
from backend.modules.finance.models import (
    StudentFee,
    StudentFeeItem,
    Payment,
)
from backend.modules.finance.enums import (
    StudentFeeStatus,
    PaymentStatus,
    PaymentMethod,
)
from backend.modules.audit.services import log_finance_action


def recalculate_student_fee_status(student_fee: StudentFee) -> None:
    """
    Recalculate student_fee.status based on total_amount, paid_amount, and due_date.

    Status logic:
    - paid_amount >= total_amount -> paid
    - paid_amount > 0 -> partial
    - due_date < today -> overdue
    - else -> unpaid
    """
    from datetime import date

    total = Decimal(str(student_fee.total_amount or 0))
    paid = Decimal(str(student_fee.paid_amount or 0))

    if paid >= total and total > 0:
        student_fee.status = StudentFeeStatus.paid.value
    elif paid > 0:
        student_fee.status = StudentFeeStatus.partial.value
    elif student_fee.due_date and student_fee.due_date < date.today():
        student_fee.status = StudentFeeStatus.overdue.value
    else:
        student_fee.status = StudentFeeStatus.unpaid.value


def apply_payment_to_fee_items(
    student_fee_id: str,
    amount: Decimal,
    tenant_id: str,
) -> bool:
    """
    Apply payment amount across student_fee_items (FIFO by component order).
    Updates paid_amount on items and student_fee.

    Returns True if fully applied, False if amount exceeds remaining.
    """
    items = (
        StudentFeeItem.query.filter_by(
            student_fee_id=student_fee_id,
            tenant_id=tenant_id,
        )
        .order_by(StudentFeeItem.created_at)
        .all()
    )

    remaining = amount
    for item in items:
        if remaining <= 0:
            break
        item_amount = Decimal(str(item.amount or 0))
        item_paid = Decimal(str(item.paid_amount or 0))
        item_remaining = item_amount - item_paid
        if item_remaining <= 0:
            continue
        to_apply = min(remaining, item_remaining)
        item.paid_amount = item_paid + to_apply
        remaining -= to_apply

    return remaining == 0


def create_payment(
    student_fee_id: str,
    amount: str | Decimal,
    method: str,
    created_by: Optional[str] = None,
    reference_number: Optional[str] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a payment and apply it to the student fee.

    Uses transaction with FOR UPDATE lock on student_fee to prevent race conditions.
    Recalculates student_fee status after applying payment.
    Writes audit log.

    Returns:
        {'success': True, 'payment': {...}} or {'success': False, 'error': '...'}
    """
    tenant_id = get_tenant_id()
    if not tenant_id:
        return {"success": False, "error": "Tenant context is required"}

    try:
        amount_decimal = Decimal(str(amount))
        if amount_decimal <= 0:
            return {"success": False, "error": "Amount must be positive"}

        if method not in [p.value for p in PaymentMethod]:
            return {"success": False, "error": f"Invalid payment method: {method}"}

        with db.session.begin():
            # Lock student_fee row for update to prevent race condition
            student_fee = (
                db.session.query(StudentFee)
                .filter(
                    StudentFee.id == student_fee_id,
                    StudentFee.tenant_id == tenant_id,
                )
                .with_for_update()
                .first()
            )

            if not student_fee:
                raise ValueError("Student fee not found")

            total = Decimal(str(student_fee.total_amount or 0))
            paid = Decimal(str(student_fee.paid_amount or 0))
            remaining = total - paid

            if amount_decimal > remaining:
                return {"success": False, "error": f"Amount exceeds remaining balance ({remaining})"}

            # Create payment record
            payment = Payment(
                tenant_id=tenant_id,
                student_fee_id=student_fee_id,
                amount=amount_decimal,
                method=method,
                status=PaymentStatus.success.value,
                reference_number=reference_number,
                notes=notes,
                created_by=created_by,
            )
            db.session.add(payment)
            db.session.flush()

            # Apply payment to fee items
            apply_payment_to_fee_items(student_fee_id, amount_decimal, tenant_id)

            # Update student_fee paid_amount
            student_fee.paid_amount = paid + amount_decimal

            # Recalculate status
            recalculate_student_fee_status(student_fee)

            # Audit log (commit happens at end of begin block)
            log_finance_action(
                action="finance.payment.created",
                tenant_id=tenant_id,
                user_id=created_by,
                extra_data={
                    "payment_id": payment.id,
                    "student_fee_id": student_fee_id,
                    "amount": str(amount_decimal),
                    "method": method,
                },
            )

        return {"success": True, "payment": payment.to_dict()}

    except ValueError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Payment failed: {str(e)}"}


def refund_payment(
    payment_id: str,
    created_by: Optional[str] = None,
    notes: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Refund a payment: mark payment as refunded, reverse paid_amount on student_fee
    and items, recalculate status.

    Uses transaction with FOR UPDATE lock. Prevents race condition.
    """
    tenant_id = get_tenant_id()
    if not tenant_id:
        return {"success": False, "error": "Tenant context is required"}

    try:
        with db.session.begin():
            payment = (
                db.session.query(Payment)
                .filter(
                    Payment.id == payment_id,
                    Payment.tenant_id == tenant_id,
                )
                .first()
            )

            if not payment:
                return {"success": False, "error": "Payment not found"}

            if payment.status == PaymentStatus.refunded.value:
                return {"success": False, "error": "Payment already refunded"}

            if payment.status != PaymentStatus.success.value:
                return {"success": False, "error": "Can only refund successful payments"}

            # Lock student_fee
            student_fee = (
                db.session.query(StudentFee)
                .filter(
                    StudentFee.id == payment.student_fee_id,
                    StudentFee.tenant_id == tenant_id,
                )
                .with_for_update()
                .first()
            )

            if not student_fee:
                return {"success": False, "error": "Student fee not found"}

            amount = Decimal(str(payment.amount))

            # Reverse on items (reduce paid_amount proportionally - simplified: reduce from last items)
            items = (
                StudentFeeItem.query.filter_by(
                    student_fee_id=payment.student_fee_id,
                    tenant_id=tenant_id,
                )
                .order_by(StudentFeeItem.created_at.desc())
                .all()
            )

            remaining_to_reverse = amount
            for item in items:
                if remaining_to_reverse <= 0:
                    break
                item_paid = Decimal(str(item.paid_amount or 0))
                if item_paid <= 0:
                    continue
                to_reverse = min(remaining_to_reverse, item_paid)
                item.paid_amount = item_paid - to_reverse
                remaining_to_reverse -= to_reverse

            # Update student_fee paid_amount
            student_fee.paid_amount = Decimal(str(student_fee.paid_amount or 0)) - amount

            # Recalculate status
            recalculate_student_fee_status(student_fee)

            # Mark payment as refunded
            payment.status = PaymentStatus.refunded.value
            if notes:
                payment.notes = (payment.notes or "") + f"\nRefund: {notes}"

            log_finance_action(
                action="finance.payment.refunded",
                tenant_id=tenant_id,
                user_id=created_by,
                extra_data={
                    "payment_id": payment_id,
                    "student_fee_id": payment.student_fee_id,
                    "amount": str(amount),
                },
            )

        return {"success": True, "message": "Payment refunded successfully"}

    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Refund failed: {str(e)}"}

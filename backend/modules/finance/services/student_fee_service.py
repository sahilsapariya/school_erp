"""Student fee assignment and listing services."""

from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

from backend.core.database import db
from backend.core.tenant import get_tenant_id
from backend.modules.finance.models import (
    FeeStructure,
    FeeComponent,
    StudentFee,
    StudentFeeItem,
)
from backend.modules.students.models import Student
from backend.modules.finance.enums import StudentFeeStatus
from backend.modules.audit.services import log_finance_action


def list_student_fees(
    student_id: Optional[str] = None,
    fee_structure_id: Optional[str] = None,
    status: Optional[str] = None,
) -> List[Dict]:
    """List student fees with optional filters."""
    tenant_id = get_tenant_id()
    if not tenant_id:
        return []

    query = StudentFee.query.filter_by(tenant_id=tenant_id)
    if student_id:
        query = query.filter_by(student_id=student_id)
    if fee_structure_id:
        query = query.filter_by(fee_structure_id=fee_structure_id)
    if status:
        query = query.filter_by(status=status)
    query = query.order_by(StudentFee.due_date.desc())

    fees = query.all()
    result = []
    for sf in fees:
        d = sf.to_dict()
        d["items"] = [i.to_dict() for i in sf.items]
        d["student_name"] = sf.student.user.name if sf.student and sf.student.user else None
        d["admission_number"] = sf.student.admission_number if sf.student else None
        d["fee_structure_name"] = sf.fee_structure.name if sf.fee_structure else None
        result.append(d)
    return result


def get_student_fee(fee_id: str) -> Optional[Dict]:
    """Get student fee by ID with items and payments."""
    tenant_id = get_tenant_id()
    if not tenant_id:
        return None

    sf = StudentFee.query.filter_by(id=fee_id, tenant_id=tenant_id).first()
    if not sf:
        return None

    d = sf.to_dict()
    d["items"] = [i.to_dict() for i in sf.items]
    d["payments"] = [p.to_dict() for p in sf.payments]
    d["student_name"] = sf.student.user.name if sf.student and sf.student.user else None
    d["admission_number"] = sf.student.admission_number if sf.student else None
    d["fee_structure_name"] = sf.fee_structure.name if sf.fee_structure else None
    return d


def assign_student_fees_for_structure(
    fee_structure_id: str,
    student_ids: Optional[List[str]] = None,
    user_id: Optional[str] = None,
) -> Dict:
    """
    Assign fee structure to students. If student_ids is None, assigns to all
    students in the structure's class (or all if structure has no class).
    """
    tenant_id = get_tenant_id()
    if not tenant_id:
        return {"success": False, "error": "Tenant context is required"}

    fs = FeeStructure.query.filter_by(id=fee_structure_id, tenant_id=tenant_id).first()
    if not fs:
        return {"success": False, "error": "Fee structure not found"}

    # Resolve student set
    if student_ids:
        students = Student.query.filter(
            Student.id.in_(student_ids),
            Student.tenant_id == tenant_id,
        ).all()
    else:
        if fs.class_id:
            students = Student.query.filter_by(
                class_id=fs.class_id,
                tenant_id=tenant_id,
            ).all()
        else:
            students = Student.query.filter_by(tenant_id=tenant_id).all()

    created = 0
    for student in students:
        existing = StudentFee.query.filter_by(
            student_id=student.id,
            fee_structure_id=fee_structure_id,
            tenant_id=tenant_id,
        ).first()
        if existing:
            continue

        total = Decimal("0")
        sf = StudentFee(
            tenant_id=tenant_id,
            student_id=student.id,
            fee_structure_id=fee_structure_id,
            status=StudentFeeStatus.unpaid.value,
            total_amount=0,
            paid_amount=0,
            due_date=fs.due_date,
        )
        db.session.add(sf)
        db.session.flush()

        for comp in fs.components:
            total += comp.amount
            sfi = StudentFeeItem(
                tenant_id=tenant_id,
                student_fee_id=sf.id,
                fee_component_id=comp.id,
                amount=comp.amount,
                paid_amount=0,
            )
            db.session.add(sfi)

        sf.total_amount = total
        created += 1

    try:
        db.session.commit()
        log_finance_action(
            action="finance.student_fee.assigned",
            tenant_id=tenant_id,
            user_id=user_id,
            extra_data={
                "fee_structure_id": fee_structure_id,
                "created_count": created,
            },
        )
        return {"success": True, "created_count": created}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": str(e)}

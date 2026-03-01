"""
Finance API Routes

All routes require tenant_id, RBAC, and write audit logs via services.
"""

from flask import request, g

from backend.modules.finance import finance_bp
from backend.core.decorators import (
    require_permission,
    auth_required,
    tenant_required,
    require_plan_feature,
)
from backend.core.decorators.rbac import require_any_permission
from backend.shared.helpers import (
    success_response,
    error_response,
    not_found_response,
    validation_error_response,
)

# Permissions
PERM_READ = "finance.read"
PERM_COLLECT = "finance.collect"
PERM_REFUND = "finance.refund"
PERM_MANAGE = "finance.manage"

from . import services
from .services import payment_service


# ---------- Fee Structures ----------

@finance_bp.route("/structures", methods=["GET"])
@tenant_required
@auth_required
@require_plan_feature("fees_management")
@require_any_permission(PERM_READ, PERM_MANAGE)
def list_structures():
    """GET /api/finance/structures"""
    academic_year_id = request.args.get("academic_year_id")
    class_id = request.args.get("class_id")
    data = services.structure_service.list_fee_structures(
        academic_year_id=academic_year_id,
        class_id=class_id,
    )
    return success_response(data={"fee_structures": data})


@finance_bp.route("/structures", methods=["POST"])
@tenant_required
@auth_required
@require_plan_feature("fees_management")
@require_permission(PERM_MANAGE)
def create_structure():
    """POST /api/finance/structures"""
    data = request.get_json() or {}
    name = data.get("name")
    academic_year_id = data.get("academic_year_id")
    due_date = data.get("due_date")
    if not name or not academic_year_id or not due_date:
        return validation_error_response({
            "name": "Required",
            "academic_year_id": "Required",
            "due_date": "Required",
        })
    result = services.structure_service.create_fee_structure(
        academic_year_id=academic_year_id,
        name=name,
        due_date=due_date,
        class_id=data.get("class_id"),
        components=data.get("components", []),
        user_id=g.current_user.id if g.current_user else None,
    )
    if result["success"]:
        return success_response(data=result, message="Fee structure created", status_code=201)
    return error_response("FinanceError", result["error"], 400)


@finance_bp.route("/structures/<structure_id>", methods=["GET"])
@tenant_required
@auth_required
@require_plan_feature("fees_management")
@require_any_permission(PERM_READ, PERM_MANAGE)
def get_structure(structure_id):
    """GET /api/finance/structures/<id>"""
    data = services.structure_service.get_fee_structure(structure_id)
    if not data:
        return not_found_response("Fee structure")
    return success_response(data=data)


@finance_bp.route("/structures/<structure_id>", methods=["PUT"])
@tenant_required
@auth_required
@require_plan_feature("fees_management")
@require_permission(PERM_MANAGE)
def update_structure(structure_id):
    """PUT /api/finance/structures/<id>"""
    data = request.get_json() or {}
    result = services.structure_service.update_fee_structure(
        structure_id=structure_id,
        name=data.get("name"),
        due_date=data.get("due_date"),
        class_id=data.get("class_id"),
        user_id=g.current_user.id if g.current_user else None,
    )
    if result["success"]:
        return success_response(data=result)
    if "not found" in result.get("error", "").lower():
        return not_found_response("Fee structure")
    return error_response("FinanceError", result["error"], 400)


@finance_bp.route("/structures/<structure_id>", methods=["DELETE"])
@tenant_required
@auth_required
@require_plan_feature("fees_management")
@require_permission(PERM_MANAGE)
def delete_structure(structure_id):
    """DELETE /api/finance/structures/<id>"""
    result = services.structure_service.delete_fee_structure(
        structure_id=structure_id,
        user_id=g.current_user.id if g.current_user else None,
    )
    if result["success"]:
        return success_response(data=result)
    if "not found" in result.get("error", "").lower():
        return not_found_response("Fee structure")
    return error_response("FinanceError", result["error"], 400)


@finance_bp.route("/structures/<structure_id>/assign", methods=["POST"])
@tenant_required
@auth_required
@require_plan_feature("fees_management")
@require_permission(PERM_MANAGE)
def assign_structure(structure_id):
    """POST /api/finance/structures/<id>/assign - Assign fee structure to students."""
    data = request.get_json() or {}
    result = services.student_fee_service.assign_student_fees_for_structure(
        fee_structure_id=structure_id,
        student_ids=data.get("student_ids"),
        user_id=g.current_user.id if g.current_user else None,
    )
    if result["success"]:
        return success_response(data=result)
    return error_response("FinanceError", result["error"], 400)


# ---------- Student Fees ----------

@finance_bp.route("/student-fees", methods=["GET"])
@tenant_required
@auth_required
@require_plan_feature("fees_management")
@require_any_permission(PERM_READ, PERM_MANAGE, PERM_COLLECT)
def list_student_fees():
    """GET /api/finance/student-fees"""
    student_id = request.args.get("student_id")
    fee_structure_id = request.args.get("fee_structure_id")
    status = request.args.get("status")
    data = services.student_fee_service.list_student_fees(
        student_id=student_id,
        fee_structure_id=fee_structure_id,
        status=status,
    )
    return success_response(data={"student_fees": data})


@finance_bp.route("/student-fees/<fee_id>", methods=["GET"])
@tenant_required
@auth_required
@require_plan_feature("fees_management")
@require_any_permission(PERM_READ, PERM_MANAGE, PERM_COLLECT)
def get_student_fee(fee_id):
    """GET /api/finance/student-fees/<id>"""
    data = services.student_fee_service.get_student_fee(fee_id)
    if not data:
        return not_found_response("Student fee")
    return success_response(data=data)


# ---------- Payments ----------

@finance_bp.route("/payments", methods=["POST"])
@tenant_required
@auth_required
@require_plan_feature("fees_management")
@require_any_permission(PERM_COLLECT, PERM_MANAGE)
def create_payment():
    """POST /api/finance/payments"""
    data = request.get_json() or {}
    student_fee_id = data.get("student_fee_id")
    amount = data.get("amount")
    method = data.get("method", "cash")
    if not student_fee_id or not amount:
        return validation_error_response({"student_fee_id": "Required", "amount": "Required"})
    result = payment_service.create_payment(
        student_fee_id=student_fee_id,
        amount=amount,
        method=method,
        created_by=g.current_user.id if g.current_user else None,
        reference_number=data.get("reference_number"),
        notes=data.get("notes"),
    )
    if result["success"]:
        return success_response(data=result, message="Payment recorded", status_code=201)
    return error_response("PaymentError", result["error"], 400)


@finance_bp.route("/payments/<payment_id>/refund", methods=["POST"])
@tenant_required
@auth_required
@require_plan_feature("fees_management")
@require_permission(PERM_REFUND)
def refund_payment(payment_id):
    """POST /api/finance/payments/<id>/refund"""
    data = request.get_json() or {}
    result = payment_service.refund_payment(
        payment_id=payment_id,
        created_by=g.current_user.id if g.current_user else None,
        notes=data.get("notes"),
    )
    if result["success"]:
        return success_response(data=result)
    if "not found" in result.get("error", "").lower():
        return not_found_response("Payment")
    return error_response("RefundError", result["error"], 400)

"""Fee structure and component CRUD services."""

from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional

from backend.core.database import db
from backend.core.tenant import get_tenant_id
from backend.modules.academics.academic_year.models import AcademicYear
from backend.modules.finance.models import FeeStructure, FeeComponent
from backend.modules.audit.services import log_finance_action


def list_fee_structures(
    academic_year_id: Optional[str] = None,
    class_id: Optional[str] = None,
) -> List[Dict]:
    """List fee structures for current tenant."""
    tenant_id = get_tenant_id()
    if not tenant_id:
        return []

    query = FeeStructure.query.filter_by(tenant_id=tenant_id)
    if academic_year_id:
        query = query.filter_by(academic_year_id=academic_year_id)
    if class_id:
        query = query.filter_by(class_id=class_id)
    query = query.order_by(FeeStructure.due_date)
    structures = query.all()
    result = []
    for s in structures:
        d = s.to_dict()
        d["components"] = [c.to_dict() for c in s.components]
        result.append(d)
    return result


def get_fee_structure(structure_id: str) -> Optional[Dict]:
    """Get fee structure by ID with components."""
    tenant_id = get_tenant_id()
    if not tenant_id:
        return None

    s = FeeStructure.query.filter_by(id=structure_id, tenant_id=tenant_id).first()
    if not s:
        return None
    d = s.to_dict()
    d["components"] = [c.to_dict() for c in s.components]
    return d


def create_fee_structure(
    academic_year_id: str,
    name: str,
    due_date: date | str,
    class_id: Optional[str] = None,
    components: Optional[List[Dict]] = None,
    user_id: Optional[str] = None,
) -> Dict:
    """Create fee structure with components."""
    tenant_id = get_tenant_id()
    if not tenant_id:
        return {"success": False, "error": "Tenant context is required"}

    ay = AcademicYear.query.filter_by(id=academic_year_id, tenant_id=tenant_id).first()
    if not ay:
        return {"success": False, "error": "Academic year not found"}

    try:
        if isinstance(due_date, str):
            due_date = date.fromisoformat(due_date)

        fs = FeeStructure(
            tenant_id=tenant_id,
            academic_year_id=academic_year_id,
            name=name,
            class_id=class_id,
            due_date=due_date,
        )
        db.session.add(fs)
        db.session.flush()

        total = Decimal("0")
        for i, comp in enumerate(components or []):
            amount = Decimal(str(comp.get("amount", 0)))
            total += amount
            fc = FeeComponent(
                tenant_id=tenant_id,
                fee_structure_id=fs.id,
                name=comp.get("name", "Component"),
                amount=amount,
                is_optional=bool(comp.get("is_optional", False)),
                sort_order=int(comp.get("sort_order", i)),
            )
            db.session.add(fc)

        db.session.commit()

        log_finance_action(
            action="finance.fee_structure.created",
            tenant_id=tenant_id,
            user_id=user_id,
            extra_data={"fee_structure_id": fs.id, "name": name},
        )
        d = fs.to_dict()
        d["components"] = [c.to_dict() for c in fs.components]
        return {"success": True, "fee_structure": d}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": str(e)}


def update_fee_structure(
    structure_id: str,
    name: Optional[str] = None,
    due_date: Optional[date | str] = None,
    class_id: Optional[str] = None,
    user_id: Optional[str] = None,
) -> Dict:
    """Update fee structure."""
    tenant_id = get_tenant_id()
    if not tenant_id:
        return {"success": False, "error": "Tenant context is required"}

    fs = FeeStructure.query.filter_by(id=structure_id, tenant_id=tenant_id).first()
    if not fs:
        return {"success": False, "error": "Fee structure not found"}

    try:
        if name is not None:
            fs.name = name
        if due_date is not None:
            fs.due_date = date.fromisoformat(due_date) if isinstance(due_date, str) else due_date
        if class_id is not None:
            fs.class_id = class_id

        db.session.commit()
        log_finance_action(
            action="finance.fee_structure.updated",
            tenant_id=tenant_id,
            user_id=user_id,
            extra_data={"fee_structure_id": structure_id},
        )
        return {"success": True, "fee_structure": fs.to_dict()}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": str(e)}


def delete_fee_structure(structure_id: str, user_id: Optional[str] = None) -> Dict:
    """Delete fee structure (cascades to components)."""
    tenant_id = get_tenant_id()
    if not tenant_id:
        return {"success": False, "error": "Tenant context is required"}

    fs = FeeStructure.query.filter_by(id=structure_id, tenant_id=tenant_id).first()
    if not fs:
        return {"success": False, "error": "Fee structure not found"}

    try:
        db.session.delete(fs)
        db.session.commit()
        log_finance_action(
            action="finance.fee_structure.deleted",
            tenant_id=tenant_id,
            user_id=user_id,
            extra_data={"fee_structure_id": structure_id},
        )
        return {"success": True, "message": "Fee structure deleted"}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": str(e)}

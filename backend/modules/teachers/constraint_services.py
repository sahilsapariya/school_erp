"""
Teacher Constraint Services

Business logic for teacher management constraint features:
  - Subject Expertise
  - Availability Slots
  - Leave Planner
  - Workload Rules
"""

from typing import Dict, List, Optional
from datetime import datetime

from sqlalchemy.exc import IntegrityError

from backend.core.database import db
from backend.core.tenant import get_tenant_id
from .models import Teacher, TeacherSubject, TeacherAvailability, TeacherLeave, TeacherWorkloadRule
from backend.modules.subjects.models import Subject


# ---------------------------------------------------------------------------
# Teacher Subject Expertise
# ---------------------------------------------------------------------------

def get_teacher_subjects(teacher_id: str) -> List[Dict]:
    """Return all subjects linked to a teacher."""
    tenant_id = get_tenant_id()
    items = TeacherSubject.query.filter_by(teacher_id=teacher_id, tenant_id=tenant_id).all()
    return [i.to_dict() for i in items]


def add_teacher_subject(teacher_id: str, subject_id: str) -> Dict:
    """Assign a subject to a teacher (idempotent)."""
    try:
        tenant_id = get_tenant_id()

        teacher = Teacher.query.filter_by(id=teacher_id, tenant_id=tenant_id).first()
        if not teacher:
            return {"success": False, "error": "Teacher not found"}

        subject = Subject.query.filter_by(id=subject_id, tenant_id=tenant_id).first()
        if not subject:
            return {"success": False, "error": "Subject not found"}

        existing = TeacherSubject.query.filter_by(
            teacher_id=teacher_id, subject_id=subject_id, tenant_id=tenant_id
        ).first()
        if existing:
            return {"success": True, "teacher_subject": existing.to_dict()}

        ts = TeacherSubject(
            tenant_id=tenant_id,
            teacher_id=teacher_id,
            subject_id=subject_id,
        )
        ts.save()
        return {"success": True, "teacher_subject": ts.to_dict()}

    except IntegrityError:
        db.session.rollback()
        return {"success": False, "error": "Subject already assigned to teacher"}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Failed to assign subject: {str(e)}"}


def remove_teacher_subject(teacher_id: str, subject_id: str) -> Dict:
    """Remove a subject from a teacher."""
    try:
        tenant_id = get_tenant_id()
        ts = TeacherSubject.query.filter_by(
            teacher_id=teacher_id, subject_id=subject_id, tenant_id=tenant_id
        ).first()
        if not ts:
            return {"success": False, "error": "Teacher-subject link not found"}
        ts.delete()
        return {"success": True}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Failed to remove subject: {str(e)}"}


# ---------------------------------------------------------------------------
# Teacher Availability
# ---------------------------------------------------------------------------

def get_teacher_availability(teacher_id: str) -> List[Dict]:
    """Return all availability records for a teacher."""
    tenant_id = get_tenant_id()
    items = TeacherAvailability.query.filter_by(teacher_id=teacher_id, tenant_id=tenant_id).order_by(
        TeacherAvailability.day_of_week, TeacherAvailability.period_number
    ).all()
    return [i.to_dict() for i in items]


def create_availability(teacher_id: str, day_of_week: int, period_number: int, available: bool) -> Dict:
    """Create an availability record."""
    try:
        tenant_id = get_tenant_id()

        teacher = Teacher.query.filter_by(id=teacher_id, tenant_id=tenant_id).first()
        if not teacher:
            return {"success": False, "error": "Teacher not found"}

        if not 1 <= day_of_week <= 7:
            return {"success": False, "error": "day_of_week must be between 1 and 7"}
        if period_number < 1:
            return {"success": False, "error": "period_number must be >= 1"}

        slot = TeacherAvailability(
            tenant_id=tenant_id,
            teacher_id=teacher_id,
            day_of_week=day_of_week,
            period_number=period_number,
            available=available,
        )
        slot.save()
        return {"success": True, "availability": slot.to_dict()}

    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Failed to create availability: {str(e)}"}


def update_availability(availability_id: str, available: bool) -> Dict:
    """Update an availability record."""
    try:
        tenant_id = get_tenant_id()
        slot = TeacherAvailability.query.filter_by(id=availability_id, tenant_id=tenant_id).first()
        if not slot:
            return {"success": False, "error": "Availability record not found"}
        slot.available = available
        slot.save()
        return {"success": True, "availability": slot.to_dict()}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Failed to update availability: {str(e)}"}


def delete_availability(availability_id: str) -> Dict:
    """Delete an availability record."""
    try:
        tenant_id = get_tenant_id()
        slot = TeacherAvailability.query.filter_by(id=availability_id, tenant_id=tenant_id).first()
        if not slot:
            return {"success": False, "error": "Availability record not found"}
        slot.delete()
        return {"success": True}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Failed to delete availability: {str(e)}"}


# ---------------------------------------------------------------------------
# Teacher Leaves
# ---------------------------------------------------------------------------

def create_leave(teacher_id: str, start_date: str, end_date: str, leave_type: str, reason: Optional[str]) -> Dict:
    """Create a leave request."""
    try:
        tenant_id = get_tenant_id()

        teacher = Teacher.query.filter_by(id=teacher_id, tenant_id=tenant_id).first()
        if not teacher:
            return {"success": False, "error": "Teacher not found"}

        try:
            sd = datetime.strptime(start_date, "%Y-%m-%d").date()
            ed = datetime.strptime(end_date, "%Y-%m-%d").date()
        except ValueError:
            return {"success": False, "error": "Dates must be in YYYY-MM-DD format"}

        if ed < sd:
            return {"success": False, "error": "end_date must be >= start_date"}

        leave = TeacherLeave(
            tenant_id=tenant_id,
            teacher_id=teacher_id,
            start_date=sd,
            end_date=ed,
            leave_type=leave_type,
            reason=reason,
            status=TeacherLeave.STATUS_PENDING,
        )
        leave.save()
        return {"success": True, "leave": leave.to_dict()}

    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Failed to create leave: {str(e)}"}


def list_leaves(teacher_id: Optional[str] = None, status: Optional[str] = None) -> List[Dict]:
    """List leave requests. Optionally filter by teacher or status."""
    tenant_id = get_tenant_id()
    query = TeacherLeave.query.filter_by(tenant_id=tenant_id)
    if teacher_id:
        query = query.filter_by(teacher_id=teacher_id)
    if status:
        query = query.filter_by(status=status)
    query = query.order_by(TeacherLeave.created_at.desc())
    return [l.to_dict() for l in query.all()]


def approve_leave(leave_id: str) -> Dict:
    """Approve a leave request."""
    return _update_leave_status(leave_id, TeacherLeave.STATUS_APPROVED)


def reject_leave(leave_id: str) -> Dict:
    """Reject a leave request."""
    return _update_leave_status(leave_id, TeacherLeave.STATUS_REJECTED)


def cancel_leave(leave_id: str, teacher_id: str) -> Dict:
    """Cancel a pending leave request. Only the owning teacher can cancel."""
    try:
        tenant_id = get_tenant_id()
        leave = TeacherLeave.query.filter_by(id=leave_id, tenant_id=tenant_id).first()
        if not leave:
            return {"success": False, "error": "Leave request not found"}
        if leave.teacher_id != teacher_id:
            return {"success": False, "error": "You can only cancel your own leave requests"}
        if leave.status != TeacherLeave.STATUS_PENDING:
            return {"success": False, "error": "Only pending leave requests can be cancelled"}
        leave.status = "cancelled"
        leave.save()
        return {"success": True, "leave": leave.to_dict()}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Failed to cancel leave: {str(e)}"}


def _update_leave_status(leave_id: str, status: str) -> Dict:
    try:
        tenant_id = get_tenant_id()
        leave = TeacherLeave.query.filter_by(id=leave_id, tenant_id=tenant_id).first()
        if not leave:
            return {"success": False, "error": "Leave request not found"}
        leave.status = status
        leave.save()
        return {"success": True, "leave": leave.to_dict()}
    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Failed to update leave: {str(e)}"}


# ---------------------------------------------------------------------------
# Teacher Workload Rules
# ---------------------------------------------------------------------------

def get_workload_rule(teacher_id: str) -> Optional[Dict]:
    """Return workload rule for a teacher."""
    tenant_id = get_tenant_id()
    rule = TeacherWorkloadRule.query.filter_by(teacher_id=teacher_id, tenant_id=tenant_id).first()
    return rule.to_dict() if rule else None


def create_workload_rule(teacher_id: str, max_periods_per_day: int, max_periods_per_week: int) -> Dict:
    """Create workload rule for a teacher."""
    try:
        tenant_id = get_tenant_id()

        teacher = Teacher.query.filter_by(id=teacher_id, tenant_id=tenant_id).first()
        if not teacher:
            return {"success": False, "error": "Teacher not found"}

        existing = TeacherWorkloadRule.query.filter_by(teacher_id=teacher_id, tenant_id=tenant_id).first()
        if existing:
            return {"success": False, "error": "Workload rule already exists. Use PUT to update."}

        if max_periods_per_day < 1 or max_periods_per_week < 1:
            return {"success": False, "error": "Period counts must be >= 1"}

        rule = TeacherWorkloadRule(
            tenant_id=tenant_id,
            teacher_id=teacher_id,
            max_periods_per_day=max_periods_per_day,
            max_periods_per_week=max_periods_per_week,
        )
        rule.save()
        return {"success": True, "workload": rule.to_dict()}

    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Failed to create workload rule: {str(e)}"}


def update_workload_rule(teacher_id: str, max_periods_per_day: Optional[int], max_periods_per_week: Optional[int]) -> Dict:
    """Update workload rule for a teacher. Creates one if it doesn't exist."""
    try:
        tenant_id = get_tenant_id()

        teacher = Teacher.query.filter_by(id=teacher_id, tenant_id=tenant_id).first()
        if not teacher:
            return {"success": False, "error": "Teacher not found"}

        rule = TeacherWorkloadRule.query.filter_by(teacher_id=teacher_id, tenant_id=tenant_id).first()
        if not rule:
            rule = TeacherWorkloadRule(
                tenant_id=tenant_id,
                teacher_id=teacher_id,
                max_periods_per_day=max_periods_per_day or 6,
                max_periods_per_week=max_periods_per_week or 30,
            )
        else:
            if max_periods_per_day is not None:
                if max_periods_per_day < 1:
                    return {"success": False, "error": "max_periods_per_day must be >= 1"}
                rule.max_periods_per_day = max_periods_per_day
            if max_periods_per_week is not None:
                if max_periods_per_week < 1:
                    return {"success": False, "error": "max_periods_per_week must be >= 1"}
                rule.max_periods_per_week = max_periods_per_week

        rule.save()
        return {"success": True, "workload": rule.to_dict()}

    except Exception as e:
        db.session.rollback()
        return {"success": False, "error": f"Failed to update workload rule: {str(e)}"}

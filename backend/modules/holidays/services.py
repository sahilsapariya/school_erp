"""
Holiday Services

Business logic for Holiday CRUD.  Handles:
- Single-day holidays (start_date == end_date)
- Range holidays (start_date < end_date) — school vacations / breaks
- Recurring weekly-off patterns (e.g. every Sunday)
- Sunday-collision detection: warns when a public/school holiday lands on a
  day that already has a recurring weekly-off entry for that tenant.
"""

from datetime import date, datetime
from typing import Dict, List, Optional

from backend.core.database import db
from .models import Holiday, HOLIDAY_TYPES, DAY_NAMES


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(date_str: str) -> Optional[date]:
    if not date_str:
        return None
    try:
        return datetime.strptime(str(date_str).strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


def _validate_type(t: str) -> bool:
    return t in HOLIDAY_TYPES


def _get_weekly_off_days(tenant_id: str) -> List[int]:
    """Return list of recurring day-of-week values registered for this tenant."""
    rows = (
        Holiday.query
        .filter_by(is_recurring=True, tenant_id=tenant_id)
        .with_entities(Holiday.recurring_day_of_week)
        .all()
    )
    return [r.recurring_day_of_week for r in rows if r.recurring_day_of_week is not None]


def _check_sunday_collision(start_date: date, tenant_id: str) -> bool:
    """True when start_date falls on any registered weekly-off day for the tenant."""
    if not start_date:
        return False
    off_days = _get_weekly_off_days(tenant_id)
    return start_date.weekday() in off_days


# ---------------------------------------------------------------------------
# Read
# ---------------------------------------------------------------------------

def list_holidays(
    academic_year_id: Optional[str] = None,
    holiday_type: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    include_recurring: Optional[bool] = True,
    limit: int = 100,
    offset: int = 0,
) -> Dict:
    """
    Return paginated, filtered holidays for the current tenant.

    Filters:
        academic_year_id   — restrict to one academic year
        holiday_type       — one of HOLIDAY_TYPES
        start_date         — date lower bound
        end_date           — date upper bound
        search             — substring on name / description
        include_recurring  — whether to include recurring weekly-off rows (default True)
    """
    try:
        query = Holiday.query

        if not include_recurring:
            query = query.filter(Holiday.is_recurring == False)  # noqa: E712

        if academic_year_id:
            query = query.filter(Holiday.academic_year_id == academic_year_id)

        if holiday_type:
            if not _validate_type(holiday_type):
                return {
                    "success": False,
                    "error": f"Invalid holiday_type. Must be one of: {', '.join(HOLIDAY_TYPES)}",
                }
            query = query.filter(Holiday.holiday_type == holiday_type)

        if start_date:
            parsed = _parse_date(start_date)
            if not parsed:
                return {"success": False, "error": "Invalid start_date. Use YYYY-MM-DD."}
            query = query.filter(Holiday.start_date >= parsed)

        if end_date:
            parsed = _parse_date(end_date)
            if not parsed:
                return {"success": False, "error": "Invalid end_date. Use YYYY-MM-DD."}
            query = query.filter(Holiday.start_date <= parsed)

        if search:
            pat = f"%{search}%"
            query = query.filter(
                db.or_(Holiday.name.ilike(pat), Holiday.description.ilike(pat))
            )

        total = query.count()
        holidays = (
            query
            .order_by(
                Holiday.is_recurring.asc(),   # recurring rows last
                Holiday.start_date.asc().nullslast(),
            )
            .limit(limit)
            .offset(offset)
            .all()
        )
        return {
            "success": True,
            "data": [h.to_dict() for h in holidays],
            "total": total,
            "limit": limit,
            "offset": offset,
        }
    except Exception as exc:
        db.session.rollback()
        return {"success": False, "error": str(exc)}


def get_holiday(holiday_id: str) -> Dict:
    try:
        h = Holiday.query.get(holiday_id)
        if not h:
            return {"success": False, "error": "Holiday not found", "not_found": True}
        return {"success": True, "data": h.to_dict()}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def get_upcoming_holidays(limit: int = 10) -> Dict:
    """Return upcoming non-recurring holidays starting from today."""
    try:
        today = date.today()
        holidays = (
            Holiday.query
            .filter(Holiday.is_recurring == False)  # noqa: E712
            .filter(Holiday.start_date >= today)
            .order_by(Holiday.start_date.asc())
            .limit(limit)
            .all()
        )
        return {"success": True, "data": [h.to_dict() for h in holidays]}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def get_recurring_holidays() -> Dict:
    """Return all recurring weekly-off entries for the tenant."""
    try:
        holidays = (
            Holiday.query
            .filter(Holiday.is_recurring == True)  # noqa: E712
            .order_by(Holiday.recurring_day_of_week.asc())
            .all()
        )
        return {"success": True, "data": [h.to_dict() for h in holidays]}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


# ---------------------------------------------------------------------------
# Write
# ---------------------------------------------------------------------------

def create_holiday(data: dict, tenant_id: str) -> Dict:
    """
    Create a holiday (single-day, range, or recurring).

    Required for non-recurring: name, start_date
    Required for recurring:     name, recurring_day_of_week
    Optional everywhere:        description, holiday_type, academic_year_id,
                                end_date (range), is_recurring
    """
    try:
        name = (data.get("name") or "").strip()
        description = (data.get("description") or "").strip() or None
        holiday_type = (data.get("holiday_type") or "school").strip()
        academic_year_id = data.get("academic_year_id") or None
        is_recurring = bool(data.get("is_recurring", False))
        recurring_day_of_week = data.get("recurring_day_of_week")

        errors: dict = {}

        if not name:
            errors["name"] = "Name is required."
        if not _validate_type(holiday_type):
            errors["holiday_type"] = f"Must be one of: {', '.join(HOLIDAY_TYPES)}."

        if is_recurring:
            if recurring_day_of_week is None:
                errors["recurring_day_of_week"] = "Day of week is required for recurring holidays."
            else:
                try:
                    recurring_day_of_week = int(recurring_day_of_week)
                    if recurring_day_of_week not in range(7):
                        errors["recurring_day_of_week"] = "Must be 0 (Mon) – 6 (Sun)."
                except (TypeError, ValueError):
                    errors["recurring_day_of_week"] = "Must be an integer 0–6."

            start_date = None
            end_date = None
        else:
            start_date_str = data.get("start_date")
            end_date_str = data.get("end_date")

            if not start_date_str:
                errors["start_date"] = "Start date is required (YYYY-MM-DD)."
                start_date = None
                end_date = None
            else:
                start_date = _parse_date(start_date_str)
                if not start_date:
                    errors["start_date"] = "Invalid start_date format. Use YYYY-MM-DD."
                    end_date = None
                else:
                    # end_date defaults to start_date (single-day)
                    end_date = _parse_date(end_date_str) if end_date_str else start_date
                    if end_date_str and not end_date:
                        errors["end_date"] = "Invalid end_date format. Use YYYY-MM-DD."
                    elif end_date and end_date < start_date:
                        errors["end_date"] = "end_date must be on or after start_date."

            recurring_day_of_week = None

        if errors:
            return {"success": False, "error": "Validation failed", "details": errors}

        # --- Duplicate checks ---
        if is_recurring:
            dup = Holiday.query.filter_by(
                is_recurring=True, recurring_day_of_week=recurring_day_of_week
            ).first()
            if dup:
                return {
                    "success": False,
                    "error": f"A recurring holiday for {DAY_NAMES.get(recurring_day_of_week)} already exists.",
                }
        else:
            dup = Holiday.query.filter_by(
                start_date=start_date, name=name
            ).first()
            if dup:
                return {
                    "success": False,
                    "error": f"A holiday named '{name}' already exists on {start_date.isoformat()}.",
                }

        # --- Sunday collision warning ---
        falls_on_weekly_off = False
        if not is_recurring and start_date:
            falls_on_weekly_off = _check_sunday_collision(start_date, tenant_id)

        holiday = Holiday(
            name=name,
            description=description,
            holiday_type=holiday_type,
            start_date=start_date,
            end_date=end_date,
            is_recurring=is_recurring,
            recurring_day_of_week=recurring_day_of_week,
            academic_year_id=academic_year_id,
        )
        holiday.save()

        result = holiday.to_dict()
        if falls_on_weekly_off:
            result["warning"] = (
                f"This holiday falls on a regular weekly off day "
                f"({DAY_NAMES.get(start_date.weekday(), 'off day')}). "
                f"Consider adding a compensatory holiday on another date."
            )
        return {"success": True, "data": result}

    except Exception as exc:
        db.session.rollback()
        return {"success": False, "error": str(exc)}


def update_holiday(holiday_id: str, data: dict, tenant_id: str) -> Dict:
    """
    Partial update of a holiday. Only supplied fields are changed.
    """
    try:
        h = Holiday.query.get(holiday_id)
        if not h:
            return {"success": False, "error": "Holiday not found", "not_found": True}

        errors: dict = {}

        if "name" in data:
            name = (data["name"] or "").strip()
            if not name:
                errors["name"] = "Name cannot be empty."
            else:
                h.name = name

        if "description" in data:
            h.description = (data["description"] or "").strip() or None

        if "holiday_type" in data:
            ht = (data["holiday_type"] or "").strip()
            if not _validate_type(ht):
                errors["holiday_type"] = f"Must be one of: {', '.join(HOLIDAY_TYPES)}."
            else:
                h.holiday_type = ht

        if "academic_year_id" in data:
            h.academic_year_id = data["academic_year_id"] or None

        if "is_recurring" in data:
            h.is_recurring = bool(data["is_recurring"])

        if "recurring_day_of_week" in data:
            rdow = data["recurring_day_of_week"]
            if rdow is not None:
                try:
                    rdow = int(rdow)
                    if rdow not in range(7):
                        errors["recurring_day_of_week"] = "Must be 0 (Mon) – 6 (Sun)."
                    else:
                        h.recurring_day_of_week = rdow
                except (TypeError, ValueError):
                    errors["recurring_day_of_week"] = "Must be an integer 0–6."
            else:
                h.recurring_day_of_week = None

        if "start_date" in data:
            sd = _parse_date(data["start_date"])
            if not sd:
                errors["start_date"] = "Invalid start_date. Use YYYY-MM-DD."
            else:
                h.start_date = sd

        if "end_date" in data:
            ed = _parse_date(data["end_date"])
            if data["end_date"] and not ed:
                errors["end_date"] = "Invalid end_date. Use YYYY-MM-DD."
            else:
                h.end_date = ed

        # Cross-field: end_date >= start_date
        if h.start_date and h.end_date and h.end_date < h.start_date:
            errors["end_date"] = "end_date must be on or after start_date."

        if errors:
            return {"success": False, "error": "Validation failed", "details": errors}

        # Uniqueness check
        if not h.is_recurring:
            conflict = Holiday.query.filter(
                Holiday.start_date == h.start_date,
                Holiday.name == h.name,
                Holiday.id != holiday_id,
            ).first()
            if conflict:
                return {
                    "success": False,
                    "error": f"Another holiday named '{h.name}' already exists on {h.start_date.isoformat()}.",
                }

        # Sunday collision
        falls_on_weekly_off = False
        if not h.is_recurring and h.start_date:
            falls_on_weekly_off = _check_sunday_collision(h.start_date, tenant_id)

        h.save()
        result = h.to_dict()
        if falls_on_weekly_off:
            result["warning"] = (
                f"This holiday falls on a regular weekly off day "
                f"({DAY_NAMES.get(h.start_date.weekday(), 'off day')}). "
                f"Consider adding a compensatory holiday on another date."
            )
        return {"success": True, "data": result}

    except Exception as exc:
        db.session.rollback()
        return {"success": False, "error": str(exc)}


def delete_holiday(holiday_id: str) -> Dict:
    try:
        h = Holiday.query.get(holiday_id)
        if not h:
            return {"success": False, "error": "Holiday not found", "not_found": True}
        name = h.name
        h.delete()
        return {"success": True, "message": f"Holiday '{name}' deleted."}
    except Exception as exc:
        db.session.rollback()
        return {"success": False, "error": str(exc)}

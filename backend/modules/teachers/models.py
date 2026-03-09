from backend.core.database import db
from backend.core.models import TenantBaseModel
from datetime import datetime
import uuid


class Teacher(TenantBaseModel):
    """
    Teacher Model

    Extends the User model with teacher-specific professional data.
    Linked to a User account for authentication. Scoped by tenant.
    """
    __tablename__ = "teachers"
    __table_args__ = (
        db.UniqueConstraint("employee_id", "tenant_id", name="uq_teachers_employee_id_tenant"),
        db.UniqueConstraint("user_id", "tenant_id", name="uq_teachers_user_id_tenant"),
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

    # Link to Auth User (One-to-One)
    user_id = db.Column(db.String(36), db.ForeignKey("users.id"), nullable=False)

    # Professional Info
    employee_id = db.Column(db.String(20), nullable=False, index=True)
    designation = db.Column(db.String(100), nullable=True)        # e.g. "Senior Teacher", "HOD"
    department = db.Column(db.String(100), nullable=True)         # e.g. "Mathematics", "Science"
    qualification = db.Column(db.String(200), nullable=True)      # e.g. "M.Ed", "Ph.D"
    specialization = db.Column(db.String(200), nullable=True)     # e.g. "Algebra", "Organic Chemistry"
    experience_years = db.Column(db.Integer, nullable=True)

    # Personal Info
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    date_of_joining = db.Column(db.Date, nullable=True)

    # Status
    status = db.Column(db.String(20), nullable=False, default='active')  # active / inactive

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = db.relationship('User', backref=db.backref('teacher_profile', uselist=False))

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def to_dict(self, include_subjects: bool = False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.user.name if self.user else None,
            "email": self.user.email if self.user else None,
            "profile_picture": self.user.profile_picture_url if self.user else None,
            "employee_id": self.employee_id,
            "designation": self.designation,
            "department": self.department,
            "qualification": self.qualification,
            "specialization": self.specialization,
            "experience_years": self.experience_years,
            "phone": self.phone,
            "address": self.address,
            "date_of_joining": self.date_of_joining.isoformat() if self.date_of_joining else None,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }
        if include_subjects:
            data["subjects"] = [
                {"id": ts.subject_id, "name": ts.subject.name, "code": ts.subject.code}
                for ts in self.subject_expertise
                if ts.subject
            ]
        return data

    def __repr__(self):
        return f"<Teacher {self.employee_id}>"


class TeacherSubject(TenantBaseModel):
    """
    Teacher Subject Expertise.

    Tracks which subjects a teacher is qualified/expert to teach.
    Used by the timetable generator as a constraint.
    """
    __tablename__ = "teacher_subjects"
    __table_args__ = (
        db.UniqueConstraint("teacher_id", "subject_id", "tenant_id", name="uq_teacher_subject_tenant"),
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = db.Column(db.String(36), db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = db.Column(db.String(36), db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    teacher = db.relationship("Teacher", backref=db.backref("subject_expertise", lazy=True, passive_deletes=True))
    subject = db.relationship("Subject", backref=db.backref("assigned_teachers", lazy=True))

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def to_dict(self):
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "subject_id": self.subject_id,
            "subject_name": self.subject.name if self.subject else None,
            "subject_code": self.subject.code if self.subject else None,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<TeacherSubject teacher={self.teacher_id} subject={self.subject_id}>"


class TeacherAvailability(TenantBaseModel):
    """
    Teacher Availability / Unavailability Slots.

    Records periods when a teacher is NOT available (or explicitly available).
    If no record exists for a (teacher, day, period) → teacher is available.
    day_of_week: 1=Monday … 7=Sunday.
    """
    __tablename__ = "teacher_availability"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = db.Column(db.String(36), db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = db.Column(db.Integer, nullable=False)
    period_number = db.Column(db.Integer, nullable=False)
    available = db.Column(db.Boolean, nullable=False, default=True)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    teacher = db.relationship("Teacher", backref=db.backref("availability_slots", lazy=True, passive_deletes=True))

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def to_dict(self):
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "day_of_week": self.day_of_week,
            "period_number": self.period_number,
            "available": self.available,
            "created_at": self.created_at.isoformat(),
        }

    def __repr__(self):
        return f"<TeacherAvailability teacher={self.teacher_id} day={self.day_of_week} period={self.period_number}>"


class TeacherLeave(TenantBaseModel):
    """
    Teacher Leave Requests.

    Teachers submit leave requests; admins approve or reject.
    Used by the timetable generator to mark teacher as unavailable on leave dates.
    """
    __tablename__ = "teacher_leaves"

    STATUS_PENDING = "pending"
    STATUS_APPROVED = "approved"
    STATUS_REJECTED = "rejected"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = db.Column(db.String(36), db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    leave_type = db.Column(db.String(50), nullable=False, default="casual")
    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="pending")

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    teacher = db.relationship("Teacher", backref=db.backref("leaves", lazy=True, passive_deletes=True))

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def to_dict(self):
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "teacher_name": self.teacher.user.name if self.teacher and self.teacher.user else None,
            "teacher_employee_id": self.teacher.employee_id if self.teacher else None,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "leave_type": self.leave_type,
            "reason": self.reason,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f"<TeacherLeave teacher={self.teacher_id} {self.start_date}→{self.end_date} {self.status}>"


class TeacherWorkloadRule(TenantBaseModel):
    """
    Teacher Workload Rules.

    Defines max periods per day and per week for a specific teacher.
    Used by the timetable generator to avoid over-scheduling.
    """
    __tablename__ = "teacher_workload_rules"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    teacher_id = db.Column(db.String(36), db.ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    max_periods_per_day = db.Column(db.Integer, nullable=False, default=6)
    max_periods_per_week = db.Column(db.Integer, nullable=False, default=30)

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    teacher = db.relationship("Teacher", backref=db.backref("workload_rule", uselist=False, lazy=True, passive_deletes=True))

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def to_dict(self):
        return {
            "id": self.id,
            "teacher_id": self.teacher_id,
            "max_periods_per_day": self.max_periods_per_day,
            "max_periods_per_week": self.max_periods_per_week,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }

    def __repr__(self):
        return f"<TeacherWorkloadRule teacher={self.teacher_id}>"

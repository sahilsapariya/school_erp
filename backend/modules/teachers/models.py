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

    def to_dict(self):
        return {
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

    def __repr__(self):
        return f"<Teacher {self.employee_id}>"

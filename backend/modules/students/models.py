from backend.core.database import db
from datetime import datetime
import uuid

class Student(db.Model):
    """
    Student Model
    
    Extends the User model with student-specific data.
    Linked to a Class.
    """
    __tablename__ = "students"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Link to Auth User (One-to-One)
    # The User record handles email, password, name, profile pic
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), unique=True, nullable=False)
    
    # Academic Info
    admission_number = db.Column(db.String(20), unique=True, nullable=False, index=True)
    roll_number = db.Column(db.Integer, nullable=True)
    academic_year = db.Column(db.String(20), nullable=True)  # e.g. "2025-2026"
    
    # Current Class Assignment
    class_id = db.Column(db.String(36), db.ForeignKey('classes.id'), nullable=True)
    
    # Personal Info
    date_of_birth = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(10), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    address = db.Column(db.Text, nullable=True)
    
    # Guardian Info
    guardian_name = db.Column(db.String(100), nullable=True)
    guardian_relationship = db.Column(db.String(50), nullable=True)
    guardian_phone = db.Column(db.String(20), nullable=True)
    guardian_email = db.Column(db.String(120), nullable=True)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    # Access user fields via student.user.email etc.
    user = db.relationship('User', backref=db.backref('student_profile', uselist=False))
    
    # Access class info via student.current_class.name
    current_class = db.relationship('Class', backref=db.backref('students', lazy=True))

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
            "admission_number": self.admission_number,
            "roll_number": self.roll_number,
            "academic_year": self.academic_year,
            "class_id": self.class_id,
            "class_name": f"{self.current_class.name}-{self.current_class.section}" if self.current_class else None,
            "date_of_birth": self.date_of_birth.isoformat() if self.date_of_birth else None,
            "gender": self.gender,
            "phone": self.phone,
            "address": self.address,
            "guardian_name": self.guardian_name,
            "guardian_relationship": self.guardian_relationship,
            "guardian_phone": self.guardian_phone,
            "guardian_email": self.guardian_email,
            "created_at": self.created_at.isoformat()
        }

    def __repr__(self):
        return f"<Student {self.admission_number}>"

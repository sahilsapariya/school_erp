from backend.core.database import db
from datetime import datetime
import uuid

class Class(db.Model):
    """
    Class/Section Model
    
    Represents a specific class division (e.g., Grade 10-A) for an academic year.
    Students are assigned to a Class.
    A Teacher is assigned as the class teacher.
    """
    __tablename__ = "classes"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(50), nullable=False) # e.g. "Grade 10"
    section = db.Column(db.String(10), nullable=False) # e.g. "A"
    academic_year = db.Column(db.String(20), nullable=False) # e.g. "2025-2026"
    
    # Class Teacher (User with Teacher role)
    teacher_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('name', 'section', 'academic_year', name='uq_class_section_year'),
    )
    
    # Relationships
    teacher = db.relationship('User', foreign_keys=[teacher_id], backref=db.backref('assigned_classes', lazy=True))

    def save(self):
        db.session.add(self)
        db.session.commit()
        
    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "section": self.section,
            "academic_year": self.academic_year,
            "teacher_id": self.teacher_id,
            "teacher_name": self.teacher.name if self.teacher else None,
            "created_at": self.created_at.isoformat()
        }

    def __repr__(self):
        return f"<Class {self.name}-{self.section} ({self.academic_year})>"

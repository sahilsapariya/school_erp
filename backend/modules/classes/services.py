from typing import List, Dict, Optional
from sqlalchemy.exc import IntegrityError
from datetime import datetime

from backend.core.database import db
from .models import Class, ClassTeacher


def create_class(name: str, section: str, academic_year: str, teacher_id: str = None,
                 start_date: str = None, end_date: str = None) -> Dict:
    """Create a new class"""
    try:
        new_class = Class(
            name=name,
            section=section,
            academic_year=academic_year,
            teacher_id=teacher_id,
            start_date=datetime.strptime(start_date, '%Y-%m-%d').date() if start_date else None,
            end_date=datetime.strptime(end_date, '%Y-%m-%d').date() if end_date else None,
        )
        new_class.save()

        return {
            'success': True,
            'class': new_class.to_dict()
        }
    except IntegrityError:
        db.session.rollback()
        return {
            'success': False,
            'error': 'Class with this name, section and academic year already exists'
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


def get_all_classes(academic_year: str = None) -> List[Dict]:
    """Get all classes, optionally filtered by academic year"""
    query = Class.query
    if academic_year:
        query = query.filter_by(academic_year=academic_year)

    classes = query.order_by(Class.name, Class.section).all()

    result = []
    for c in classes:
        from backend.modules.students.models import Student
        student_count = Student.query.filter_by(class_id=c.id).count()
        teacher_count = ClassTeacher.query.filter_by(class_id=c.id).count()
        data = c.to_dict()
        data['student_count'] = student_count
        data['teacher_count'] = teacher_count
        result.append(data)

    return result


def get_class_by_id(class_id: str) -> Optional[Dict]:
    """Get class details by ID"""
    cls = Class.query.get(class_id)
    return cls.to_dict() if cls else None


def get_class_detail(class_id: str) -> Optional[Dict]:
    """Get class details with students and assigned teachers."""
    cls = Class.query.get(class_id)
    if not cls:
        return None

    from backend.modules.students.models import Student

    # Get students in this class
    students = Student.query.filter_by(class_id=class_id).all()
    students_data = [s.to_dict() for s in students]

    # Get assigned teachers via ClassTeacher junction
    class_teachers = ClassTeacher.query.filter_by(class_id=class_id).all()
    teachers_data = [ct.to_dict() for ct in class_teachers]

    data = cls.to_dict()
    data['students'] = students_data
    data['teachers'] = teachers_data
    data['student_count'] = len(students_data)
    data['teacher_count'] = len(teachers_data)

    return data


def update_class(
    class_id: str,
    name: str = None,
    section: str = None,
    academic_year: str = None,
    teacher_id: str = None,
    start_date: str = None,
    end_date: str = None
) -> Dict:
    """Update class details"""
    try:
        cls = Class.query.get(class_id)
        if not cls:
            return {'success': False, 'error': 'Class not found'}

        if name:
            cls.name = name
        if section:
            cls.section = section
        if academic_year:
            cls.academic_year = academic_year
        if teacher_id is not None:
            cls.teacher_id = teacher_id
        if start_date is not None:
            cls.start_date = datetime.strptime(start_date, '%Y-%m-%d').date() if start_date else None
        if end_date is not None:
            cls.end_date = datetime.strptime(end_date, '%Y-%m-%d').date() if end_date else None

        cls.save()
        return {'success': True, 'class': cls.to_dict()}
    except IntegrityError:
        db.session.rollback()
        return {'success': False, 'error': 'Update failed: Duplicate class entry'}
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e)}


def delete_class(class_id: str) -> Dict:
    """Delete a class"""
    try:
        cls = Class.query.get(class_id)
        if not cls:
            return {'success': False, 'error': 'Class not found'}

        db.session.delete(cls)
        db.session.commit()
        return {'success': True, 'message': 'Class deleted'}
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e)}


# ── Assignment Management ─────────────────────────────────────

def assign_student_to_class(class_id: str, student_id: str) -> Dict:
    """Assign a student to a class."""
    try:
        cls = Class.query.get(class_id)
        if not cls:
            return {'success': False, 'error': 'Class not found'}

        from backend.modules.students.models import Student
        student = Student.query.get(student_id)
        if not student:
            return {'success': False, 'error': 'Student not found'}

        student.class_id = class_id
        student.save()
        return {'success': True, 'message': 'Student assigned to class'}
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e)}


def remove_student_from_class(class_id: str, student_id: str) -> Dict:
    """Remove a student from a class."""
    try:
        from backend.modules.students.models import Student
        student = Student.query.get(student_id)
        if not student:
            return {'success': False, 'error': 'Student not found'}
        if student.class_id != class_id:
            return {'success': False, 'error': 'Student is not in this class'}

        student.class_id = None
        student.save()
        return {'success': True, 'message': 'Student removed from class'}
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e)}


def assign_teacher_to_class(class_id: str, teacher_id: str, subject: str = None, is_class_teacher: bool = False) -> Dict:
    """Assign a teacher to a class."""
    try:
        cls = Class.query.get(class_id)
        if not cls:
            return {'success': False, 'error': 'Class not found'}

        from backend.modules.teachers.models import Teacher
        teacher = Teacher.query.get(teacher_id)
        if not teacher:
            return {'success': False, 'error': 'Teacher not found'}

        # Check if already assigned
        existing = ClassTeacher.query.filter_by(class_id=class_id, teacher_id=teacher_id).first()
        if existing:
            return {'success': False, 'error': 'Teacher already assigned to this class'}

        ct = ClassTeacher(
            class_id=class_id,
            teacher_id=teacher_id,
            subject=subject,
            is_class_teacher=is_class_teacher,
        )
        ct.save()
        return {'success': True, 'assignment': ct.to_dict(), 'message': 'Teacher assigned to class'}
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e)}


def remove_teacher_from_class(class_id: str, teacher_id: str) -> Dict:
    """Remove a teacher from a class."""
    try:
        ct = ClassTeacher.query.filter_by(class_id=class_id, teacher_id=teacher_id).first()
        if not ct:
            return {'success': False, 'error': 'Teacher is not assigned to this class'}

        db.session.delete(ct)
        db.session.commit()
        return {'success': True, 'message': 'Teacher removed from class'}
    except Exception as e:
        db.session.rollback()
        return {'success': False, 'error': str(e)}


def get_unassigned_students(class_id: str) -> List[Dict]:
    """Get students not assigned to any class (for assignment picker)."""
    from backend.modules.students.models import Student
    students = Student.query.filter(
        db.or_(Student.class_id == None, Student.class_id == '')
    ).all()
    return [s.to_dict() for s in students]


def get_unassigned_teachers(class_id: str) -> List[Dict]:
    """Get teachers not yet assigned to this class."""
    from backend.modules.teachers.models import Teacher
    assigned_ids = [ct.teacher_id for ct in ClassTeacher.query.filter_by(class_id=class_id).all()]
    query = Teacher.query.filter(Teacher.status == 'active')
    if assigned_ids:
        query = query.filter(~Teacher.id.in_(assigned_ids))
    return [t.to_dict() for t in query.all()]

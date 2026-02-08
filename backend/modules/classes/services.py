from typing import List, Dict, Optional
from sqlalchemy.exc import IntegrityError

from backend.core.database import db
from .models import Class

def create_class(name: str, section: str, academic_year: str, teacher_id: str = None) -> Dict:
    """Create a new class"""
    try:
        new_class = Class(
            name=name,
            section=section,
            academic_year=academic_year,
            teacher_id=teacher_id
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
    
    # Sort by name and section
    classes = query.order_by(Class.name, Class.section).all()
    return [c.to_dict() for c in classes]

def get_class_by_id(class_id: str) -> Optional[Dict]:
    """Get class details by ID"""
    cls = Class.query.get(class_id)
    return cls.to_dict() if cls else None

def update_class(
    class_id: str,
    name: str = None,
    section: str = None,
    academic_year: str = None,
    teacher_id: str = None
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

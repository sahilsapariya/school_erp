from flask import request
from backend.modules.classes import classes_bp
from backend.core.decorators import require_permission
from backend.shared.helpers import (
    success_response,
    error_response,
    not_found_response,
    validation_error_response
)
from . import services

# Permissions
PERM_READ = 'class.read'
PERM_CREATE = 'class.create'
PERM_UPDATE = 'class.update'
PERM_DELETE = 'class.delete'

@classes_bp.route('/', methods=['GET'])
@require_permission(PERM_READ)
def get_classes():
    """List all classes"""
    academic_year = request.args.get('academic_year')
    classes = services.get_all_classes(academic_year)
    return success_response(data=classes)

@classes_bp.route('/', methods=['POST'])
@require_permission(PERM_CREATE)
def create_class():
    """Create a new class"""
    data = request.get_json()
    
    if not all(k in data for k in ('name', 'section', 'academic_year')):
        return validation_error_response({'message': 'Missing required fields'})
        
    result = services.create_class(
        name=data['name'],
        section=data['section'],
        academic_year=data['academic_year'],
        teacher_id=data.get('teacher_id')
    )
    
    if result['success']:
        return success_response(data=result['class'], message='Class created successfully', status_code=201)
    return error_response('CreationError', result['error'], 400)

@classes_bp.route('/<class_id>', methods=['GET'])
@require_permission(PERM_READ)
def get_class(class_id):
    """Get class details"""
    cls = services.get_class_by_id(class_id)
    if cls:
        return success_response(data=cls)
    return not_found_response('Class')

@classes_bp.route('/<class_id>', methods=['PUT'])
@require_permission(PERM_UPDATE)
def update_class(class_id):
    """Update class details"""
    data = request.get_json()
    result = services.update_class(
        class_id,
        name=data.get('name'),
        section=data.get('section'),
        academic_year=data.get('academic_year'),
        teacher_id=data.get('teacher_id')
    )
    
    if result['success']:
        return success_response(data=result['class'], message='Class updated successfully')
    return error_response('UpdateError', result['error'], 400)

@classes_bp.route('/<class_id>', methods=['DELETE'])
@require_permission(PERM_DELETE)
def delete_class(class_id):
    """Delete a class"""
    result = services.delete_class(class_id)
    if result['success']:
        return success_response(message='Class deleted successfully')
    return error_response('DeletionError', result['error'], 400)

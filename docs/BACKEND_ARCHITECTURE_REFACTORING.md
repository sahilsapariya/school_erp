# Backend Architecture Refactoring Summary

## Overview

The Flask School ERP backend has been refactored into a **production-grade modular architecture** following ERP-style design patterns. This document summarizes all architectural changes, new structure, and implementation details.

---

## 🎯 Key Achievements

✅ **Clean Modular Architecture** - ERP-style module separation  
✅ **Application Factory Pattern** - Production-ready Flask app initialization  
✅ **Centralized Configuration** - Class-based config management  
✅ **RBAC Philosophy Preserved** - Authorization via permissions only  
✅ **Scalable Structure** - Easy to add new modules  
✅ **Production-Ready** - Error handling, logging, health checks  

---

## 📁 New Folder Structure

```
backend/
├── __init__.py                 # Package initialization
├── app.py                      # Application factory
│
├── config/                     # Configuration Management
│   ├── __init__.py
│   ├── settings.py            # Config classes (Dev/Prod)
│   └── constants.py           # Application constants
│
├── core/                       # Core Infrastructure
│   ├── __init__.py
│   ├── database.py            # Database instance & utilities
│   ├── extensions.py          # Flask extensions (CORS, Mail)
│   └── decorators/            # Auth & Authorization
│       ├── __init__.py
│       ├── auth.py            # @auth_required
│       └── rbac.py            # @require_permission
│
├── modules/                    # Business Modules
│   ├── __init__.py
│   │
│   ├── auth/                  # Authentication Module
│   │   ├── __init__.py        # Blueprint registration
│   │   ├── models.py          # User, Session models
│   │   ├── routes.py          # Auth endpoints
│   │   └── services.py        # JWT, auth logic
│   │
│   ├── rbac/                  # RBAC Module
│   │   ├── __init__.py        # Blueprint registration
│   │   ├── models.py          # Role, Permission models
│   │   ├── routes.py          # RBAC endpoints
│   │   └── services.py        # Authorization logic
│   │
│   ├── users/                 # User Management Module
│   │   ├── __init__.py        # Blueprint registration
│   │   ├── routes.py          # User CRUD endpoints
│   │   └── services.py        # User management logic
│   │
│   └── mailer/                # Email Service Module
│       ├── __init__.py
│       ├── service.py         # Email sending logic
│       └── templates/         # Email templates
│
├── shared/                     # Shared Utilities
│   ├── __init__.py
│   ├── utils.py               # Utility functions
│   └── helpers.py             # Response helpers
│
└── scripts/                    # Administrative Scripts
    ├── __init__.py
    ├── seed_rbac.py           # Seed roles & permissions
    ├── create_admin.py        # Create admin user
    └── rbac_helpers.py        # Helper functions
```

---

## 🏗️ Architecture Components

### 1. Configuration Management (`backend/config/`)

**Purpose**: Centralized configuration with environment-specific settings.

**Files**:
- `settings.py` - Class-based config (DevelopmentConfig, ProductionConfig)
- `constants.py` - Application-wide constants
- `__init__.py` - Config factory function

**Key Features**:
- Environment-based configuration
- Type-safe settings
- Production validation
- URL generation helpers

**Example Usage**:
```python
from backend.config import get_config

config = get_config('production')
app.config.from_object(config)
```

---

### 2. Core Infrastructure (`backend/core/`)

**Purpose**: Foundational components used across all modules.

#### Database (`core/database.py`)
- SQLAlchemy instance
- Database initialization
- Helper functions

```python
from backend.core.database import db

# In models
class MyModel(db.Model):
    pass
```

#### Extensions (`core/extensions.py`)
- CORS configuration
- Flask-Mail setup
- Centralized extension initialization

#### Decorators (`core/decorators/`)

**Authentication Decorator** (`auth.py`):
```python
from backend.core.decorators import auth_required

@bp.route('/protected')
@auth_required
def protected_route():
    # g.current_user is available
    return jsonify({'user_id': g.current_user.id})
```

**RBAC Decorators** (`rbac.py`):
```python
from backend.core.decorators import require_permission

@bp.route('/students', methods=['POST'])
@auth_required
@require_permission('student.create')
def create_student():
    # User has been authenticated and authorized
    return jsonify({'message': 'Student created'})
```

**Advanced RBAC**:
```python
from backend.core.decorators import require_any_permission, require_all_permissions

# Requires ANY of the listed permissions
@require_any_permission('attendance.read.self', 'attendance.read.class', 'attendance.manage')
def view_attendance():
    pass

# Requires ALL of the listed permissions
@require_all_permissions('user.manage', 'role.manage')
def sensitive_operation():
    pass
```

---

### 3. Business Modules (`backend/modules/`)

Each module follows a consistent structure:
```
module_name/
├── __init__.py        # Blueprint creation
├── models.py          # Database models
├── routes.py          # API endpoints
└── services.py        # Business logic
```

#### Auth Module (`modules/auth/`)

**Responsibility**: User authentication, sessions, JWT tokens

**Models**:
- `User` - User account with authentication
- `Session` - User sessions with refresh tokens

**Services**:
- JWT token generation/validation
- Session management
- Login/logout logic
- Password reset

**Routes** (`/api/auth`):
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `GET /email/validate` - Email verification
- `POST /password/forgot` - Request password reset
- `POST /password/reset` - Reset password
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

**Example**:
```python
from backend.modules.auth.services import authenticate_user, generate_access_token

user = authenticate_user(email, password)
if user:
    token = generate_access_token(user)
```

#### RBAC Module (`modules/rbac/`)

**Responsibility**: Role & permission management, authorization logic

**Models**:
- `Role` - User roles
- `Permission` - Granular permissions
- `RolePermission` - Role-permission mapping
- `UserRole` - User-role mapping

**Services**:
- Authorization logic (`has_permission()`)
- Permission CRUD
- Role CRUD
- Assignment management

**Routes** (`/api/rbac`):
- `POST/GET/PUT/DELETE /permissions` - Permission management
- `POST/GET/PUT/DELETE /roles` - Role management
- `POST /roles/<id>/permissions` - Assign permission to role
- `POST /users/<id>/roles` - Assign role to user
- `GET /users/<id>/permissions` - Get user permissions

**RBAC Philosophy**:
```
✅ Authorization via permissions only
✅ Role names never used in business logic
✅ Permission naming: resource.action.scope
✅ 'manage' permission implies all actions
```

**Example**:
```python
from backend.modules.rbac.services import has_permission

if has_permission(user_id, 'student.create'):
    # User can create students
    pass
```

#### Users Module (`modules/users/`)

**Responsibility**: User administration and CRUD operations

**Routes** (`/api/users`):
- `GET /users` - List users (with search/filters)
- `GET /users/<id>` - Get user details
- `PUT /users/<id>` - Update user
- `DELETE /users/<id>` - Delete user
- `POST /users/<id>/verify-email` - Verify email (admin)

**Example**:
```python
from backend.modules.users.services import list_users

result = list_users(search='john', page=1, per_page=20)
users = result['items']
```

#### Mailer Module (`modules/mailer/`)

**Responsibility**: Email service with templates

**Functions**:
```python
from backend.modules.mailer import send_template_email

send_template_email(
    to_email='user@example.com',
    template_name='email_verification.html',
    context={'verify_url': url},
    subject='Verify your email'
)
```

---

### 4. Shared Utilities (`backend/shared/`)

**Purpose**: Common utilities used across modules

#### Utilities (`utils.py`)
```python
from backend.shared.utils import paginate_query, generate_uuid

# Paginate query
result = paginate_query(query, page=1, per_page=20)
```

#### Response Helpers (`helpers.py`)
```python
from backend.shared.helpers import success_response, error_response

# Standardized responses
return success_response(data={'user': user}, message='Success', status_code=200)
return error_response('ValidationError', 'Email required', 400)
```

---

### 5. Administrative Scripts (`backend/scripts/`)

#### Seed RBAC (`seed_rbac.py`)
Seeds database with default roles and permissions.

```bash
python -m backend.scripts.seed_rbac
```

Defines:
- **Permissions**: 40+ granular permissions
- **Roles**: Admin, Teacher, Student, Parent
- **Assignments**: Automatic role-permission mapping

#### Create Admin (`create_admin.py`)
Interactive script to create admin user.

```bash
python -m backend.scripts.create_admin
```

#### RBAC Helpers (`rbac_helpers.py`)
Helper functions for Flask shell.

```python
from backend.scripts.rbac_helpers import *

assign_admin_role('admin@school.com')
show_user_permissions('user@school.com')
show_all_roles()
```

---

## 🚀 Application Factory Pattern

### Main Application (`backend/app.py`)

**Features**:
- Application factory function
- Blueprint registration
- Error handlers
- Health check endpoints
- CORS configuration

**Usage**:
```python
from backend.app import create_app

# Create app with specific config
app = create_app('production')

# Or use default (reads from FLASK_ENV)
app = create_app()
```

**Blueprint Registration**:
```python
def register_blueprints(app: Flask):
    from backend.modules.auth import auth_bp
    from backend.modules.rbac import rbac_bp
    from backend.modules.users import users_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(rbac_bp, url_prefix='/api/rbac')
    app.register_blueprint(users_bp, url_prefix='/api/users')
```

**Running**:
```bash
# Development
python backend/app.py

# Production with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 backend.app:app
```

---

## 📋 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login user | No |
| POST | `/logout` | Logout user | No |
| GET | `/email/validate` | Verify email | No |
| POST | `/password/forgot` | Request password reset | No |
| POST | `/password/reset` | Reset password | No |
| GET | `/profile` | Get current user profile | Yes |
| PUT | `/profile` | Update profile | Yes |

### RBAC Management (`/api/rbac`)
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| POST | `/permissions` | Create permission | `permission.manage` |
| GET | `/permissions` | List permissions | `permission.read` |
| POST | `/roles` | Create role | `role.manage` |
| GET | `/roles` | List roles | `role.read` |
| POST | `/roles/<id>/permissions` | Assign permission | `role.manage` |
| POST | `/users/<id>/roles` | Assign role | `user.manage` |
| GET | `/users/<id>/permissions` | Get user permissions | `user.read` |

### User Management (`/api/users`)
| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/users` | List users | `user.read` |
| GET | `/users/<id>` | Get user details | `user.read` |
| PUT | `/users/<id>` | Update user | `user.manage` |
| DELETE | `/users/<id>` | Delete user | `user.manage` |
| POST | `/users/<id>/verify-email` | Verify email | `user.manage` |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api` | API info |

---

## 🔐 RBAC Implementation

### Permission Naming Convention
```
resource.action.scope

Examples:
- student.create
- student.read.self
- student.read.class
- attendance.mark
- attendance.manage
```

### Hierarchical Permissions
The `manage` permission implies all actions:
```python
# User has 'student.manage'
has_permission(user_id, 'student.create')   # True
has_permission(user_id, 'student.read')     # True
has_permission(user_id, 'student.update')   # True
has_permission(user_id, 'student.delete')   # True
```

### Usage in Routes
```python
from backend.core.decorators import auth_required, require_permission

@bp.route('/students', methods=['POST'])
@auth_required
@require_permission('student.create')
def create_student():
    # Business logic here
    return jsonify({'message': 'Student created'})
```

### Checking Permissions in Code
```python
from backend.modules.rbac.services import has_permission

if has_permission(user_id, 'student.create'):
    # User is authorized
    pass
```

---

## 🔄 Service-Route Interaction

### Pattern
1. **Route** receives request
2. **Route** calls **Service** function
3. **Service** contains business logic
4. **Service** returns result dict
5. **Route** formats response

### Example

**Service** (`services.py`):
```python
def create_student(data: Dict) -> Dict:
    """Business logic for creating student"""
    try:
        student = Student(**data)
        student.save()
        return {
            'success': True,
            'student': serialize_student(student)
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }
```

**Route** (`routes.py`):
```python
from backend.shared.helpers import success_response, error_response
from .services import create_student

@bp.route('/students', methods=['POST'])
@auth_required
@require_permission('student.create')
def create_student_route():
    data = request.get_json()
    
    result = create_student(data)
    
    if result['success']:
        return success_response(
            data=result['student'],
            message='Student created',
            status_code=201
        )
    else:
        return error_response(
            error='CreationError',
            message=result['error'],
            status_code=400
        )
```

---

## 🛠️ Development Workflow

### 1. Initial Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your settings

# Initialize database
python -c "from backend.app import create_app; app = create_app(); app.app_context().push(); from backend.core.database import db; db.create_all()"

# Seed RBAC system
python -m backend.scripts.seed_rbac

# Create admin user
python -m backend.scripts.create_admin
```

### 2. Running the Server

```bash
# Development
python backend/app.py

# Or use Flask CLI
export FLASK_APP=backend.app:app
flask run --host=0.0.0.0 --port=5001

# Production with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 backend.app:app
```

### 3. Adding a New Module

```bash
# 1. Create module directory
mkdir -p backend/modules/students

# 2. Create files
touch backend/modules/students/__init__.py
touch backend/modules/students/models.py
touch backend/modules/students/routes.py
touch backend/modules/students/services.py
```

**`__init__.py`**:
```python
from flask import Blueprint

students_bp = Blueprint('students', __name__)

from . import routes

__all__ = ['students_bp']
```

**`models.py`**:
```python
from backend.core.database import db

class Student(db.Model):
    __tablename__ = 'students'
    # Define fields
```

**`services.py`**:
```python
def create_student(data):
    # Business logic
    pass
```

**`routes.py`**:
```python
from . import students_bp
from backend.core.decorators import auth_required, require_permission

@students_bp.route('', methods=['POST'])
@auth_required
@require_permission('student.create')
def create_student_route():
    # Route handler
    pass
```

**Register in `app.py`**:
```python
from backend.modules.students import students_bp

app.register_blueprint(students_bp, url_prefix='/api/students')
```

---

## 📊 Code Examples

### Complete Route Example

```python
# backend/modules/students/routes.py

from flask import request, g
from . import students_bp
from backend.core.decorators import auth_required, require_permission
from backend.shared.helpers import success_response, error_response
from .services import create_student, get_student_by_id

@students_bp.route('', methods=['POST'])
@auth_required
@require_permission('student.create')
def create_student_route():
    """Create a new student"""
    data = request.get_json()
    
    # Validation
    if not data.get('name'):
        return error_response(
            'ValidationError',
            'Student name is required',
            400
        )
    
    # Call service
    result = create_student(data, created_by=g.current_user.id)
    
    # Return response
    if result['success']:
        return success_response(
            data=result['student'],
            message='Student created successfully',
            status_code=201
        )
    else:
        return error_response(
            'CreationError',
            result['error'],
            400
        )


@students_bp.route('/<student_id>', methods=['GET'])
@auth_required
@require_permission('student.read')
def get_student_route(student_id):
    """Get student details"""
    student = get_student_by_id(student_id)
    
    if not student:
        return error_response(
            'NotFound',
            'Student not found',
            404
        )
    
    return success_response(data=student)
```

### Complete Service Example

```python
# backend/modules/students/services.py

from typing import Dict, Optional
from backend.core.database import db
from .models import Student

def create_student(data: Dict, created_by: str) -> Dict:
    """
    Create a new student.
    
    Args:
        data: Student data
        created_by: User ID of creator
        
    Returns:
        Result dictionary
    """
    try:
        student = Student(
            name=data['name'],
            email=data.get('email'),
            grade=data.get('grade'),
            created_by=created_by
        )
        student.save()
        
        return {
            'success': True,
            'student': serialize_student(student)
        }
    except Exception as e:
        db.session.rollback()
        return {
            'success': False,
            'error': str(e)
        }


def get_student_by_id(student_id: str) -> Optional[Dict]:
    """Get student by ID"""
    student = Student.query.get(student_id)
    if not student:
        return None
    return serialize_student(student)


def serialize_student(student: Student) -> Dict:
    """Serialize student object"""
    return {
        'id': student.id,
        'name': student.name,
        'email': student.email,
        'grade': student.grade,
        'created_at': student.created_at.isoformat()
    }
```

---

## 🎓 Best Practices

### 1. Module Design
- ✅ One responsibility per module
- ✅ Consistent file structure
- ✅ Clear separation: routes → services → models
- ✅ Services contain all business logic
- ✅ Routes only handle HTTP concerns

### 2. RBAC Usage
- ✅ Always use permission-based authorization
- ✅ Never check role names in business logic
- ✅ Use descriptive permission names
- ✅ Group related permissions by resource
- ✅ Use `.manage` for admin-level access

### 3. Error Handling
- ✅ Use try-except in services
- ✅ Return result dictionaries
- ✅ Use helper functions for responses
- ✅ Rollback on database errors
- ✅ Log errors appropriately

### 4. Code Organization
- ✅ Import from `backend.*`
- ✅ Use absolute imports
- ✅ Keep routes thin
- ✅ Keep services focused
- ✅ Document complex logic

---

## 🔧 Migration Guide

### From Old Structure to New

#### Step 1: Update Imports
**Old**:
```python
from models import User
from auth.utils.auth_guard import auth_required
from auth.services.rbac_service import has_permission
```

**New**:
```python
from backend.modules.auth.models import User
from backend.core.decorators import auth_required
from backend.modules.rbac.services import has_permission
```

#### Step 2: Update App Initialization
**Old**:
```python
from app import app
```

**New**:
```python
from backend.app import create_app
app = create_app()
```

#### Step 3: Update Config Access
**Old**:
```python
from config import get_backend_url
```

**New**:
```python
from backend.config.settings import get_backend_url
```

#### Step 4: Run Database Migration
```bash
# The models are the same, just in new locations
# No database migration needed
```

---

## 📦 Production Deployment

### Requirements
```txt
Flask>=2.3.0
Flask-CORS>=4.0.0
Flask-SQLAlchemy>=3.0.0
PyJWT>=2.8.0
python-dotenv>=1.0.0
Werkzeug>=2.3.0
gunicorn>=21.0.0
```

### Environment Variables
```bash
# Flask
FLASK_ENV=production
FLASK_HOST=0.0.0.0
FLASK_PORT=5001
SECRET_KEY=your-secret-key

# Database
DATABASE_URL=postgresql://user:pass@host/db

# JWT
JWT_SECRET_KEY=your-jwt-secret
JWT_ACCESS_TOKEN_EXPIRES_MINUTES=15
JWT_REFRESH_TOKEN_EXPIRES_DAYS=7

# Email
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_ADDRESS=noreply@yourapp.com
EMAIL_PASSWORD=your-email-password

# URLs
BACKEND_URL=https://api.yourapp.com
FRONTEND_URL=https://yourapp.com
```

### Gunicorn Configuration
```bash
gunicorn \
  --workers 4 \
  --bind 0.0.0.0:5001 \
  --timeout 60 \
  --access-logfile - \
  --error-logfile - \
  backend.app:app
```

### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5001", "backend.app:app"]
```

---

## 🎯 Summary of Changes

### ✅ Completed
1. ✅ Created modular backend structure
2. ✅ Implemented application factory pattern
3. ✅ Centralized configuration management
4. ✅ Separated auth, RBAC, and users modules
5. ✅ Created reusable decorators
6. ✅ Implemented shared utilities
7. ✅ Created administrative scripts
8. ✅ Added comprehensive error handling
9. ✅ Preserved RBAC philosophy
10. ✅ Made architecture extensible

### 📈 Benefits
- **Scalability**: Easy to add new modules
- **Maintainability**: Clear separation of concerns
- **Testability**: Services isolated from routes
- **Production-Ready**: Error handling, logging, health checks
- **Developer Experience**: Consistent patterns, clear structure
- **RBAC Enforcement**: Centralized authorization logic

---

## 🚀 Next Steps

### Recommended Future Modules
1. **Students Module** - Student management
2. **Teachers Module** - Teacher management
3. **Attendance Module** - Attendance tracking
4. **Academics Module** - Grades, courses, schedules
5. **Finance Module** - Fee management
6. **Communication Module** - Notifications, announcements

### Each Module Should Follow
```
modules/module_name/
├── __init__.py        # Blueprint
├── models.py          # Database models
├── routes.py          # API endpoints
└── services.py        # Business logic
```

---

## 📞 Support

For questions or issues with the new architecture:
1. Review this documentation
2. Check example modules (auth, rbac, users)
3. Use Flask shell with helper scripts
4. Follow the patterns established

---

**Architecture Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: ✅ Production Ready

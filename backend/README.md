# School ERP Backend

Production-grade modular Flask backend with RBAC.

## 🚀 Quick Start

```bash
# 1. Initialize database
python -c "from backend.app import create_app; app = create_app(); app.app_context().push(); from backend.core.database import db; db.create_all()"

# 2. Seed RBAC system
python -m backend.scripts.seed_rbac

# 3. Create admin user
python -m backend.scripts.create_admin

# 4. Run server
python backend/app.py
```

Server: `http://0.0.0.0:5001`

## 📁 Structure

```
backend/
├── app.py              # Application factory (RUN THIS)
├── config/             # Configuration
├── core/               # Infrastructure
│   ├── database.py
│   └── decorators/     # @auth_required, @require_permission
├── modules/            # Business modules
│   ├── auth/          # Authentication
│   ├── rbac/          # Roles & permissions
│   ├── users/         # User management
│   └── mailer/        # Email service
├── shared/            # Utilities
└── scripts/           # Admin scripts
```

## 📚 Documentation

- **`../REFACTORING_SUMMARY.md`** - Overview and quick reference
- **`../QUICK_START.md`** - Setup and common tasks
- **`../BACKEND_ARCHITECTURE_REFACTORING.md`** - Complete documentation

## 🔧 Key Concepts

### Decorators
```python
from backend.core.decorators import auth_required, require_permission

@bp.route('/endpoint')
@auth_required
@require_permission('resource.action')
def endpoint():
    # g.current_user available
    pass
```

### Service Pattern
```python
# services.py - Business logic
def create_item(data):
    return {'success': True, 'item': item}

# routes.py - HTTP handling
@bp.route('/items', methods=['POST'])
@auth_required
@require_permission('item.create')
def create_item_route():
    result = create_item(request.get_json())
    return success_response(result['item'], 201)
```

## 🎯 RBAC

**Philosophy:**
- Authorization via permissions only
- Role names never in business logic
- Permission naming: `resource.action.scope`
- `manage` implies all actions

**Example:**
```python
from backend.modules.rbac.services import has_permission

if has_permission(user_id, 'student.create'):
    # Authorized
    pass
```

## 📡 API Endpoints

- `/api/auth` - Authentication
- `/api/rbac` - RBAC management
- `/api/users` - User management
- `/api/health` - Health check

## ⚡ Scripts

```bash
# Seed RBAC
python -m backend.scripts.seed_rbac

# Create admin
python -m backend.scripts.create_admin

# RBAC helpers (Flask shell)
from backend.scripts.rbac_helpers import *
assign_admin_role('admin@school.com')
```

## ✨ Features

- ✅ Application factory pattern
- ✅ Modular architecture
- ✅ Permission-based RBAC
- ✅ JWT authentication
- ✅ Email service
- ✅ Health checks
- ✅ Error handling

## 🔄 Add New Module

```bash
mkdir -p backend/modules/new_module
cd backend/modules/new_module

# Create files
touch __init__.py models.py routes.py services.py
```

Then register in `app.py`:
```python
from backend.modules.new_module import new_module_bp
app.register_blueprint(new_module_bp, url_prefix='/api/new-module')
```

## 📞 Support

Check the main documentation files in the project root for detailed guides.

**Happy coding! 🎉**

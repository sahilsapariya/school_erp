# Quick Start Guide - New Backend Architecture

## 🚀 Getting Started

### 1. Initial Setup

```bash
# Make sure you're in the project root
cd /Users/sahilsapariya/Documents/projects/school-ERP

# Your .env file is already configured
# No changes needed if it was working before
```

### 2. Initialize Database

```bash
# Create all tables
python -c "from backend.app import create_app; app = create_app(); app.app_context().push(); from backend.core.database import db; db.create_all()"
```

### 3. Seed RBAC System

```bash
# Seed roles and permissions
python -m backend.scripts.seed_rbac
```

This creates:
- **40+ Permissions** (user.read, student.create, etc.)
- **4 Roles** (Admin, Teacher, Student, Parent)
- **Automatic Assignments**

### 4. Create Admin User

```bash
# Interactive admin creation
python -m backend.scripts.create_admin
```

Or use Flask shell:
```python
from backend.app import create_app
from backend.scripts.create_admin import create_admin_user

app = create_app()
with app.app_context():
    create_admin_user('admin@school.com', 'password123', 'Admin User')
```

### 5. Run the Server

```bash
# Development server
python backend/app.py
```

Server will start on: `http://0.0.0.0:5001`

---

## 🔥 Quick Commands

### Flask Shell

```bash
# Start Flask shell
python -c "from backend.app import create_app; app = create_app(); app.app_context().push(); import IPython; IPython.embed()"
```

### Assign Roles

```python
from backend.scripts.rbac_helpers import *

# Assign roles
assign_admin_role('user@email.com')
assign_teacher_role('teacher@email.com')
assign_student_role('student@email.com')

# View permissions
show_user_permissions('user@email.com')
show_all_roles()
show_all_permissions()
```

---

## 📡 API Endpoints

### Test the API

```bash
# Health check
curl http://localhost:5001/api/health

# API info
curl http://localhost:5001/api

# Register user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## 🏗️ Project Structure Overview

```
backend/
├── app.py                  # Main application (run this)
├── config/                 # Configuration
├── core/                   # Infrastructure
│   ├── database.py        # Database
│   └── decorators/        # @auth_required, @require_permission
├── modules/               # Business modules
│   ├── auth/             # Authentication
│   ├── rbac/             # Roles & Permissions
│   ├── users/            # User management
│   └── mailer/           # Email service
├── shared/               # Utilities
└── scripts/              # Helper scripts
    ├── seed_rbac.py     # Seed database
    ├── create_admin.py  # Create admin
    └── rbac_helpers.py  # Helper functions
```

---

## ✅ Verify Everything Works

```bash
# 1. Check server is running
curl http://localhost:5001/api/health

# 2. Check database tables exist
python -c "from backend.app import create_app; app = create_app(); app.app_context().push(); from backend.core.database import db; print([table.name for table in db.metadata.sorted_tables])"

# 3. Check roles and permissions
python -c "from backend.app import create_app; app = create_app(); app.app_context().push(); from backend.scripts.rbac_helpers import show_all_roles; show_all_roles()"
```

---

## 🔧 Common Tasks

### Create a Test User with Role

```python
from backend.app import create_app
from backend.modules.auth.models import User
from backend.scripts.rbac_helpers import assign_student_role

app = create_app()
with app.app_context():
    # Create user
    user = User()
    user.email = 'test@example.com'
    user.set_password('password123')
    user.email_verified = True
    user.save()
    
    # Assign role
    assign_student_role('test@example.com')
```

### Check User Permissions

```python
from backend.app import create_app
from backend.scripts.rbac_helpers import show_user_permissions

app = create_app()
with app.app_context():
    show_user_permissions('test@example.com')
```

### Reset Database (⚠️ Caution)

```bash
# Drop all tables and recreate
python -c "from backend.app import create_app; app = create_app(); app.app_context().push(); from backend.core.database import db; db.drop_all(); db.create_all()"

# Then re-seed RBAC
python -m backend.scripts.seed_rbac
```

---

## 📚 Next Steps

1. ✅ Read `BACKEND_ARCHITECTURE_REFACTORING.md` for full documentation
2. ✅ Test the API endpoints with your frontend
3. ✅ Review the RBAC permissions
4. ✅ Customize roles and permissions as needed

---

## 🆘 Troubleshooting

### Import Errors
Make sure you're using the new import paths:
```python
# ❌ Old
from models import User
from auth.utils.auth_guard import auth_required

# ✅ New
from backend.modules.auth.models import User
from backend.core.decorators import auth_required
```

### Database Errors
```bash
# Check database connection
echo $DATABASE_URL

# Recreate tables
python -c "from backend.app import create_app; app = create_app(); app.app_context().push(); from backend.core.database import db; db.create_all()"
```

### Port Already in Use
```bash
# Check what's using port 5001
lsof -i :5001

# Kill the process
kill -9 <PID>
```

---

## 📞 Need Help?

- Check `BACKEND_ARCHITECTURE_REFACTORING.md` for detailed architecture docs
- Review example modules in `backend/modules/`
- Use `backend/scripts/rbac_helpers.py` for common operations

**Happy Coding! 🎉**

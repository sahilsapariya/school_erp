## Cursor Cloud specific instructions

### Overview

This is a **School ERP** multi-tenant SaaS with two services:

| Service | Tech | Dev Port | Run Command |
|---------|------|----------|-------------|
| Backend API | Flask / Python 3 | 5001 | `FLASK_APP=backend.app:create_app python3 -m flask run --host=0.0.0.0 --port=5001` |
| Frontend | Expo / React Native (web) | 8081 | `cd client && npx expo start --web --port 8081 --non-interactive` |

Both require PostgreSQL running on port 5432. See `docs/QUICK_START.md` and `backend/README.md` for standard commands.

### PostgreSQL

PostgreSQL must be started before the backend:

```
sudo pg_ctlcluster $(pg_lsclusters -h | awk '{print $1, $2}') start
```

The dev database is `school_erp` with user `postgres` / password `postgres`.

### Backend startup caveats

- **Do not run** `python backend/app.py` directly — it fails with `ModuleNotFoundError: No module named 'backend'`. Always run from the workspace root using `flask run` or `python3 -m flask run` with `FLASK_APP=backend.app:create_app`.
- The `flask` CLI is installed to `~/.local/bin`. Ensure `PATH` includes it.
- Migrations: `FLASK_APP=backend.app:create_app flask db upgrade` (from workspace root).
- The rate-limiter warning about in-memory storage is expected in development.

### RBAC seeding requires tenant context

The `python3 -m backend.scripts.seed_rbac` script creates permissions (global) but **roles are tenant-scoped** and fail without `g.tenant_id`. To seed roles:

```python
from backend.app import create_app
from backend.core.models import Tenant
from flask import g

app = create_app()
with app.app_context():
    t = Tenant.query.filter_by(subdomain='default').first()
    with app.test_request_context():
        g.tenant_id = t.id
        from backend.scripts.seed_rbac import seed_rbac
        seed_rbac()
```

Similarly, `create_admin` is interactive (uses `getpass`/`input`). Use the programmatic API instead:

```python
with app.test_request_context():
    g.tenant_id = t.id
    from backend.scripts.create_admin import create_admin_user
    create_admin_user('admin@school.com', 'password123', 'Admin User', t.id)
```

### Frontend lint / typecheck

```
cd client && npx expo lint    # ESLint
cd client && npx tsc --noEmit # TypeScript
```

### Expo web rendering in cloud VM

Chrome in the cloud VM may crash with "Error code 4" when loading the Expo web app due to VM memory/GPU constraints. The Expo dev server still serves valid HTML (verifiable with `curl`). For frontend GUI testing, prefer running on a local machine or using `curl` / API-level checks.

### Admin credentials (dev)

| Field | Value |
|-------|-------|
| Email | `admin@school.com` |
| Password | `password123` |
| Subdomain | `default` |

### API testing

Health: `curl http://localhost:5001/api/health`

Login:
```
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@school.com","password":"password123","subdomain":"default"}'
```

Authenticated requests require `Authorization: Bearer <token>` and `X-Tenant-ID: <id>` headers.

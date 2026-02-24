#!/bin/bash
# Run the Flask backend with Gunicorn.
# Execute from the app/ directory: ./run_gunicorn.sh

cd "$(dirname "$0")"

# Fix for macOS + Conda/Anaconda: prevents "objc initialize fork" crash
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

# Use backend.app:app (the pre-created instance) - run from app/ so backend is importable
exec gunicorn -c gunicorn_conf.py "backend.app:app"

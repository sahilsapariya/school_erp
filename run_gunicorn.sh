#!/bin/bash
# Run Flask + Celery worker + Celery beat in one container

cd "$(dirname "$0")"

# Fix for macOS + Conda/Anaconda: prevents "objc initialize fork" crash
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

echo "Starting Celery worker + beat..."

# Start Celery worker with beat scheduler in background
celery -A backend.celery_worker:celery worker -B -l info &

echo "Starting Flask API with Gunicorn..."

# Start Flask API
exec gunicorn -c gunicorn_conf.py "backend.app:app"

#!/bin/bash
# Run Flask + Celery worker + Celery beat in one container

cd "$(dirname "$0")"

# Fix for macOS + Conda/Anaconda: prevents "objc initialize fork" crash
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES

echo "Starting Celery worker + beat..."

# Run only ONE celery worker to keep memory low
celery -A backend.celery_worker:celery worker -B --concurrency=1 -l info &

echo "Starting Flask API with Gunicorn..."

# Run only one gunicorn worker
exec gunicorn -c gunicorn_conf.py backend.app:app --workers 1 --threads 2
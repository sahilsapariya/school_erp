"""
Gunicorn configuration for School ERP backend.

Run from the app/ directory:
    gunicorn -c gunicorn_conf.py "backend.app:app"

On macOS (with Conda/Anaconda), set before running:
    export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
"""
import os

bind = os.getenv("GUNICORN_BIND", "0.0.0.0:5001")
workers = int(os.getenv("GUNICORN_WORKERS", "4"))
worker_class = "sync"
timeout = 120
keepalive = 5
preload = False  # Set True to load app before forking (can help on macOS)

# Log requests to terminal (like Flask dev server)
accesslog = "-"
errorlog = "-"
access_log_format = '%(h)s - - [%(t)s] "%(r)s" %(s)s -'

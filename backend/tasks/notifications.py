"""Notification tasks - async email sending."""

from backend.celery_app import get_celery

# Worker loads via celery_worker; get_celery returns init'd instance
celery_app = get_celery()


@celery_app.task(bind=True, name="send_email_task")
def send_email_task(self, to_email: str, subject: str, body: str, is_html: bool = True):
    """
    Send email asynchronously. Runs with Flask app context (ContextTask).
    """
    try:
        from flask_mail import Message
        from flask import current_app
        mail = getattr(current_app, "mail", None)
        if not mail:
            return False
        msg = Message(subject=subject, body=body or "", recipients=[to_email])
        if is_html:
            msg.html = body or ""
        mail.send(msg)
        return True
    except Exception:
        return False

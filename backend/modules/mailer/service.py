"""
Email Service

Handles sending emails using SMTP with Jinja2 templates.
"""

import os
import smtplib
from email.message import EmailMessage
from jinja2 import Environment, FileSystemLoader
from typing import Dict, Optional


# Email Configuration
EMAIL_CONFIG = {
    "SMTP_SERVER": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
    "SMTP_PORT": int(os.getenv("SMTP_PORT", 587)),
    "EMAIL_ADDRESS": os.getenv("EMAIL_ADDRESS"),
    "EMAIL_PASSWORD": os.getenv("EMAIL_PASSWORD"),
    "DEFAULT_SENDER_NAME": os.getenv("DEFAULT_SENDER_NAME", "School ERP"),
}

# Template directory
BASE_DIR = os.path.dirname(__file__)
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")


def render_email_template(template_name: str, context: Dict) -> str:
    """
    Render an email template with context data.
    
    Args:
        template_name: Name of the template file
        context: Dictionary of variables to pass to template
        
    Returns:
        Rendered HTML string
    """
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    template = env.get_template(template_name)
    return template.render(**context)


def create_email_message(
    to_email: str,
    subject: str,
    body: str,
    is_html: bool = True,
    from_name: Optional[str] = None,
    from_email: Optional[str] = None
) -> EmailMessage:
    """
    Create an email message object.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Email body (HTML or plain text)
        is_html: Whether body is HTML (default True)
        from_name: Sender name (optional)
        from_email: Sender email (optional)
        
    Returns:
        EmailMessage object
    """
    msg = EmailMessage()

    # Set sender
    sender_name = from_name or EMAIL_CONFIG["DEFAULT_SENDER_NAME"]
    sender_email = from_email or EMAIL_CONFIG["EMAIL_ADDRESS"]
    msg["From"] = f"{sender_name} <{sender_email}>"
    
    # Set recipient and subject
    msg["To"] = to_email
    msg["Subject"] = subject

    # Set body
    if is_html:
        msg.add_alternative(body, subtype="html")
    else:
        msg.set_content(body)

    return msg


def send_email(
    to_email: str,
    subject: str,
    body: str,
    is_html: bool = True,
    from_name: Optional[str] = None,
    from_email: Optional[str] = None
) -> None:
    """
    Send an email.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        body: Email body (HTML or plain text)
        is_html: Whether body is HTML (default True)
        from_name: Sender name (optional)
        from_email: Sender email (optional)
        
    Raises:
        smtplib.SMTPException: If email sending fails
        
    Example:
        >>> send_email(
        ...     to_email='user@example.com',
        ...     subject='Welcome!',
        ...     body='<h1>Welcome to our platform</h1>',
        ...     is_html=True
        ... )
    """
    msg = create_email_message(
        to_email=to_email,
        subject=subject,
        body=body,
        is_html=is_html,
        from_name=from_name,
        from_email=from_email
    )

    # Send email via SMTP
    with smtplib.SMTP(
        EMAIL_CONFIG["SMTP_SERVER"],
        EMAIL_CONFIG["SMTP_PORT"]
    ) as server:
        server.starttls()
        server.login(
            EMAIL_CONFIG["EMAIL_ADDRESS"],
            EMAIL_CONFIG["EMAIL_PASSWORD"]
        )
        server.send_message(msg)


def _platform_email_context() -> Dict:
    """Get email_from_name and support_email from platform settings for templates."""
    try:
        from backend.modules.platform.services import get_platform_settings
        s = get_platform_settings()
        out = {}
        if s.get("email_from_name"):
            out["email_from_name"] = s["email_from_name"]
        if s.get("support_email"):
            out["support_email"] = s["support_email"]
        return out
    except Exception:
        return {}


def send_template_email(
    to_email: str,
    template_name: str,
    context: Dict,
    subject: str = "",
    from_name: Optional[str] = None,
    from_email: Optional[str] = None
) -> None:
    """
    Send an email using a Jinja2 template.

    If from_name is not provided, uses platform setting email_from_name when set.
    Merges support_email and email_from_name from platform settings into context for templates.
    """
    ctx = {**context, **_platform_email_context()}
    if from_name is None and ctx.get("email_from_name"):
        from_name = ctx["email_from_name"]

    body = render_email_template(template_name, ctx)

    send_email(
        to_email=to_email,
        subject=subject,
        body=body,
        is_html=True,
        from_name=from_name,
        from_email=from_email
    )


# Alias for backward compatibility with old code
def send_email_old_signature(
    to_email: str,
    context: Dict,
    template_name: str,
    body: str = "",
    subject: str = "",
    is_html: bool = True,
) -> None:
    """
    Legacy function signature for backward compatibility.
    Use send_template_email() for new code.
    """
    if template_name:
        # Template-based email
        send_template_email(
            to_email=to_email,
            template_name=template_name,
            context=context,
            subject=subject
        )
    else:
        # Plain email
        send_email(
            to_email=to_email,
            subject=subject,
            body=body,
            is_html=is_html
        )

import os
import smtplib
from email.message import EmailMessage
from jinja2 import Environment, FileSystemLoader

from dotenv import load_dotenv

load_dotenv()

EMAIL_CONFIG = {
    "SMTP_SERVER": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
    "SMTP_PORT": os.getenv("SMTP_PORT", 587),
    "EMAIL_ADDRESS": os.getenv("EMAIL_ADDRESS"),
    "EMAIL_PASSWORD": os.getenv("EMAIL_PASSWORD"),
    "DEFAULT_SENDER_NAME": os.getenv("DEFAULT_SENDER_NAME", "No Reply"),
}

BASE_DIR = os.path.dirname(__file__)
TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")


def render_email_template(template_name: str, context: dict) -> str:
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    template = env.get_template(template_name)
    return template.render(**context)


def create_email_message(
    to_email: str,
    subject: str,
    template_name: str,
    context: dict,
    body: str = "",
    is_html: bool = True,
) -> EmailMessage:
    msg = EmailMessage()

    sender_name = EMAIL_CONFIG["DEFAULT_SENDER_NAME"]
    sender_email = EMAIL_CONFIG["EMAIL_ADDRESS"]

    msg["From"] = f"{sender_name} <{sender_email}>"
    msg["To"] = to_email
    msg["Subject"] = subject

    if is_html:
        body = render_email_template(template_name, context)
        msg.add_alternative(body, subtype="html")
    else:
        msg.set_content(body)

    return msg


def send_email(
    to_email: str,
    context: dict,
    template_name: str,
    body: str = "",
    subject: str = "",
    is_html: bool = True,
) -> None:
    msg = create_email_message(
        to_email=to_email,
        subject=subject,
        template_name=template_name,
        context=context,
        body=body,
        is_html=is_html
    )

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


import aiosmtplib
from email.message import EmailMessage

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "mohamedkhelifi857@gmail.com"
SMTP_PASSWORD = "uvhpgndmhjurygig"

async def send_verification_email(to_email: str, token: str):
    message = EmailMessage()
    message["From"] = SMTP_USER
    message["To"] = to_email
    message["Subject"] = "Verify your DeepCardio account"
    verification_link = f"http://localhost:8001/api/v1/doctors/verify?token={token}"

    message.set_content(f"Click this link to verify your email:\n\n{verification_link}")

    print(f"📧 Sending email to {to_email}...")  # Optional debug log

    try:
        await aiosmtplib.send(
            message,
            hostname=SMTP_HOST,
            port=SMTP_PORT,
            start_tls=True,
            username=SMTP_USER,
            password=SMTP_PASSWORD
        )
        print("✅ Email sent successfully.")
    except Exception as e:
        print("❌ Failed to send email:", e)

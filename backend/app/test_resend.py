import resend
import os
from dotenv import load_dotenv

load_dotenv()  # Load variables from .env file

resend.api_key = os.getenv("RESEND_API_KEY")  # Use the ENV variable name

params = {
    "from": "DeepCardio <onboarding@resend.dev>",
    "to": ["chaabenehideya@gmail.com"],
    "subject": "Test Email",
    "html": "<p>Test email from Resend</p>",
}

try:
    response = resend.Emails.send(params)
    print(f"Success: {response}")
except Exception as e:
    print(f"Error: {str(e)}")

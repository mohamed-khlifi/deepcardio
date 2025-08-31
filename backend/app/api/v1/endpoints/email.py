from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from pydantic import BaseModel, EmailStr
import resend
from ..dependencies import get_current_user, User
from ..db import get_db
from sqlalchemy.orm import Session
import logging
import os
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic model for email request
class EmailRequest(BaseModel):
    to_email: EmailStr
    body: str
    patient_id: int

@router.post("/send-email")
async def send_email(
        to_email: EmailStr = Form(...),
        body: str = Form(...),
        patient_id: int = Form(...),
        pdf_file: UploadFile = File(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    logger.info(f"Processing email request for patient_id: {patient_id} to {to_email}")
    try:
        # Validate PDF file
        if pdf_file.content_type != "application/pdf":
            logger.error(f"Invalid file type: {pdf_file.content_type}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File must be a PDF")

        # Read PDF content
        pdf_bytes = await pdf_file.read()
        if not pdf_bytes:
            logger.error("Empty PDF file uploaded")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="PDF file is empty")

        # Fetch patient data for naming
        logger.info("Fetching patient data")
        from backend.app.models.patient import Patient
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            logger.error(f"Patient not found for patient_id: {patient_id}")
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

        # Configure Resend
        logger.info("Configuring Resend API")
        resend_api_key = os.getenv("RESEND_API_KEY")
        if not resend_api_key:
            logger.error("Resend API key not configured")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Resend API key not configured")
        resend.api_key = resend_api_key

        # Prepare email parameters
        filename = f"{patient.first_name or 'patient'}_{patient.last_name or 'none'}_report.pdf"
        params = {
            "from": "DeepCardio <onboarding@resend.dev>",
            "to": [to_email],
            "subject": f"Patient Summary for {patient.first_name or 'Patient'} {patient.last_name or ''}",
            "html": f"""
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #4B40EE;">Patient Summary</h2>
                <p>{body}</p>
                <p>Attached is the patient summary PDF.</p>
                <p style="margin-top: 20px;">Best regards,<br><strong>DeepCardio Team</strong></p>
            </div>
            """,
            "attachments": [
                {
                    "filename": filename,
                    "content": list(pdf_bytes),  # Convert bytes to list for Resend
                    "content_type": "application/pdf"
                }
            ]
        }

        # Send email
        logger.info(f"Sending email to {to_email}")
        response = resend.Emails.send(params)
        logger.info(f"Email sent successfully to {to_email}, email_id: {response['id']}")
        return {"message": "Email sent successfully", "email_id": response["id"]}

    except Exception as e:
        logger.error(f"Error sending email to {to_email}: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to send email: {str(e)}")
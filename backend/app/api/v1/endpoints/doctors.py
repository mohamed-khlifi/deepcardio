from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from backend.app.models.doctor import Doctor
from backend.app.core.deps import get_db
from backend.app.utils.auth_utils import  decode_token
from pydantic import BaseModel

doctors_router = APIRouter()

@doctors_router.get("/doctors/verify", status_code=200)
def verify_email(token: str = Query(...), db: Session = Depends(get_db)):
    try:
        email = decode_token(token)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    doctor = db.query(Doctor).filter(Doctor.email == email).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doctor.is_verified = True
    db.commit()

    return {"message": "Email verified. You can now log in."}

class DoctorCreateAuth0(BaseModel):
    first_name: str
    last_name: str
    email: str
    username: str
    password: str | None = ""

@doctors_router.post("/doctors/create-auth0")
def create_doctor_from_auth0(
        data: DoctorCreateAuth0,
        request: Request,
        db: Session = Depends(get_db)
):
    if request.headers.get("x-api-key") != "INTERNAL_SECRET_123":
        raise HTTPException(status_code=403, detail="Forbidden")

    if db.query(Doctor).filter(Doctor.username == data.username).first():
        return {"message": "Doctor already exists"}

    new_doc = Doctor(
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        username=data.username,
        password_hash="",   # not used
        is_verified=True
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return {"message": "Doctor saved", "id": new_doc.id}
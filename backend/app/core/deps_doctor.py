# core/deps_doctor.py

from fastapi import Depends, Request
from sqlalchemy.orm import Session
from backend.app.core.deps import get_db
from backend.app.utils.auth import get_token_auth_header, verify_jwt
from backend.app.models.doctor import Doctor
from fastapi import HTTPException

def get_current_doctor(request: Request, db: Session = Depends(get_db)):
    token = get_token_auth_header(request)
    payload = verify_jwt(token)

    auth0_user_id = payload.get("sub")
    if not auth0_user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    doctor = db.query(Doctor).filter(Doctor.username == auth0_user_id).first()

    if not doctor:
        # ⬇️ read custom namespaced claims
        full_name = payload.get("https://deepcardio.ai/name", "")
        email = payload.get("https://deepcardio.ai/email", "")

        if full_name and " " in full_name:
            first_name, last_name = full_name.split(" ", 1)
        else:
            first_name = full_name
            last_name = ""

        doctor = Doctor(
            username=auth0_user_id,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password_hash="",
            is_verified=True
        )
        db.add(doctor)
        db.commit()
        db.refresh(doctor)

    return doctor


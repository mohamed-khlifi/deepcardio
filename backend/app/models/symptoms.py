from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from core.deps import get_db
from models.symptoms_schema import PatientSymptomCreate, PatientSymptomResponse
from services.patient_service import create_patient_symptom

router = APIRouter()

@router.post("/patient-symptoms", response_model=PatientSymptomResponse)
def add_patient_symptom(data: PatientSymptomCreate, db: Session = Depends(get_db)):
    try:
        return create_patient_symptom(db, data)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

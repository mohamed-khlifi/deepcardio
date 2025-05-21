from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import exists, and_
from typing import List
from models.symptoms_schema import PatientSymptomCreate, SymptomDictResponse
from models.patient_symptom import PatientSymptom
from models.patient import Patient
from models.symptom_dict import SymptomDict
from models.doctor_patient import DoctorPatient
from models.doctor import Doctor

from core.deps import get_db
from core.deps_doctor import get_current_doctor

symptoms_router = APIRouter()

def ensure_doctor_owns_patient(doctor: Doctor, patient_id: int, db: Session):
    link = db.query(DoctorPatient).filter_by(doctor_id=doctor.id, patient_id=patient_id).first()
    if not link:
        raise HTTPException(status_code=403, detail="You are not authorized to access this patient")

@symptoms_router.post(
    "/symptoms",
    status_code=status.HTTP_201_CREATED,
    summary="Add Patient Symptom",
    description="Adds a symptom to a patient. Validates patient and symptom existence, and prevents duplicates."
)
def add_patient_symptom(
        data: PatientSymptomCreate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_doctor_owns_patient(doctor, data.patient_id, db)

    if not db.query(exists().where(Patient.patient_id == data.patient_id)).scalar():
        raise HTTPException(status_code=404, detail=f"Patient with ID {data.patient_id} not found")

    if not db.query(exists().where(SymptomDict.symptom_id == data.symptom_id)).scalar():
        raise HTTPException(status_code=404, detail=f"Symptom with ID {data.symptom_id} not found")

    duplicate_exists = db.query(
        exists().where(
            and_(
                PatientSymptom.patient_id == data.patient_id,
                PatientSymptom.symptom_id == data.symptom_id
            )
        )
    ).scalar()

    if duplicate_exists:
        raise HTTPException(
            status_code=400,
            detail=f"Symptom already recorded for patient ID {data.patient_id}"
        )

    new_entry = PatientSymptom(
        patient_id=data.patient_id,
        symptom_id=data.symptom_id,
        onset_date=data.onset_date
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    return {
        "message": "Symptom added",
        "record": {
            "patient_id": new_entry.patient_id,
            "symptom_id": new_entry.symptom_id,
            "onset_date": new_entry.onset_date
        }
    }

@symptoms_router.delete(
    "/symptoms",
    status_code=status.HTTP_200_OK,
    summary="Delete Patient Symptom",
    description="Deletes a symptom record for a patient using patient_id and symptom_id."
)
def delete_patient_symptom(
        patient_id: int,
        symptom_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_doctor_owns_patient(doctor, patient_id, db)

    entry = db.query(PatientSymptom).filter(
        PatientSymptom.patient_id == patient_id,
        PatientSymptom.symptom_id == symptom_id
    ).first()

    if not entry:
        raise HTTPException(
            status_code=404,
            detail=f"No record found for patient_id={patient_id} and symptom_id={symptom_id}"
        )

    db.delete(entry)
    db.commit()

    return {"message": f"Symptom ID {symptom_id} deleted for patient ID {patient_id}"}

@symptoms_router.get(
    "/symptoms",
    summary="List all patient symptoms for the logged-in doctor",
    status_code=200
)
def list_all_symptoms_for_doctor(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    patient_ids = db.query(DoctorPatient.patient_id).filter_by(doctor_id=doctor.id).subquery()
    return db.query(PatientSymptom).filter(PatientSymptom.patient_id.in_(patient_ids)).all()

@symptoms_router.get(
    "/symptoms/by-patient/{patient_id}",
    summary="List patient symptoms",
    description="Get all symptoms for a specific patient",
    status_code=200
)
def get_symptoms_by_patient(
        patient_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_doctor_owns_patient(doctor, patient_id, db)
    return db.query(PatientSymptom).filter(PatientSymptom.patient_id == patient_id).all()

@symptoms_router.get(
    "/symptoms/by-symptom/{symptom_id}",
    summary="List all patient records for a specific symptom (doctor-owned only)",
    status_code=200
)
def get_symptoms_by_symptom_id(
        symptom_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    patient_ids = db.query(DoctorPatient.patient_id).filter_by(doctor_id=doctor.id).subquery()
    return db.query(PatientSymptom).filter(
        PatientSymptom.symptom_id == symptom_id,
        PatientSymptom.patient_id.in_(patient_ids)
    ).all()

@symptoms_router.get(
    "/symptoms/dict",
    response_model=List[SymptomDictResponse],
    summary="List all available symptoms (dictionary)"
)
def list_symptom_dict(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):

    return db.query(SymptomDict).all()
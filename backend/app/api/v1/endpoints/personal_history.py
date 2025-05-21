from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import exists
from typing import List
from models.patient import Patient
from models.personal_history_dict import PersonalHistoryDict
from models.patient_personal_history import PatientPersonalHistory
from models.personal_history_schema import PatientPersonalHistoryCreate, PatientPersonalHistoryResponse, PersonalHistoryDictResponse
from models.doctor_patient import DoctorPatient
from models.doctor import Doctor

from core.deps import get_db
from core.deps_doctor import get_current_doctor

personal_history_router = APIRouter()

def verify_ownership(patient_id: int, doctor: Doctor, db: Session):
    link = db.query(DoctorPatient).filter_by(doctor_id=doctor.id, patient_id=patient_id).first()
    if not link:
        raise HTTPException(status_code=403, detail="This patient is not assigned to you")

@personal_history_router.post(
    "/personal-history",
    status_code=status.HTTP_201_CREATED,
    summary="Add personal history record",
    description="Create a new personal history record for a patient."
)
def add_personal_history(
        data: PatientPersonalHistoryCreate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    verify_ownership(data.patient_id, doctor, db)

    if not db.query(exists().where(Patient.patient_id == data.patient_id)).scalar():
        raise HTTPException(status_code=404, detail=f"Patient ID {data.patient_id} not found")
    if not db.query(exists().where(PersonalHistoryDict.id == data.history_id)).scalar():
        raise HTTPException(status_code=404, detail=f"History ID {data.history_id} not found")

    duplicate = db.query(PatientPersonalHistory).filter_by(
        patient_id=data.patient_id,
        history_id=data.history_id,
        date_recorded=data.date_recorded
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Record already exists")

    record = PatientPersonalHistory(
        patient_id=data.patient_id,
        history_id=data.history_id,
        date_recorded=data.date_recorded
    )
    db.add(record)
    db.commit()
    return {"message": "Personal history added successfully"}


@personal_history_router.delete(
    "/personal-history",
    status_code=status.HTTP_200_OK,
    summary="Delete personal history record",
    description="Remove an existing personal history record by patient, history, and date."
)
def delete_personal_history(
        data: PatientPersonalHistoryCreate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    verify_ownership(data.patient_id, doctor, db)

    record = db.query(PatientPersonalHistory).filter_by(
        patient_id=data.patient_id,
        history_id=data.history_id,
        date_recorded=data.date_recorded
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    db.delete(record)
    db.commit()
    return {"message": "Personal history record deleted successfully"}


@personal_history_router.get(
    "/personal-history",
    response_model=list[PatientPersonalHistoryResponse],
    summary="List all personal history records (doctor only)",
    description="Retrieve all personal history records for the logged-in doctor."
)
def list_all_personal_history(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    patient_ids = db.query(DoctorPatient.patient_id).filter_by(doctor_id=doctor.id).subquery()
    return db.query(PatientPersonalHistory).filter(PatientPersonalHistory.patient_id.in_(patient_ids)).all()


@personal_history_router.get(
    "/personal-history/by-patient/{patient_id}",
    response_model=list[PatientPersonalHistoryResponse],
    summary="List personal history by patient ID",
    description="Retrieve all personal history records for a specific patient."
)
def get_history_by_patient(
        patient_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    verify_ownership(patient_id, doctor, db)
    return db.query(PatientPersonalHistory).filter(PatientPersonalHistory.patient_id == patient_id).all()


@personal_history_router.get(
    "/personal-history/by-history/{history_id}",
    response_model=list[PatientPersonalHistoryResponse],
    summary="List personal history by history ID",
    description="Retrieve all patient associations for a specific history item (only for patients you own)."
)
def get_history_by_history_id(
        history_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    patient_ids = db.query(DoctorPatient.patient_id).filter_by(doctor_id=doctor.id).subquery()
    return db.query(PatientPersonalHistory).filter(
        PatientPersonalHistory.history_id == history_id,
        PatientPersonalHistory.patient_id.in_(patient_ids)
    ).all()

@personal_history_router.get(
    "/personal-history/dict",
    response_model=List[PersonalHistoryDictResponse],
    summary="List all available personal history items",
)
def list_history_dict(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    # We return everything; you might restrict fields if needed
    return db.query(PersonalHistoryDict).all()
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import exists, and_
from typing import List

from core.deps import get_db
from core.deps_doctor import get_current_doctor
from models.doctor import Doctor
from models.doctor_patient import DoctorPatient
from models.vital_signs_schema import (
    PatientVitalSignCreate,
    PatientVitalSignUpdate,
    PatientVitalSignDelete,
    VitalSignDictResponse,
)
from models.patient_vital_signs import PatientVitalSigns
from models.patient import Patient
from models.vital_signs_dict import VitalSignsDict

vital_signs_router = APIRouter()

def ensure_doctor_owns_patient(doctor: Doctor, patient_id: int, db: Session):
    link = db.query(DoctorPatient).filter_by(doctor_id=doctor.id, patient_id=patient_id).first()
    if not link:
        raise HTTPException(status_code=403, detail="You are not authorized to access this patient")

@vital_signs_router.post(
    "/vital-signs",
    status_code=status.HTTP_201_CREATED,
    summary="Add Patient Vital Sign",
    description="Records a new vital sign value for a patient. Ensures the patient and vital sign exist."
)
def add_patient_vital_sign(
        data: PatientVitalSignCreate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_doctor_owns_patient(doctor, data.patient_id, db)

    if not db.query(exists().where(Patient.patient_id == data.patient_id)).scalar():
        raise HTTPException(status_code=404, detail=f"Patient ID {data.patient_id} not found")

    if not db.query(exists().where(VitalSignsDict.vital_sign_id == data.vital_sign_id)).scalar():
        raise HTTPException(status_code=404, detail=f"Vital Sign ID {data.vital_sign_id} not found")

    if db.query(exists().where(
            and_(
                PatientVitalSigns.patient_id == data.patient_id,
                PatientVitalSigns.vital_sign_id == data.vital_sign_id,
                PatientVitalSigns.measurement_date == data.measurement_date
            )
    )).scalar():
        raise HTTPException(status_code=400, detail="Vital sign already recorded for this date")

    entry = PatientVitalSigns(
        patient_id=data.patient_id,
        vital_sign_id=data.vital_sign_id,
        measurement_date=data.measurement_date,
        value=data.value
    )

    db.add(entry)
    db.commit()
    db.refresh(entry)

    return {
        "message": "Vital sign recorded",
        "record": {
            "patient_id": entry.patient_id,
            "vital_sign_id": entry.vital_sign_id,
            "measurement_date": entry.measurement_date,
            "value": entry.value
        }
    }

@vital_signs_router.delete(
    "/vital-signs",
    status_code=status.HTTP_200_OK,
    summary="Delete Patient Vital Sign",
    description="Deletes the latest vital sign record for a given patient and vital sign ID."
)
def delete_patient_vital_sign(
        data: PatientVitalSignDelete,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_doctor_owns_patient(doctor, data.patient_id, db)

    record = db.query(PatientVitalSigns).filter(
        PatientVitalSigns.patient_id == data.patient_id,
        PatientVitalSigns.vital_sign_id == data.vital_sign_id
    ).order_by(PatientVitalSigns.measurement_date.desc()).first()

    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"No record found for patient_id={data.patient_id}, vital_sign_id={data.vital_sign_id}"
        )

    db.delete(record)
    db.commit()
    return {
        "message": "Latest vital sign entry deleted",
        "record": {
            "patient_id": record.patient_id,
            "vital_sign_id": record.vital_sign_id,
            "measurement_date": record.measurement_date,
            "value": record.value
        }
    }

@vital_signs_router.put(
    "/vital-signs",
    status_code=status.HTTP_200_OK,
    summary="Update Patient Vital Sign",
    description="Updates the value of a vital sign for a patient. Matches based on patient_id and vital_sign_id."
)
def update_patient_vital_sign(
        data: PatientVitalSignUpdate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_doctor_owns_patient(doctor, data.patient_id, db)

    record = db.query(PatientVitalSigns).filter(
        PatientVitalSigns.patient_id == data.patient_id,
        PatientVitalSigns.vital_sign_id == data.vital_sign_id,
        PatientVitalSigns.measurement_date == data.measurement_date
    ).first()

    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"No vital sign record found for patient_id={data.patient_id}, vital_sign_id={data.vital_sign_id}, date={data.measurement_date}"
        )

    record.value = data.new_value
    db.commit()
    db.refresh(record)

    return {
        "message": "Vital sign updated",
        "record": {
            "patient_id": record.patient_id,
            "vital_sign_id": record.vital_sign_id,
            "measurement_date": record.measurement_date,
            "new_value": record.value
        }
    }

@vital_signs_router.get(
    "/vital-signs",
    summary="List all vital signs for the logged-in doctor",
    description="Returns all vital sign entries for all patients assigned to the doctor",
    status_code=200
)
def list_all_vital_signs_for_doctor(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    patient_ids = db.query(DoctorPatient.patient_id).filter_by(doctor_id=doctor.id).subquery()
    return db.query(PatientVitalSigns).filter(PatientVitalSigns.patient_id.in_(patient_ids)).all()

@vital_signs_router.get(
    "/vital-signs/by-patient/{patient_id}",
    summary="List vital signs for a specific patient",
    status_code=200
)
def get_vitals_by_patient_id(
        patient_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_doctor_owns_patient(doctor, patient_id, db)
    return db.query(PatientVitalSigns).filter(PatientVitalSigns.patient_id == patient_id).all()

@vital_signs_router.get(
    "/vital-signs/by-vital-sign/{vital_sign_id}",
    summary="List all entries for a vital sign across doctor's patients",
    status_code=200
)
def get_vitals_by_vital_id(
        vital_sign_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    patient_ids = db.query(DoctorPatient.patient_id).filter_by(doctor_id=doctor.id).subquery()
    return db.query(PatientVitalSigns).filter(
        PatientVitalSigns.vital_sign_id == vital_sign_id,
        PatientVitalSigns.patient_id.in_(patient_ids)
    ).all()

# ─── NEW ────────────────────────────────────────────
@vital_signs_router.get(
    "/vital-signs/dict",
    response_model=List[VitalSignDictResponse],
    summary="List all available vital signs"
)
def list_vital_signs_dict(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    return db.query(VitalSignsDict).all()

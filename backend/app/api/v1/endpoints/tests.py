from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import exists
from typing import List
from core.deps import get_db
from core.deps_doctor import get_current_doctor
from models.patient import Patient
from models.tests_dict import TestsDict
from models.patient_tests import PatientTests
from models.doctor_patient import DoctorPatient
from models.tests_schema import PatientTestCreate, PatientTestDelete, PatientTestUpdate, TestsDictResponse
from models.doctor import Doctor

tests_router = APIRouter()

def ensure_patient_belongs_to_doctor(db: Session, doctor: Doctor, patient_id: int):
    link = db.query(DoctorPatient).filter_by(doctor_id=doctor.id, patient_id=patient_id).first()
    if not link:
        raise HTTPException(status_code=403, detail="Patient is not assigned to the logged-in doctor")

@tests_router.post("/tests", status_code=201)
def add_patient_test(
        data: PatientTestCreate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_patient_belongs_to_doctor(db, doctor, data.patient_id)

    if not db.query(exists().where(Patient.patient_id == data.patient_id)).scalar():
        raise HTTPException(status_code=404, detail=f"Patient ID {data.patient_id} not found")

    if not db.query(exists().where(TestsDict.id == data.test_id)).scalar():
        raise HTTPException(status_code=404, detail=f"Test ID {data.test_id} not found")

    duplicate = db.query(PatientTests).filter_by(
        patient_id=data.patient_id,
        test_id=data.test_id,
        test_date=data.test_date
    ).first()
    if duplicate:
        raise HTTPException(status_code=400, detail="Test already recorded for this patient and date.")

    record = PatientTests(
        patient_id=data.patient_id,
        test_id=data.test_id,
        test_date=data.test_date,
        result_value=data.result_value,
        notes=data.notes
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return {
        "message": "Patient test added successfully",
        "record": {
            "patient_id": record.patient_id,
            "test_id": record.test_id,
            "test_date": record.test_date,
            "result_value": record.result_value,
            "notes": record.notes
        }
    }

@tests_router.delete("/tests", status_code=200)
def delete_patient_test(
        data: PatientTestDelete,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_patient_belongs_to_doctor(db, doctor, data.patient_id)

    record = db.query(PatientTests).filter_by(
        patient_id=data.patient_id,
        test_id=data.test_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Test not found for given patient.")

    db.delete(record)
    db.commit()
    return {"message": "Patient test deleted successfully"}

@tests_router.put("/tests", status_code=200)
def update_patient_test(
        data: PatientTestUpdate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_patient_belongs_to_doctor(db, doctor, data.patient_id)

    record = db.query(PatientTests).filter_by(
        patient_id=data.patient_id,
        test_id=data.test_id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Test not found for given patient.")

    if data.new_result_value is not None:
        record.result_value = data.new_result_value

    if data.new_notes is not None:
        record.notes = data.new_notes

    db.commit()
    db.refresh(record)

    return {
        "message": "Patient test updated successfully",
        "record": {
            "patient_id": record.patient_id,
            "test_id": record.test_id,
            "test_date": record.test_date,
            "result_value": record.result_value,
            "notes": record.notes
        }
    }

@tests_router.get("/tests", status_code=200)
def get_all_patient_tests(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    # Limit to patients owned by doctor
    patient_ids = db.query(DoctorPatient.patient_id).filter_by(doctor_id=doctor.id).subquery()
    return db.query(PatientTests).filter(PatientTests.patient_id.in_(patient_ids)).all()

@tests_router.get("/tests/by-patient/{patient_id}", status_code=200)
def get_tests_by_patient_id(
        patient_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_patient_belongs_to_doctor(db, doctor, patient_id)

    results = db.query(PatientTests).filter(PatientTests.patient_id == patient_id).all()
    if not results:
        raise HTTPException(status_code=404, detail=f"No tests found for patient ID {patient_id}")
    return results

@tests_router.get("/tests/by-test/{test_id}", status_code=200)
def get_tests_by_test_id(
        test_id: str,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    # Limit to tests for patients assigned to this doctor
    patient_ids = db.query(DoctorPatient.patient_id).filter_by(doctor_id=doctor.id).subquery()
    results = db.query(PatientTests).filter(
        PatientTests.test_id == test_id,
        PatientTests.patient_id.in_(patient_ids)
    ).all()

    if not results:
        raise HTTPException(status_code=404, detail=f"No test records found for test ID '{test_id}'")
    return results

@tests_router.get(
    "/tests/dict",
    response_model=List[TestsDictResponse],
    summary="List all available tests"
)
def list_tests_dict(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    return db.query(TestsDict).all()
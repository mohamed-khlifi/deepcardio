from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from datetime import datetime, date, timezone
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import exists
from backend.app.models.symptoms_schema import PatientSymptomCreate, PatientSymptomResponse, SymptomDictResponse
from backend.app.models.patient_symptom import PatientSymptom
from backend.app.models.patient import Patient
from backend.app.models.symptom_dict import SymptomDict
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.doctor import Doctor
from backend.app.models.audit_log import AuditLog
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.services.patient_service import auto_populate_patient_summary_data
from backend.app.core.config import SessionLocal

symptoms_router = APIRouter(prefix="/symptoms", tags=["symptoms"])

def ensure_doctor_owns_patient(doctor: Doctor, patient_id: int, db: Session):
    link = db.query(DoctorPatient).filter_by(doctor_id=doctor.id, patient_id=patient_id).first()
    if not link:
        raise HTTPException(status_code=403, detail="This patient is not assigned to you")

def background_auto_populate(patient_id: int, doctor_id: int):
    # Create a new session for the background task
    db_background = SessionLocal()
    try:
        auto_populate_patient_summary_data(db_background, patient_id, doctor_id)
    finally:
        db_background.close()

@symptoms_router.post(
    "",
    response_model=PatientSymptomResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Patient Symptom",
    description="Adds a symptom record for a patient with a timestamp."
)
def add_patient_symptom(
        data: PatientSymptomCreate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        ensure_doctor_owns_patient(doctor, data.patient_id, db)

        if not db.query(exists().where(Patient.patient_id == data.patient_id)).scalar():
            raise HTTPException(status_code=404, detail=f"Patient with ID {data.patient_id} not found")

        symptom_dict = db.query(SymptomDict).filter(SymptomDict.symptom_id == data.symptom_id).first()
        if not symptom_dict:
            raise HTTPException(status_code=404, detail=f"Symptom with ID {data.symptom_id} not found")

        # Check if an active symptom record already exists
        existing_symptom = db.query(PatientSymptom).filter(
            PatientSymptom.patient_id == data.patient_id,
            PatientSymptom.symptom_id == data.symptom_id,
            PatientSymptom.resolved_at.is_(None)
        ).first()

        if existing_symptom:
            raise HTTPException(status_code=409, detail="Symptom already active for this patient.")

        # Handle onset_date - convert string to date if needed, or use current date if not provided
        onset_date = data.onset_date
        if onset_date is None:
            onset_date = date.today()
        elif isinstance(onset_date, str):
            try:
                onset_date = datetime.strptime(onset_date, '%Y-%m-%d').date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid onset_date format. Expected YYYY-MM-DD")

        new_symptom = PatientSymptom(
            patient_id=data.patient_id,
            symptom_id=data.symptom_id,
            onset_date=onset_date,
            recorded_at=datetime.now(timezone.utc)
        )
        db.add(new_symptom)
        db.commit()
        db.refresh(new_symptom)

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'CREATE',
            'SYMPTOM',
            new_symptom.patient_id,
            f"Added symptom '{symptom_dict.name}' for patient {new_symptom.patient_id}",
            {'symptom_id': new_symptom.symptom_id, 'onset_date': new_symptom.onset_date.isoformat() if new_symptom.onset_date else None}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, data.patient_id, doctor.id)

        return PatientSymptomResponse.from_orm(new_symptom)
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"Error in add_patient_symptom: {str(e)}")  # Add logging for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@symptoms_router.delete(
    "/{symptom_record_id}",
    response_model=PatientSymptomResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve Patient Symptom",
    description="Marks a symptom record as resolved for a patient using the symptom record ID."
)
def resolve_patient_symptom(
        symptom_record_id: int,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Get the symptom record
        symptom_record = db.query(PatientSymptom).filter(PatientSymptom.id == symptom_record_id).first()
        if not symptom_record:
            raise HTTPException(status_code=404, detail="Symptom record not found")

        # Ensure doctor owns the patient
        ensure_doctor_owns_patient(doctor, symptom_record.patient_id, db)

        # Mark as resolved
        symptom_record.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(symptom_record)

        # Get symptom name for audit log
        symptom_dict = db.query(SymptomDict).filter(SymptomDict.symptom_id == symptom_record.symptom_id).first()
        symptom_name = symptom_dict.name if symptom_dict else f"Symptom ID {symptom_record.symptom_id}"

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'DELETE',
            'SYMPTOM',
            symptom_record.patient_id,
            f"Resolved symptom '{symptom_name}' for patient {symptom_record.patient_id}",
            {'symptom_id': symptom_record.symptom_id, 'resolved_at': symptom_record.resolved_at.isoformat()}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, symptom_record.patient_id, doctor.id)

        return PatientSymptomResponse.from_orm(symptom_record)
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@symptoms_router.delete(
    "/delete/{symptom_record_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Patient Symptom",
    description="Permanently deletes a symptom record for a patient using the symptom record ID."
)
def delete_patient_symptom(
        symptom_record_id: int,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Get the symptom record
        symptom_record = db.query(PatientSymptom).filter(PatientSymptom.id == symptom_record_id).first()
        if not symptom_record:
            raise HTTPException(status_code=404, detail="Symptom record not found")

        # Ensure doctor owns the patient
        ensure_doctor_owns_patient(doctor, symptom_record.patient_id, db)

        # Get symptom name for audit log before deletion
        symptom_dict = db.query(SymptomDict).filter(SymptomDict.symptom_id == symptom_record.symptom_id).first()
        symptom_name = symptom_dict.name if symptom_dict else f"Symptom_id {symptom_record.symptom_id}"

        # Store patient_id for background task
        patient_id = symptom_record.patient_id

        # Store symptom_id for audit log before deletion
        symptom_id_for_audit = symptom_record.symptom_id
        
        # Delete the record
        db.delete(symptom_record)
        db.commit()

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'DELETE',
            'SYMPTOM',
            patient_id,
            f"Deleted symptom '{symptom_name}' for patient {patient_id}",
            {'symptom_id': symptom_id_for_audit}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, patient_id, doctor.id)

        # Return success response since the record is deleted
        return {"message": "Symptom deleted successfully", "symptom_id": symptom_id_for_audit}
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@symptoms_router.get(
    "",
    response_model=List[PatientSymptomResponse],
    summary="List all patient symptoms for the logged-in doctor",
    status_code=200
)
def list_all_symptoms_for_doctor(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    return db.query(PatientSymptom).all()

@symptoms_router.get(
    "/by-patient/{patient_id}",
    response_model=List[PatientSymptomResponse],
    summary="List patient symptoms",
    description="Get all symptom records for a specific patient",
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
    "/by-symptom/{symptom_id}",
    response_model=List[PatientSymptomResponse],
    summary="List all patient records for a specific symptom (doctor-owned only)",
    status_code=200
)
def get_symptoms_by_symptom_id(
        symptom_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    # Get all patients assigned to this doctor
    doctor_patients = db.query(DoctorPatient).filter(DoctorPatient.doctor_id == doctor.id).all()
    patient_ids = [dp.patient_id for dp in doctor_patients]
    
    # Get symptoms for those patients with the specified symptom_id
    return db.query(PatientSymptom).filter(
        PatientSymptom.patient_id.in_(patient_ids),
        PatientSymptom.symptom_id == symptom_id
    ).all()

@symptoms_router.get(
    "/dict",
    response_model=List[SymptomDictResponse],
    summary="List all available symptoms (dictionary)",
    status_code=200
)
def list_symptom_dict(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    return db.query(SymptomDict).all()
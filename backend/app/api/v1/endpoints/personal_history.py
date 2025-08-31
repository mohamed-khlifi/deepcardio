from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from datetime import datetime, date, timezone
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import exists
from backend.app.models.patient_personal_history import PatientPersonalHistory
from backend.app.models.personal_history_dict import PersonalHistoryDict
from backend.app.models.personal_history_schema import PatientHistoryCreate, PatientHistoryResponse, PersonalHistoryDictResponse
from backend.app.models.patient import Patient
from backend.app.models.doctor import Doctor
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.audit_log import AuditLog
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.services.patient_service import auto_populate_patient_summary_data
from backend.app.core.config import SessionLocal

personal_history_router = APIRouter(prefix="/personal-history", tags=["personal-history"])

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

@personal_history_router.post(
    "",
    response_model=PatientHistoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Patient Personal History",
    description="Adds a personal history record for a patient with a timestamp."
)
def add_patient_history(
        data: PatientHistoryCreate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        ensure_doctor_owns_patient(doctor, data.patient_id, db)

        if not db.query(exists().where(Patient.patient_id == data.patient_id)).scalar():
            raise HTTPException(status_code=404, detail=f"Patient with ID {data.patient_id} not found")

        history_dict = db.query(PersonalHistoryDict).filter(PersonalHistoryDict.id == data.history_id).first()
        if not history_dict:
            raise HTTPException(status_code=404, detail=f"Personal history item with ID {data.history_id} not found")

        # Check if an active history record already exists
        existing_history = db.query(PatientPersonalHistory).filter(
            PatientPersonalHistory.patient_id == data.patient_id,
            PatientPersonalHistory.history_id == data.history_id,
            PatientPersonalHistory.resolved_at.is_(None)
        ).first()

        if existing_history:
            raise HTTPException(status_code=409, detail="Personal history item already active for this patient.")

        # Handle date_recorded - convert string to date if needed, or use current date if not provided
        date_recorded = data.date_recorded
        if date_recorded is None:
            date_recorded = date.today()
        elif isinstance(date_recorded, str):
            try:
                date_recorded = datetime.strptime(date_recorded, '%Y-%m-%d').date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date_recorded format. Expected YYYY-MM-DD")

        new_history = PatientPersonalHistory(
            patient_id=data.patient_id,
            history_id=data.history_id,
            date_recorded=date_recorded,
            recorded_at=datetime.now(timezone.utc)
        )
        db.add(new_history)
        db.commit()
        db.refresh(new_history)

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'CREATE',
            'PERSONAL_HISTORY',
            new_history.patient_id,
            f"Added personal history '{history_dict.name}' for patient {new_history.patient_id}",
            {'history_id': new_history.history_id, 'date_recorded': new_history.date_recorded.isoformat() if new_history.date_recorded else None}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, data.patient_id, doctor.id)

        return PatientHistoryResponse.from_orm(new_history)
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"Error in add_patient_history: {str(e)}")  # Add logging for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@personal_history_router.delete(
    "/{history_record_id}",
    response_model=PatientHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve Patient Personal History",
    description="Marks a personal history record as resolved for a patient using the history record ID."
)
def resolve_patient_history(
        history_record_id: int,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Get the history record
        history_record = db.query(PatientPersonalHistory).filter(PatientPersonalHistory.id == history_record_id).first()
        if not history_record:
            raise HTTPException(status_code=404, detail="Personal history record not found")

        # Ensure doctor owns the patient
        ensure_doctor_owns_patient(doctor, history_record.patient_id, db)

        # Mark as resolved
        history_record.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(history_record)

        # Get history name for audit log
        history_dict = db.query(PersonalHistoryDict).filter(PersonalHistoryDict.id == history_record.history_id).first()
        history_name = history_dict.name if history_dict else f"History ID {history_record.history_id}"

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'DELETE',
            'PERSONAL_HISTORY',
            history_record.patient_id,
            f"Resolved personal history '{history_name}' for patient {history_record.patient_id}",
            {'history_id': history_record.history_id, 'resolved_at': history_record.resolved_at.isoformat()}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, history_record.patient_id, doctor.id)

        return PatientHistoryResponse.from_orm(history_record)
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"Error in resolve_patient_history: {str(e)}")  # Add logging for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@personal_history_router.delete(
    "/delete/{history_record_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Patient Personal History",
    description="Permanently deletes a personal history record for a patient using the history record ID."
)
def delete_patient_history(
        history_record_id: int,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Get the history record
        history_record = db.query(PatientPersonalHistory).filter(PatientPersonalHistory.id == history_record_id).first()
        if not history_record:
            raise HTTPException(status_code=404, detail="Personal history record not found")

        # Ensure doctor owns the patient
        ensure_doctor_owns_patient(doctor, history_record.patient_id, db)

        # Get history name for audit log before deletion
        history_dict = db.query(PersonalHistoryDict).filter(PersonalHistoryDict.id == history_record.history_id).first()
        history_name = history_dict.name if history_dict else f"History ID {history_record.history_id}"

        # Store patient_id for background task
        patient_id = history_record.patient_id

        # Store history_id for audit log before deletion
        history_id_for_audit = history_record.history_id
        
        # Delete the record
        db.delete(history_record)
        db.commit()

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'DELETE',
            'PERSONAL_HISTORY',
            patient_id,
            f"Deleted personal history '{history_name}' for patient {patient_id}",
            {'history_id': history_id_for_audit}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, patient_id, doctor.id)

        # Return success response since the record is deleted
        return {"message": "Personal history deleted successfully", "history_id": history_id_for_audit}
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"Error in delete_patient_history: {str(e)}")  # Add logging for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@personal_history_router.get(
    "",
    response_model=List[PatientHistoryResponse],
    summary="List all patient personal history for the logged-in doctor",
    status_code=200
)
def list_all_history_for_doctor(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    return db.query(PatientPersonalHistory).all()

@personal_history_router.get(
    "/by-patient/{patient_id}",
    response_model=List[PatientHistoryResponse],
    summary="List patient personal history",
    description="Get all personal history records for a specific patient",
    status_code=200
)
def get_history_by_patient(
        patient_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_doctor_owns_patient(doctor, patient_id, db)
    return db.query(PatientPersonalHistory).filter(PatientPersonalHistory.patient_id == patient_id).all()

@personal_history_router.get(
    "/dict",
    response_model=List[PersonalHistoryDictResponse],
    summary="List all available personal history items (dictionary)",
    status_code=200
)
def list_history_dict(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    return db.query(PersonalHistoryDict).all()
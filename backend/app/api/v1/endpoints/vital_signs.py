from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import exists
from typing import List
from datetime import datetime, date, timezone
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.models.patient import Patient
from backend.app.models.vital_signs_dict import VitalSignsDict
from backend.app.models.patient_vital_signs import PatientVitalSigns
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.vital_signs_schema import PatientVitalSignCreate, PatientVitalSignUpdate, PatientVitalSignDelete, PatientVitalSignResponse, VitalSignDictResponse
from backend.app.models.doctor import Doctor
from backend.app.models.audit_log import AuditLog
from backend.app.services.patient_service import auto_populate_patient_summary_data
from backend.app.core.config import SessionLocal

vital_signs_router = APIRouter(prefix="/vital-signs", tags=["vital-signs"])

def ensure_patient_belongs_to_doctor(db: Session, doctor: Doctor, patient_id: int):
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

@vital_signs_router.post(
    "",
    response_model=PatientVitalSignResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Patient Vital Sign",
    description="Records a new vital sign for a patient with a timestamp."
)
def add_vital_sign(
        data: PatientVitalSignCreate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        ensure_patient_belongs_to_doctor(db, doctor, data.patient_id)

        if not db.query(exists().where(Patient.patient_id == data.patient_id)).scalar():
            raise HTTPException(status_code=404, detail=f"Patient with ID {data.patient_id} not found")

        vital_sign_dict = db.query(VitalSignsDict).filter(VitalSignsDict.vital_sign_id == data.vital_sign_id).first()
        if not vital_sign_dict:
            raise HTTPException(status_code=404, detail=f"Vital sign with ID {data.vital_sign_id} not found")

        # Handle measurement_date - convert string to date if needed, or use current date if not provided
        measurement_date = data.measurement_date
        if measurement_date is None:
            measurement_date = date.today()
        elif isinstance(measurement_date, str):
            try:
                measurement_date = datetime.strptime(measurement_date, '%Y-%m-%d').date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid measurement_date format. Expected YYYY-MM-DD")

        new_vital_sign = PatientVitalSigns(
            patient_id=data.patient_id,
            vital_sign_id=data.vital_sign_id,
            value=data.value,
            measurement_date=measurement_date,
            recorded_at=datetime.now(timezone.utc)
        )
        db.add(new_vital_sign)
        db.commit()
        db.refresh(new_vital_sign)

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'CREATE',
            'VITAL_SIGN',
            new_vital_sign.patient_id,
            f"Added vital sign '{vital_sign_dict.name}' with value '{data.value}' for patient {new_vital_sign.patient_id}",
            {'vital_sign_id': new_vital_sign.vital_sign_id, 'value': data.value, 'measurement_date': new_vital_sign.measurement_date.isoformat() if new_vital_sign.measurement_date else None}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, data.patient_id, doctor.id)

        return PatientVitalSignResponse.from_orm(new_vital_sign)
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"Error in add_vital_sign: {str(e)}")  # Add logging for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@vital_signs_router.delete(
    "/{vital_sign_record_id}",
    response_model=PatientVitalSignResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve Patient Vital Sign",
    description="Marks a vital sign record as resolved using the record ID."
)
def resolve_vital_sign(
        vital_sign_record_id: int,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Get the vital sign record
        vital_sign_record = db.query(PatientVitalSigns).filter(PatientVitalSigns.id == vital_sign_record_id).first()
        if not vital_sign_record:
            raise HTTPException(status_code=404, detail="Vital sign record not found")

        # Ensure doctor owns the patient
        ensure_patient_belongs_to_doctor(db, doctor, vital_sign_record.patient_id)

        # Mark as resolved
        vital_sign_record.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(vital_sign_record)

        # Get vital sign name for audit log
        vital_sign_dict = db.query(VitalSignsDict).filter(VitalSignsDict.vital_sign_id == vital_sign_record.vital_sign_id).first()
        vital_sign_name = vital_sign_dict.name if vital_sign_dict else f"Vital Sign ID {vital_sign_record.vital_sign_id}"

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'DELETE',
            'VITAL_SIGN',
            vital_sign_record.patient_id,
            f"Resolved vital sign '{vital_sign_name}' for patient {vital_sign_record.patient_id}",
            {'vital_sign_id': vital_sign_record.vital_sign_id, 'resolved_at': vital_sign_record.resolved_at.isoformat()}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, vital_sign_record.patient_id, doctor.id)

        return PatientVitalSignResponse.from_orm(vital_sign_record)
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"Error in resolve_vital_sign: {str(e)}")  # Add logging for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@vital_signs_router.delete(
    "/delete/{vital_sign_record_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Patient Vital Sign",
    description="Permanently deletes a vital sign record for a patient using the record ID."
)
def delete_vital_sign(
        vital_sign_record_id: int,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Get the vital sign record
        vital_sign_record = db.query(PatientVitalSigns).filter(PatientVitalSigns.id == vital_sign_record_id).first()
        if not vital_sign_record:
            raise HTTPException(status_code=404, detail="Vital sign record not found")

        # Ensure doctor owns the patient
        ensure_patient_belongs_to_doctor(db, doctor, vital_sign_record.patient_id)

        # Get vital sign name for audit log before deletion
        vital_sign_dict = db.query(VitalSignsDict).filter(VitalSignsDict.vital_sign_id == vital_sign_record.vital_sign_id).first()
        vital_sign_name = vital_sign_dict.name if vital_sign_dict else f"Vital Sign ID {vital_sign_record.vital_sign_id}"

        # Store patient_id for background task
        patient_id = vital_sign_record.patient_id

        # Store vital_sign_id for audit log before deletion
        vital_sign_id_for_audit = vital_sign_record.vital_sign_id
        
        # Delete the record
        db.delete(vital_sign_record)
        db.commit()

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'DELETE',
            'VITAL_SIGN',
            patient_id,
            f"Deleted vital sign '{vital_sign_name}' for patient {patient_id}",
            {'vital_sign_id': vital_sign_id_for_audit}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, patient_id, doctor.id)

        # Return success response since the record is deleted
        return {"message": "Vital sign deleted successfully", "vital_sign_id": vital_sign_id_for_audit}
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"Error in delete_vital_sign: {str(e)}")  # Add logging for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@vital_signs_router.put(
    "/{vital_sign_record_id}",
    response_model=PatientVitalSignResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Patient Vital Sign",
    description="Updates the value and/or measurement date of a vital sign record."
)
def update_vital_sign(
        vital_sign_record_id: int,
        data: PatientVitalSignUpdate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Get the vital sign record
        vital_sign_record = db.query(PatientVitalSigns).filter(PatientVitalSigns.id == vital_sign_record_id).first()
        if not vital_sign_record:
            raise HTTPException(status_code=404, detail="Vital sign record not found")

        # Ensure doctor owns the patient
        ensure_patient_belongs_to_doctor(db, doctor, vital_sign_record.patient_id)

        # Store old values for audit log
        old_value = vital_sign_record.value
        old_measurement_date = vital_sign_record.measurement_date

        # Update fields if provided
        if data.new_value is not None:
            vital_sign_record.value = data.new_value
        if data.new_measurement_date is not None:
            # Handle new_measurement_date - convert string to date if needed
            new_measurement_date = data.new_measurement_date
            if isinstance(new_measurement_date, str):
                try:
                    new_measurement_date = datetime.strptime(new_measurement_date, '%Y-%m-%d').date()
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid new_measurement_date format. Expected YYYY-MM-DD")
            vital_sign_record.measurement_date = new_measurement_date

        db.commit()
        db.refresh(vital_sign_record)

        # Get vital sign name for audit log
        vital_sign_dict = db.query(VitalSignsDict).filter(VitalSignsDict.vital_sign_id == vital_sign_record.vital_sign_id).first()
        vital_sign_name = vital_sign_dict.name if vital_sign_dict else f"Vital Sign ID {vital_sign_record.vital_sign_id}"

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'UPDATE',
            'VITAL_SIGN',
            vital_sign_record.patient_id,
            f"Updated vital sign '{vital_sign_name}' for patient {vital_sign_record.patient_id}",
            {
                'vital_sign_id': vital_sign_record.vital_sign_id,
                'old_values': {'value': old_value, 'measurement_date': old_measurement_date.isoformat() if old_measurement_date else None},
                'new_values': {'value': vital_sign_record.value, 'measurement_date': vital_sign_record.measurement_date.isoformat() if vital_sign_record.measurement_date else None}
            }
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, vital_sign_record.patient_id, doctor.id)

        return PatientVitalSignResponse.from_orm(vital_sign_record)
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@vital_signs_router.get(
    "",
    response_model=List[PatientVitalSignResponse],
    status_code=status.HTTP_200_OK,
    summary="Get All Patient Vital Signs",
    description="Retrieve all vital sign records for patients assigned to the doctor."
)
def get_all_vital_signs(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    return db.query(PatientVitalSigns).all()

@vital_signs_router.get(
    "/by-patient/{patient_id}",
    response_model=List[PatientVitalSignResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Vital Signs by Patient ID",
    description="Retrieve all vital sign records for a specific patient."
)
def get_vital_signs_by_patient_id(
        patient_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_patient_belongs_to_doctor(db, doctor, patient_id)
    return db.query(PatientVitalSigns).filter(PatientVitalSigns.patient_id == patient_id).all()

@vital_signs_router.get(
    "/by-vital-sign/{vital_sign_id}",
    response_model=List[PatientVitalSignResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Vital Signs by Vital Sign ID",
    description="Retrieve all vital sign records for a specific vital sign ID for patients assigned to the doctor."
)
def get_vital_signs_by_vital_sign_id(
        vital_sign_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    # Get all patients assigned to this doctor
    doctor_patients = db.query(DoctorPatient).filter(DoctorPatient.doctor_id == doctor.id).all()
    patient_ids = [dp.patient_id for dp in doctor_patients]
    
    # Get vital signs for those patients with the specified vital_sign_id
    return db.query(PatientVitalSigns).filter(
        PatientVitalSigns.patient_id.in_(patient_ids),
        PatientVitalSigns.vital_sign_id == vital_sign_id
    ).all()

@vital_signs_router.get(
    "/dict",
    response_model=List[VitalSignDictResponse],
    status_code=status.HTTP_200_OK,
    summary="List All Available Vital Signs",
    description="Retrieve all available vital signs from the dictionary."
)
def list_vital_signs_dict(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    return db.query(VitalSignsDict).all()
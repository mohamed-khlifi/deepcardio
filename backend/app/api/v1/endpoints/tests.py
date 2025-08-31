from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import exists, func
from typing import List
from datetime import datetime, date, timezone
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.models.patient import Patient
from backend.app.models.tests_dict import TestsDict
from backend.app.models.patient_tests import PatientTests
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.tests_schema import PatientTestCreate, PatientTestDelete, PatientTestUpdate, PatientTestResponse, TestsDictResponse
from backend.app.models.doctor import Doctor
from backend.app.models.audit_log import AuditLog
from backend.app.services.patient_service import auto_populate_patient_summary_data
from backend.app.core.config import SessionLocal

tests_router = APIRouter(prefix="/tests", tags=["tests"])

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

@tests_router.post(
    "",
    response_model=PatientTestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Patient Test",
    description="Records a new test result for a patient with a timestamp."
)
def add_patient_test(
        data: PatientTestCreate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        ensure_patient_belongs_to_doctor(db, doctor, data.patient_id)

        if not db.query(exists().where(Patient.patient_id == data.patient_id)).scalar():
            raise HTTPException(status_code=404, detail=f"Patient with ID {data.patient_id} not found")

        test_dict = db.query(TestsDict).filter(TestsDict.id == data.test_id).first()
        if not test_dict:
            raise HTTPException(status_code=404, detail=f"Test with ID {data.test_id} not found")

        # Handle test_date - convert string to date if needed, or use current date if not provided
        test_date = data.test_date
        if test_date is None:
            test_date = date.today()
        elif isinstance(test_date, str):
            try:
                test_date = datetime.strptime(test_date, '%Y-%m-%d').date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid test_date format. Expected YYYY-MM-DD")

        new_test = PatientTests(
            patient_id=data.patient_id,
            test_id=data.test_id,
            test_date=test_date,
            result_value=data.result_value,
            notes=data.notes,
            recorded_at=datetime.now(timezone.utc)
        )
        db.add(new_test)
        db.commit()
        db.refresh(new_test)

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'CREATE',
            'TEST',
            new_test.patient_id,
            f"Added test '{test_dict.name}' with result '{data.result_value}' for patient {new_test.patient_id}",
            {'test_id': new_test.test_id, 'result_value': data.result_value, 'test_date': new_test.test_date.isoformat() if new_test.test_date else None, 'notes': data.notes}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, data.patient_id, doctor.id)

        return PatientTestResponse.from_orm(new_test)
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"Error in add_patient_test: {str(e)}")  # Add logging for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@tests_router.delete(
    "/{test_record_id}",
    response_model=PatientTestResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve Patient Test",
    description="Marks a test record as resolved using the record ID."
)
def resolve_patient_test(
        test_record_id: int,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Get the test record
        test_record = db.query(PatientTests).filter(PatientTests.id == test_record_id).first()
        if not test_record:
            raise HTTPException(status_code=404, detail="Test record not found")

        # Ensure doctor owns the patient
        ensure_patient_belongs_to_doctor(db, doctor, test_record.patient_id)

        # Mark as resolved
        test_record.resolved_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(test_record)

        # Get test name for audit log
        test_dict = db.query(TestsDict).filter(TestsDict.id == test_record.test_id).first()
        test_name = test_dict.name if test_dict else f"Test ID {test_record.test_id}"

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'DELETE',
            'TEST',
            test_record.patient_id,
            f"Resolved test '{test_name}' for patient {test_record.patient_id}",
            {'test_id': test_record.test_id, 'resolved_at': test_record.resolved_at.isoformat()}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, test_record.patient_id, doctor.id)

        return PatientTestResponse.from_orm(test_record)
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"Error in resolve_patient_test: {str(e)}")  # Add logging for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@tests_router.delete(
    "/delete/{test_record_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Patient Test",
    description="Permanently deletes a test record for a patient using the record ID."
)
def delete_patient_test(
        test_record_id: int,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Get the test record
        test_record = db.query(PatientTests).filter(PatientTests.id == test_record_id).first()
        if not test_record:
            raise HTTPException(status_code=404, detail="Test record not found")

        # Ensure doctor owns the patient
        ensure_patient_belongs_to_doctor(db, doctor, test_record.patient_id)

        # Get test name for audit log before deletion
        test_dict = db.query(TestsDict).filter(TestsDict.id == test_record.test_id).first()
        test_name = test_dict.name if test_dict else f"Test ID {test_record.test_id}"

        # Store patient_id for background task
        patient_id = test_record.patient_id

        # Store test_id for audit log before deletion
        test_id_for_audit = test_record.test_id
        
        # Delete the record
        db.delete(test_record)
        db.commit()

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'DELETE',
            'TEST',
            patient_id,
            f"Deleted test '{test_name}' for patient {patient_id}",
            {'test_id': test_id_for_audit}
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, patient_id, doctor.id)

        # Return success response since the record is deleted
        return {"message": "Test deleted successfully", "test_id": test_id_for_audit}
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        print(f"Error in delete_patient_test: {str(e)}")  # Add logging for debugging
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@tests_router.put(
    "/{test_record_id}",
    response_model=PatientTestResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Patient Test",
    description="Updates the result value, notes, and/or test date of a test record."
)
def update_patient_test(
        test_record_id: int,
        data: PatientTestUpdate,
        background_tasks: BackgroundTasks,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Get the test record
        test_record = db.query(PatientTests).filter(PatientTests.id == test_record_id).first()
        if not test_record:
            raise HTTPException(status_code=404, detail="Test record not found")

        # Ensure doctor owns the patient
        ensure_patient_belongs_to_doctor(db, doctor, test_record.patient_id)

        # Store old values for audit log
        old_result_value = test_record.result_value
        old_notes = test_record.notes
        old_test_date = test_record.test_date

        # Update fields if provided
        if data.new_result_value is not None:
            test_record.result_value = data.new_result_value
        if data.new_notes is not None:
            test_record.notes = data.new_notes
        if data.new_test_date is not None:
            # Handle new_test_date - convert string to date if needed
            new_test_date = data.new_test_date
            if isinstance(new_test_date, str):
                try:
                    new_test_date = datetime.strptime(new_test_date, '%Y-%m-%d').date()
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid new_test_date format. Expected YYYY-MM-DD")
            test_record.test_date = new_test_date

        db.commit()
        db.refresh(test_record)

        # Get test name for audit log
        test_dict = db.query(TestsDict).filter(TestsDict.id == test_record.test_id).first()
        test_name = test_dict.name if test_dict else f"Test ID {test_record.test_id}"

        # Log audit event
        AuditLog.log_event(
            db,
            doctor.id,
            'UPDATE',
            'TEST',
            test_record.patient_id,
            f"Updated test '{test_name}' for patient {test_record.patient_id}",
            {
                'test_id': test_record.test_id,
                'old_values': {
                    'result_value': old_result_value,
                    'notes': old_notes,
                    'test_date': old_test_date.isoformat() if old_test_date else None
                },
                'new_values': {
                    'result_value': test_record.result_value,
                    'notes': test_record.notes,
                    'test_date': test_record.test_date.isoformat() if test_record.test_date else None
                }
            }
        )

        # Add background task for auto-population (non-blocking)
        background_tasks.add_task(background_auto_populate, test_record.patient_id, doctor.id)

        return PatientTestResponse.from_orm(test_record)
    except HTTPException as e:
        db.rollback()
        raise e
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@tests_router.get(
    "",
    response_model=List[PatientTestResponse],
    status_code=status.HTTP_200_OK,
    summary="Get All Patient Tests",
    description="Retrieve all test records for patients assigned to the doctor."
)
def get_all_patient_tests(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    return db.query(PatientTests).all()

@tests_router.get(
    "/by-patient/{patient_id}",
    response_model=List[PatientTestResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Tests by Patient ID",
    description="Retrieve the most recent test records for a specific patient, one per test type."
)
def get_tests_by_patient_id(
        patient_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    ensure_patient_belongs_to_doctor(db, doctor, patient_id)
    
    # Subquery to get the most recent record for each test_id
    subquery = (
        db.query(
            PatientTests.patient_id,
            PatientTests.test_id,
            func.max(PatientTests.recorded_at).label('max_recorded_at')
        )
        .filter(PatientTests.patient_id == patient_id)
        .group_by(PatientTests.patient_id, PatientTests.test_id)
        .subquery()
    )

    # Main query to join with subquery and get full records
    results = (
        db.query(PatientTests)
        .join(
            subquery,
            (PatientTests.patient_id == subquery.c.patient_id) &
            (PatientTests.test_id == subquery.c.test_id) &
            (PatientTests.recorded_at == subquery.c.max_recorded_at)
        )
        .filter(PatientTests.patient_id == patient_id)
        .all()
    )
    
    return results

@tests_router.get(
    "/by-test/{test_id}",
    response_model=List[PatientTestResponse],
    status_code=status.HTTP_200_OK,
    summary="Get Tests by Test ID",
    description="Retrieve all test records for a specific test ID for patients assigned to the doctor."
)
def get_tests_by_test_id(
        test_id: str,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    # Get all patients assigned to this doctor
    doctor_patients = db.query(DoctorPatient).filter(DoctorPatient.doctor_id == doctor.id).all()
    patient_ids = [dp.patient_id for dp in doctor_patients]
    
    # Get tests for those patients with the specified test_id
    return db.query(PatientTests).filter(
        PatientTests.patient_id.in_(patient_ids),
        PatientTests.test_id == test_id
    ).all()

@tests_router.get(
    "/dict",
    response_model=List[TestsDictResponse],
    status_code=status.HTTP_200_OK,
    summary="List All Available Tests",
    description="Retrieve all available tests from the dictionary."
)
def list_tests_dict(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    return db.query(TestsDict).all()
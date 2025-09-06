# File: app/api/v1/endpoints/appointments.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List
from datetime import date, datetime

from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.models import Patient
from backend.app.models.doctor import Doctor
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.appointment import Appointment
from backend.app.models.audit_log import AuditLog
from backend.app.models.appointment_schema import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
    AppointmentToday,
)

appointments_router = APIRouter(prefix="/appointments", tags=["appointments"])

def ensure_patient_belongs_to_doctor(db: Session, doctor: Doctor, patient_id: int):
    link = (
        db.query(DoctorPatient)
        .filter_by(doctor_id=doctor.id, patient_id=patient_id)
        .first()
    )
    if not link:
        raise HTTPException(status_code=403, detail="Patient not assigned to you")

@appointments_router.post(
    "",
    response_model=AppointmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an appointment",
)
def create_appointment(
        data: AppointmentCreate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    ensure_patient_belongs_to_doctor(db, doctor, data.patient_id)
    appt = Appointment(**data.model_dump())  # Pydantic v2 method
    db.add(appt)
    db.commit()
    db.refresh(appt)

    # Fetch patient for audit log description
    patient = db.query(Patient).filter(Patient.patient_id == data.patient_id).first()
    patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown Patient"

    # Log the creation in audit_logs
    audit_log = AuditLog(
        patient_id=data.patient_id,
        doctor_id=doctor.id,
        action_type="CREATE",
        entity_type="APPOINTMENT",
        action_details={
            "appointment_id": appt.id,
            "patient_id": appt.patient_id,
            "datetime": str(appt.datetime),
            "type": appt.type
        },
        description=f"Created appointment for {patient_name}",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()

    return appt

@appointments_router.get(
    "",
    response_model=List[AppointmentResponse],
    summary="List all appointments for this doctor's patients",
)
def list_appointments(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    patient_ids = (
        db.query(DoctorPatient.patient_id)
        .filter_by(doctor_id=doctor.id)
        .subquery()
    )
    appts = (
        db.query(Appointment)
        .filter(Appointment.patient_id.in_(patient_ids))
        .order_by(Appointment.datetime)
        .all()
    )
    return appts

@appointments_router.get(
    "/by-patient/{patient_id}",
    response_model=List[AppointmentResponse],
    summary="List appointments for a specific patient",
)
def get_appointments_by_patient(
        patient_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    ensure_patient_belongs_to_doctor(db, doctor, patient_id)
    return (
        db.query(Appointment)
        .filter(Appointment.patient_id == patient_id)
        .order_by(Appointment.datetime)
        .all()
    )

@appointments_router.put(
    "/{id}",
    response_model=AppointmentResponse,
    summary="Update an appointment",
)
def update_appointment(
        id: int,
        data: AppointmentUpdate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    appt = db.query(Appointment).get(id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    ensure_patient_belongs_to_doctor(db, doctor, appt.patient_id)

    # Capture old values for audit log
    old_values = {
        "appointment_id": appt.id,
        "patient_id": appt.patient_id,
        "datetime": str(appt.datetime),
        "type": appt.type
    }

    # Update appointment fields
    update_data = data.model_dump(exclude_none=True)
    for field, val in update_data.items():
        setattr(appt, field, val)
    db.commit()
    db.refresh(appt)

    # Fetch patient for audit log description
    patient = db.query(Patient).filter(Patient.patient_id == appt.patient_id).first()
    patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown Patient"

    # Log the update in audit_logs
    new_values = {
        "appointment_id": appt.id,
        "patient_id": appt.patient_id,
        "datetime": str(appt.datetime),
        "type": appt.type
    }
    audit_log = AuditLog(
        patient_id=appt.patient_id,
        doctor_id=doctor.id,
        action_type="UPDATE",
        entity_type="APPOINTMENT",
        action_details={
            "old_values": old_values,
            "new_values": new_values
        },
        description=f"Updated appointment for {patient_name}",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)
    db.commit()

    return appt

@appointments_router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an appointment",
)
def delete_appointment(
        id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    appt = db.query(Appointment).get(id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    ensure_patient_belongs_to_doctor(db, doctor, appt.patient_id)

    # Capture appointment details for audit log
    appt_details = {
        "appointment_id": appt.id,
        "patient_id": appt.patient_id,
        "datetime": str(appt.datetime),
        "type": appt.type
    }

    # Fetch patient for audit log description
    patient = db.query(Patient).filter(Patient.patient_id == appt.patient_id).first()
    patient_name = f"{patient.first_name} {patient.last_name}" if patient else "Unknown Patient"

    # Log the deletion in audit_logs
    audit_log = AuditLog(
        patient_id=appt.patient_id,
        doctor_id=doctor.id,
        action_type="DELETE",
        entity_type="APPOINTMENT",
        action_details=appt_details,
        description=f"Deleted appointment for {patient_name}",
        created_at=datetime.utcnow()
    )
    db.add(audit_log)

    db.delete(appt)
    db.commit()

@appointments_router.get(
    "/today",
    response_model=List[AppointmentToday],
    summary="Get this doctor's appointments scheduled for today (with patient names)",
)
def read_todays_appointments(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    """
    Returns all appointments for the logged-in doctor that fall on today's date.
    Each record includes appointment.id, patient_id, datetime, type,
    patient_first_name and patient_last_name.
    """
    # 1) Find all patient_ids that belong to this doctor:
    subq = db.query(DoctorPatient.patient_id).filter_by(doctor_id=doctor.id).subquery()

    # 2) Use func.date(...) == date.today() to compare only the date portion:
    today_date = date.today()

    rows = (
        db.query(
            Appointment.id,
            Appointment.patient_id,
            Appointment.datetime,
            Appointment.type,
            Patient.first_name.label("patient_first_name"),
            Patient.last_name.label("patient_last_name"),
        )
        .join(Patient, Patient.patient_id == Appointment.patient_id)
        .filter(Appointment.patient_id.in_(subq))
        .filter(func.date(Appointment.datetime) == today_date)
        .order_by(Appointment.datetime)
        .all()
    )

    # Convert each row into a dict for Pydantic
    result = [
        {
            "id": r.id,
            "patient_id": r.patient_id,
            "datetime": r.datetime,
            "type": r.type,
            "patient_first_name": r.patient_first_name,
            "patient_last_name": r.patient_last_name,
        }
        for r in rows
    ]
    return result

@appointments_router.get(
    "/range",
    response_model=List[AppointmentToday],
    summary="Get this doctor's appointments for a date range (with patient names)",
)
def read_appointments_by_range(
        start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
        end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    """
    Returns all appointments for the logged-in doctor within the specified date range.
    Each record includes appointment.id, patient_id, datetime, type,
    patient_first_name and patient_last_name.
    """
    # 1) Find all patient_ids that belong to this doctor:
    subq = db.query(DoctorPatient.patient_id).filter_by(doctor_id=doctor.id).subquery()

    rows = (
        db.query(
            Appointment.id,
            Appointment.patient_id,
            Appointment.datetime,
            Appointment.type,
            Patient.first_name.label("patient_first_name"),
            Patient.last_name.label("patient_last_name"),
        )
        .join(Patient, Patient.patient_id == Appointment.patient_id)
        .filter(Appointment.patient_id.in_(subq))
        .filter(func.date(Appointment.datetime) >= start_date)
        .filter(func.date(Appointment.datetime) <= end_date)
        .order_by(Appointment.datetime)
        .all()
    )

    # Convert each row into a dict for Pydantic
    result = [
        {
            "id": r.id,
            "patient_id": r.patient_id,
            "datetime": r.datetime,
            "type": r.type,
            "patient_first_name": r.patient_first_name,
            "patient_last_name": r.patient_last_name,
        }
        for r in rows
    ]
    return result
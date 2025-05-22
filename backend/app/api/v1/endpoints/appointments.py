# File: app/api/v1/endpoints/appointments.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from core.deps import get_db
from core.deps_doctor import get_current_doctor
from models.doctor import Doctor
from models.doctor_patient import DoctorPatient
from models.appointment import Appointment
from models.appointment_schema import (
    AppointmentCreate,
    AppointmentUpdate,
    AppointmentResponse,
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
    update_data = data.model_dump(exclude_none=True)
    for field, val in update_data.items():
        setattr(appt, field, val)
    db.commit()
    db.refresh(appt)
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
    db.delete(appt)
    db.commit()

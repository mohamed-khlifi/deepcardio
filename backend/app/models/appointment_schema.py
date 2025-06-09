# File: models/appointment_schema.py
from pydantic import BaseModel
from datetime import datetime

class AppointmentBase(BaseModel):
    patient_id: int
    datetime: datetime
    type: str

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentUpdate(BaseModel):
    # Make both fields *required* on update
    datetime: datetime
    type: str

class AppointmentResponse(AppointmentBase):
    id: int

    class Config:
        from_attributes = True

class AppointmentToday(BaseModel):
    id: int
    patient_id: int
    datetime: datetime
    type: str
    patient_first_name: str
    patient_last_name: str

    class Config:
        from_attributes = True
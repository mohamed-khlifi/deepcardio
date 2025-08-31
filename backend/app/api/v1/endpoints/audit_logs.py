from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from enum import Enum
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.models.doctor import Doctor
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.audit_log import AuditLog
import datetime

audit_logs_router = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])

# Pydantic models
class ActionType(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"

class EntityType(str, Enum):
    PATIENT = "PATIENT"
    SYMPTOM = "SYMPTOM"
    PERSONAL_HISTORY = "PERSONAL_HISTORY"
    VITAL_SIGN = "VITAL_SIGN"
    TEST = "TEST"
    APPOINTMENT = "APPOINTMENT"
    FOLLOW_UP_ACTION = "FOLLOW_UP_ACTION"

class AuditLogResponse(BaseModel):
    id: int
    patient_id: int
    doctor_id: int
    action_type: ActionType
    entity_type: EntityType
    action_details: dict
    description: Optional[str]
    created_at: datetime.datetime

    class Config:
        from_attributes = True

@audit_logs_router.get(
    "",
    response_model=List[AuditLogResponse],
    summary="Retrieve audit logs for doctor's patients",
    description="Get audit logs filtered by patient ID, doctor ID, action type, or entity type. Only returns logs for patients assigned to the logged-in doctor."
)
def get_audit_logs(
        patient_id: Optional[int] = Query(None, description="Filter by patient ID"),
        action_type: Optional[ActionType] = Query(None, description="Filter by action type (CREATE, UPDATE, DELETE)"),
        entity_type: Optional[EntityType] = Query(None, description="Filter by entity type"),
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    # Restrict to patients assigned to the logged-in doctor
    patient_ids = db.query(DoctorPatient.patient_id).filter_by(doctor_id=doctor.id).subquery()

    query = db.query(AuditLog).filter(AuditLog.patient_id.in_(patient_ids))

    # Apply filters
    if patient_id is not None:
        query = query.filter(AuditLog.patient_id == patient_id)
    if action_type is not None:
        query = query.filter(AuditLog.action_type == action_type)
    if entity_type is not None:
        query = query.filter(AuditLog.entity_type == entity_type)

    # Order by most recent first
    query = query.order_by(AuditLog.created_at.desc())

    logs = query.all()

    if not logs:
        raise HTTPException(status_code=404, detail="No audit logs found")

    return logs
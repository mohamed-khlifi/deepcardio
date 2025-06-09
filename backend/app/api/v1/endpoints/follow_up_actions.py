# File: backend/app/api/v1/endpoints/follow_up_actions.py

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from core.deps import get_db
from core.deps_doctor import get_current_doctor
from models import DoctorPatient
from models.doctor import Doctor
from models.patient import Patient
from models.patient_schema import FollowUpAction as FollowUpActionOut
from pydantic import BaseModel, constr

router = APIRouter(
    prefix="/follow-up-actions",
    tags=["Follow-up Actions"],
)

#
# ─── Pydantic SCHEMAS for Create / Update ─────────────────────────────────
#

class FollowUpActionCreate(BaseModel):
    patient_id: int
    action: str
    follow_up_interval: constr(max_length=50) | None = None

class FollowUpActionUpdate(BaseModel):
    action: str
    follow_up_interval: constr(max_length=50) | None = None


#
# ────────────────────────────────────────────────────────────────────────────
#  1) Create a new follow-up action FOR A SPECIFIC PATIENT (store in JSON)
# ────────────────────────────────────────────────────────────────────────────
@router.post(
    "",
    response_model=FollowUpActionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_action(
        data: FollowUpActionCreate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    """
    Create a new follow-up action.  We append it into Patient.extra_summary["follow_up_actions"].
    The client must supply:
      - patient_id (int)
      - action (str)
      - follow_up_interval (optional)
    """
    # 1) Verify this patient exists and belongs to the current doctor:
    patient = (
        db.query(Patient)
        .join("doctor_patients", Patient.patient_id == DoctorPatient.patient_id)
        .filter(
            Patient.patient_id == data.patient_id,
            DoctorPatient.doctor_id == doctor.id
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=403, detail="Patient not found or not assigned to you")

    # 2) Read the current JSON array:
    raw_extra: dict = patient.extra_summary or {}
    followups: List[dict] = raw_extra.get("follow_up_actions", [])

    # 3) Compute a new “id” for this follow-up action.
    #    We use a simple scheme: 1 + max(existing IDs), or 1 if none exist.
    existing_ids = [item["id"] for item in followups]
    new_id = max(existing_ids) + 1 if existing_ids else 1

    # 4) Build the new JSON entry:
    new_item = {
        "id": new_id,
        "action": data.action,
        "interval": data.follow_up_interval or "",
    }
    followups.append(new_item)

    # 5) Write the updated JSON back into extra_summary:
    raw_extra["follow_up_actions"] = followups
    patient.extra_summary = raw_extra
    db.commit()
    db.refresh(patient)

    # 6) Return the newly‐created follow‐up action:
    return FollowUpActionOut(
        id=new_item["id"],
        action=new_item["action"],
        interval=new_item["interval"],
    )


#
# ────────────────────────────────────────────────────────────────────────────
#  2) List all follow-up actions for one patient (read JSON array)
# ────────────────────────────────────────────────────────────────────────────
@router.get(
    "/by-patient/{patient_id}",
    response_model=List[FollowUpActionOut],
)
def list_actions(
        patient_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    """
    Return all follow‐up actions for a given patient_id, read from
    patient.extra_summary["follow_up_actions"].
    """
    patient = (
        db.query(Patient)
        .join("doctor_patients", Patient.patient_id == DoctorPatient.patient_id)
        .filter(
            Patient.patient_id == patient_id,
            DoctorPatient.doctor_id == doctor.id
        )
        .first()
    )
    if not patient:
        raise HTTPException(status_code=403, detail="Patient not found or not assigned to you")

    raw_extra: dict = patient.extra_summary or {}
    followups: List[dict] = raw_extra.get("follow_up_actions", [])

    # Convert each JSON dict → Pydantic schema
    return [
        FollowUpActionOut(
            id=item["id"],
            action=item["action"],
            interval=item.get("interval", ""),
        )
        for item in followups
    ]


#
# ────────────────────────────────────────────────────────────────────────────
#  3) Update one follow-up action (action text / interval), in JSON
# ────────────────────────────────────────────────────────────────────────────
@router.put(
    "/{action_id}",
    response_model=FollowUpActionOut,
)
def update_action(
        action_id: int,
        data: FollowUpActionUpdate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    """
    Patch an existing follow-up action.  We locate it inside
    the patient.extra_summary["follow_up_actions"] array by matching {"id": action_id}.
    Then we overwrite its "action" and/or "interval" fields.
    """
    # 1) We need to find which patient (if any) has this follow-up‐action in its JSON.
    #    One strategy: scan each patient owned by this doctor and look inside its JSON.
    #    (If you know the patient_id, you can pass that as a query parameter instead.)
    patient = (
        db.query(Patient)
        .join("doctor_patients", Patient.patient_id == DoctorPatient.patient_id)
        .filter(DoctorPatient.doctor_id == doctor.id)
        .all()
    )
    # We’ll scan through each patient’s extra_summary until we find this action_id.
    target_patient = None
    for p in patient:
        raw_extra: dict = p.extra_summary or {}
        followups: List[dict] = raw_extra.get("follow_up_actions", [])
        if any(item["id"] == action_id for item in followups):
            target_patient = p
            break

    if not target_patient:
        raise HTTPException(status_code=404, detail="Follow‐up action not found")

    # 2) Mutate that JSON array in memory:
    raw_extra: dict = target_patient.extra_summary or {}
    followups: List[dict] = raw_extra.get("follow_up_actions", [])
    updated_followups = []
    found = False
    for item in followups:
        if item["id"] == action_id:
            # Overwrite the fields
            item["action"] = data.action
            item["interval"] = data.follow_up_interval or ""
            found = True
        updated_followups.append(item)

    if not found:
        raise HTTPException(status_code=404, detail="Follow‐up action not found")

    # 3) Write back the modified JSON array:
    raw_extra["follow_up_actions"] = updated_followups
    target_patient.extra_summary = raw_extra
    db.commit()
    db.refresh(target_patient)

    # 4) Return the updated action
    for item in updated_followups:
        if item["id"] == action_id:
            return FollowUpActionOut(
                id=item["id"],
                action=item["action"],
                interval=item["interval"],
            )

    # (should never reach here)
    raise HTTPException(status_code=500, detail="Unknown error updating follow‐up action")


#
# ────────────────────────────────────────────────────────────────────────────
#  4) Delete one follow-up action (remove from JSON)
# ────────────────────────────────────────────────────────────────────────────
@router.delete("/{action_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action(
        action_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    """
    Delete a follow‐up action (by “id”) from patient.extra_summary["follow_up_actions"].
    """
    # 1) Find the patient that owns this action_id
    patient = (
        db.query(Patient)
        .join("doctor_patients", Patient.patient_id == DoctorPatient.patient_id)
        .filter(DoctorPatient.doctor_id == doctor.id)
        .all()
    )
    target_patient = None
    for p in patient:
        raw_extra: dict = p.extra_summary or {}
        followups: List[dict] = raw_extra.get("follow_up_actions", [])
        if any(item["id"] == action_id for item in followups):
            target_patient = p
            break

    if not target_patient:
        raise HTTPException(status_code=404, detail="Follow‐up action not found")

    # 2) Filter out the matching item
    raw_extra: dict = target_patient.extra_summary or {}
    followups: List[dict] = raw_extra.get("follow_up_actions", [])
    remaining = [item for item in followups if item["id"] != action_id]

    # 3) Write back the filtered JSON array
    raw_extra["follow_up_actions"] = remaining
    target_patient.extra_summary = raw_extra
    db.commit()

    return None

# backend/app/crud/crud_follow_up_action.py

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from models.patient_follow_up_action import PatientFollowUpAction
from models.follow_up_action_schema import (
    FollowUpActionCreate,
    FollowUpActionUpdate,
    FollowUpActionOut,
)


def create(db: Session, data: FollowUpActionCreate) -> FollowUpActionOut:
    """
    Insert a new PatientFollowUpAction row and return it as Pydantic.
    """
    db_obj = PatientFollowUpAction(
        patient_id=data.patient_id,
        action=data.action,
        follow_up_interval=data.follow_up_interval,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return FollowUpActionOut.from_orm(db_obj)


def get_by_patient(db: Session, patient_id: int) -> list[FollowUpActionOut]:
    """
    Return all follow-up actions for a given patient_id.
    """
    rows = (
        db.query(PatientFollowUpAction)
        .filter(PatientFollowUpAction.patient_id == patient_id)
        .order_by(PatientFollowUpAction.id.asc())
        .all()
    )
    return [FollowUpActionOut.from_orm(r) for r in rows]


def get(db: Session, action_id: int) -> PatientFollowUpAction | None:
    """
    Return the SQLAlchemy object for one action_id, or None if it doesn’t exist.
    """
    return (
        db.query(PatientFollowUpAction)
        .filter(PatientFollowUpAction.id == action_id)
        .first()
    )


def update(
        db: Session,
        db_obj: PatientFollowUpAction,
        data: FollowUpActionUpdate
) -> FollowUpActionOut:
    """
    Patch an existing PatientFollowUpAction: update 'action' and/or 'follow_up_interval'.
    """
    if data.action is not None:
        db_obj.action = data.action
    if data.follow_up_interval is not None:
        db_obj.follow_up_interval = data.follow_up_interval

    db.commit()
    db.refresh(db_obj)
    return FollowUpActionOut.from_orm(db_obj)


def remove(db: Session, action_id: int) -> None:
    """
    Delete that row by primary key.
    """
    obj = (
        db.query(PatientFollowUpAction)
        .filter(PatientFollowUpAction.id == action_id)
        .first()
    )
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")
    db.delete(obj)
    db.commit()
    return None

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.patient_follow_up_action import PatientFollowUpAction
from backend.app.models.follow_up_actions_catalog import FollowUpActionCatalog
from backend.app.models.patient import Patient
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.doctor import Doctor
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from pydantic import BaseModel

follow_up_actions_router = APIRouter(prefix="/follow-up-actions", tags=["Follow-up Actions"])

class FollowUpActionUpdate(BaseModel):
    action: str
    follow_up_interval: str | None = None
    patient_id: int

@follow_up_actions_router.put(
    "/{action_id}",
    status_code=status.HTTP_200_OK,
    summary="Update a Follow-up Action",
    description="Updates an existing follow-up action for a patient or converts a catalog item to a patient-specific item."
)
def update_follow_up_action(
    action_id: int,
    data: FollowUpActionUpdate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check if this is a catalog item (ID >= 10000)
        if action_id >= 10000:
            # This is a catalog item, we need to find the corresponding auto-generated item in patient_follow_up_actions
            catalog_id = action_id - 10000
            
            # Get the catalog item to find the matching auto-generated item
            catalog_item = db.query(FollowUpActionCatalog).filter(
                FollowUpActionCatalog.id == catalog_id
            ).first()
            
            if not catalog_item:
                raise HTTPException(status_code=404, detail="Catalog item not found")
            
            # Verify the patient belongs to this doctor
            patient = db.query(Patient).filter(Patient.patient_id == data.patient_id).first()
            if not patient:
                raise HTTPException(status_code=404, detail="Patient not found")
            
            # Check if doctor has access to this patient
            doctor_patient_relation = db.query(DoctorPatient).filter(
                DoctorPatient.doctor_id == doctor.id,
                DoctorPatient.patient_id == data.patient_id
            ).first()
            if not doctor_patient_relation:
                raise HTTPException(status_code=403, detail="Access denied to this patient")
            
            # Find the existing auto-generated item in patient_follow_up_actions
            existing_auto_generated = db.query(PatientFollowUpAction).filter(
                PatientFollowUpAction.patient_id == data.patient_id,
                PatientFollowUpAction.doctor_id == doctor.id,
                PatientFollowUpAction.action == catalog_item.action,
                PatientFollowUpAction.follow_up_interval == catalog_item.interval,
                PatientFollowUpAction.auto_generated == True
            ).first()
            
            if existing_auto_generated:
                # Update the existing auto-generated item in place
                existing_auto_generated.action = data.action
                existing_auto_generated.follow_up_interval = data.follow_up_interval
                existing_auto_generated.auto_generated = False  # Convert to user-owned
                
                db.commit()
                db.refresh(existing_auto_generated)
                
                return {
                    "id": existing_auto_generated.id,
                    "action": existing_auto_generated.action,
                    "follow_up_interval": existing_auto_generated.follow_up_interval,
                    "auto_generated": existing_auto_generated.auto_generated
                }
            else:
                # If no auto-generated item found, create a new user-owned item
                new_follow_up_action = PatientFollowUpAction(
                    action=data.action,
                    follow_up_interval=data.follow_up_interval,
                    patient_id=data.patient_id,
                    doctor_id=doctor.id,
                    auto_generated=False
                )
                
                db.add(new_follow_up_action)
                db.commit()
                db.refresh(new_follow_up_action)
                
                return {
                    "id": new_follow_up_action.id,
                    "action": new_follow_up_action.action,
                    "follow_up_interval": new_follow_up_action.follow_up_interval,
                    "auto_generated": new_follow_up_action.auto_generated
                }
        
        else:
            # This is a regular patient-specific item
            action = db.query(PatientFollowUpAction).filter(PatientFollowUpAction.id == action_id).first()
            if not action:
                raise HTTPException(status_code=404, detail="Follow-up action not found")

            if action.doctor_id != doctor.id:
                raise HTTPException(status_code=403, detail="Not authorized to update this action")

            # Check if content actually changed (smart editing) - normalize whitespace
            old_action = (action.action or "").strip()
            new_action = (data.action or "").strip()
            old_interval = (action.follow_up_interval or "").strip()
            new_interval = (data.follow_up_interval or "").strip()
            
            content_changed = (old_action != new_action or old_interval != new_interval)
            
            # If content changed and item was auto-generated, convert to user-owned
            if content_changed and action.auto_generated:
                action.auto_generated = False
                print(f"[SMART EDIT] Content changed: '{old_action}' -> '{new_action}' or '{old_interval}' -> '{new_interval}', removing auto_generated flag")
            
            action.action = data.action
            action.follow_up_interval = data.follow_up_interval
            action.patient_id = data.patient_id
            db.commit()
            db.refresh(action)
            return {
                "id": action.id,
                "action": action.action,
                "follow_up_interval": action.follow_up_interval,
                "auto_generated": action.auto_generated
            }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@follow_up_actions_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Add a Follow-up Action",
    description="Adds a new follow-up action for a patient."
)
def add_follow_up_action(
    data: FollowUpActionUpdate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check for duplicate action with same action and interval
        existing_action = db.query(PatientFollowUpAction).filter(
            PatientFollowUpAction.patient_id == data.patient_id,
            PatientFollowUpAction.doctor_id == doctor.id,
            PatientFollowUpAction.action == data.action,
            PatientFollowUpAction.follow_up_interval == data.follow_up_interval
        ).first()
        
        if existing_action:
            raise HTTPException(
                status_code=400, 
                detail=f"A follow-up action with action '{data.action}' and interval '{data.follow_up_interval}' already exists for this patient."
            )
        
        new_action = PatientFollowUpAction(
            patient_id=data.patient_id,
            doctor_id=doctor.id,
            action=data.action,
            follow_up_interval=data.follow_up_interval,
            auto_generated=False
        )
        db.add(new_action)
        db.commit()
        db.refresh(new_action)
        return {
            "id": new_action.id,
            "action": new_action.action,
            "follow_up_interval": new_action.follow_up_interval,
            "auto_generated": new_action.auto_generated
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@follow_up_actions_router.delete(
    "/{action_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a Follow-up Action",
    description="Deletes a follow-up action for a patient."
)
def delete_follow_up_action(
    action_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        action = db.query(PatientFollowUpAction).filter(PatientFollowUpAction.id == action_id).first()
        if not action:
            raise HTTPException(status_code=404, detail="Follow-up action not found")

        if action.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this action")

        db.delete(action)
        db.commit()
        return {"message": f"Follow-up action ID {action_id} deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@follow_up_actions_router.get(
    "/by-patient/{patient_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Follow-up Actions by Patient ID",
    description="Retrieves all follow-up actions for a specific patient."
)
def get_follow_up_actions_by_patient_id(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        actions = db.query(PatientFollowUpAction).filter(
            PatientFollowUpAction.patient_id == patient_id,
            PatientFollowUpAction.doctor_id == doctor.id
        ).all()
        return actions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
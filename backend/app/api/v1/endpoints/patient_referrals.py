from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.patient_referrals import PatientReferrals
from backend.app.models.referrals_catalog import ReferralsCatalog
from backend.app.models.patient import Patient
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.doctor import Doctor
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.models.patient_referrals_schema import PatientReferralsCreate, PatientReferralsUpdate, PatientReferralsOut

patient_referrals_router = APIRouter(prefix="/patient-referrals", tags=["Patient Referrals"])

@patient_referrals_router.put(
    "/{referral_id}",
    status_code=status.HTTP_200_OK,
    summary="Update a Patient Referral",
    description="Updates an existing referral for a patient."
)
def update_patient_referral(
    referral_id: int,
    data: PatientReferralsUpdate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check if this is a catalog item (ID >= 10000)
        if referral_id >= 10000:
            # This is a catalog item, we need to find the corresponding auto-generated item in patient_referrals
            catalog_id = referral_id - 10000
            
            # Get the catalog item to find the matching auto-generated item
            catalog_item = db.query(ReferralsCatalog).filter(
                ReferralsCatalog.id == catalog_id
            ).first()
            
            if not catalog_item:
                raise HTTPException(status_code=404, detail="Catalog item not found")
            
            # Get patient_id from the request data
            if not data.patient_id:
                raise HTTPException(status_code=400, detail="Patient ID required for catalog item conversion")
            
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
            
            # Find the existing auto-generated item in patient_referrals
            existing_auto_generated = db.query(PatientReferrals).filter(
                PatientReferrals.patient_id == data.patient_id,
                PatientReferrals.doctor_id == doctor.id,
                PatientReferrals.specialist_name == catalog_item.specialist_name,
                PatientReferrals.referral_reason == catalog_item.referral_reason,
                PatientReferrals.auto_generated == True
            ).first()
            
            if existing_auto_generated:
                # Update the existing auto-generated item in place
                existing_auto_generated.specialist_name = data.specialist_name if data.specialist_name is not None else catalog_item.specialist_name
                existing_auto_generated.referral_reason = data.referral_reason if data.referral_reason is not None else catalog_item.referral_reason
                existing_auto_generated.auto_generated = False  # Convert to user-owned
                
                db.commit()
                db.refresh(existing_auto_generated)
                
                return {
                    "id": existing_auto_generated.id,
                    "specialist_name": existing_auto_generated.specialist_name,
                    "referral_reason": existing_auto_generated.referral_reason,
                    "auto_generated": existing_auto_generated.auto_generated
                }
            else:
                # If no auto-generated item found, create a new user-owned item
                new_referral = PatientReferrals(
                    specialist_name=data.specialist_name if data.specialist_name is not None else catalog_item.specialist_name,
                    referral_reason=data.referral_reason if data.referral_reason is not None else catalog_item.referral_reason,
                    patient_id=data.patient_id,
                    doctor_id=doctor.id,
                    auto_generated=False
                )
                
                db.add(new_referral)
                db.commit()
                db.refresh(new_referral)
                
                return {
                    "id": new_referral.id,
                    "specialist_name": new_referral.specialist_name,
                    "referral_reason": new_referral.referral_reason,
                    "auto_generated": new_referral.auto_generated
                }
        
        else:
            # This is a regular patient-specific item
            referral = db.query(PatientReferrals).filter(PatientReferrals.id == referral_id).first()
            if not referral:
                raise HTTPException(status_code=404, detail="Patient referral not found")

            if referral.doctor_id != doctor.id:
                raise HTTPException(status_code=403, detail="Not authorized to update this referral")

            # Check if content actually changed (smart editing) - normalize whitespace
            content_changed = False
            if data.specialist_name is not None:
                old_specialist = (referral.specialist_name or "").strip()
                new_specialist = (data.specialist_name or "").strip()
                if old_specialist != new_specialist:
                    content_changed = True
                referral.specialist_name = data.specialist_name
                
            if data.referral_reason is not None:
                old_reason = (referral.referral_reason or "").strip()
                new_reason = (data.referral_reason or "").strip()
                if old_reason != new_reason:
                    content_changed = True
                referral.referral_reason = data.referral_reason
            
            # If content changed and item was auto-generated, convert to user-owned
            if content_changed and referral.auto_generated:
                referral.auto_generated = False
                print(f"[SMART EDIT] Referral content changed, removing auto_generated flag")
            
            db.commit()
            db.refresh(referral)
            return {
                "id": referral.id,
                "specialist_name": referral.specialist_name,
                "referral_reason": referral.referral_reason,
                "auto_generated": referral.auto_generated
            }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_referrals_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Add a Patient Referral",
    description="Adds a new referral for a patient."
)
def add_patient_referral(
    data: PatientReferralsCreate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check for duplicate referral with same specialist and reason
        existing_referral = db.query(PatientReferrals).filter(
            PatientReferrals.patient_id == data.patient_id,
            PatientReferrals.doctor_id == doctor.id,
            PatientReferrals.specialist_name == data.specialist_name,
            PatientReferrals.referral_reason == data.referral_reason
        ).first()
        
        if existing_referral:
            raise HTTPException(
                status_code=400, 
                detail=f"A referral to '{data.specialist_name}' with reason '{data.referral_reason}' already exists for this patient."
            )
        
        new_referral = PatientReferrals(
            patient_id=data.patient_id,
            doctor_id=doctor.id,
            specialist_name=data.specialist_name,
            referral_reason=data.referral_reason,
            auto_generated=False  # User-created items are not auto-generated
        )
        db.add(new_referral)
        db.commit()
        db.refresh(new_referral)
        return {
            "id": new_referral.id,
            "specialist_name": new_referral.specialist_name,
            "referral_reason": new_referral.referral_reason,
            "patient_id": new_referral.patient_id,
            "auto_generated": new_referral.auto_generated
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_referrals_router.delete(
    "/{referral_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a Patient Referral",
    description="Deletes a referral for a patient."
)
def delete_patient_referral(
    referral_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        referral = db.query(PatientReferrals).filter(PatientReferrals.id == referral_id).first()
        if not referral:
            raise HTTPException(status_code=404, detail="Patient referral not found")

        if referral.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this referral")

        db.delete(referral)
        db.commit()
        return {"message": f"Patient referral ID {referral_id} deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_referrals_router.get(
    "/by-patient/{patient_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Patient Referrals by Patient ID",
    description="Retrieves all referrals for a specific patient."
)
def get_patient_referrals_by_patient_id(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        referrals = db.query(PatientReferrals).filter(
            PatientReferrals.patient_id == patient_id,
            PatientReferrals.doctor_id == doctor.id
        ).all()
        return referrals
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

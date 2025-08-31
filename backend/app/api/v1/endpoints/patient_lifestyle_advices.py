from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.patient_lifestyle_advices import PatientLifestyleAdvices
from backend.app.models.life_style_advices_catalog import LifeStyleAdvicesCatalog
from backend.app.models.patient import Patient
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.doctor import Doctor
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.models.patient_lifestyle_advices_schema import PatientLifestyleAdvicesCreate, PatientLifestyleAdvicesUpdate, PatientLifestyleAdvicesOut

patient_lifestyle_advices_router = APIRouter(prefix="/patient-lifestyle-advices", tags=["Patient Lifestyle Advices"])

@patient_lifestyle_advices_router.put(
    "/{advice_id}",
    status_code=status.HTTP_200_OK,
    summary="Update a Patient Lifestyle Advice",
    description="Updates an existing lifestyle advice for a patient."
)
def update_patient_lifestyle_advice(
    advice_id: int,
    data: PatientLifestyleAdvicesUpdate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check if this is a catalog item (ID >= 10000)
        if advice_id >= 10000:
            # This is a catalog item, we need to find the corresponding auto-generated item in patient_lifestyle_advices
            catalog_id = advice_id - 10000
            
            # Get the catalog item to find the matching auto-generated item
            catalog_item = db.query(LifeStyleAdvicesCatalog).filter(
                LifeStyleAdvicesCatalog.id == catalog_id
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
            
            # Find the existing auto-generated item in patient_lifestyle_advices
            existing_auto_generated = db.query(PatientLifestyleAdvices).filter(
                PatientLifestyleAdvices.patient_id == data.patient_id,
                PatientLifestyleAdvices.doctor_id == doctor.id,
                PatientLifestyleAdvices.life_style_advice == catalog_item.life_style_advice,
                PatientLifestyleAdvices.auto_generated == True
            ).first()
            
            if existing_auto_generated:
                # Update the existing auto-generated item in place
                existing_auto_generated.life_style_advice = data.life_style_advice if data.life_style_advice is not None else catalog_item.life_style_advice
                existing_auto_generated.auto_generated = False  # Convert to user-owned
                
                db.commit()
                db.refresh(existing_auto_generated)
                
                return {
                    "id": existing_auto_generated.id,
                    "life_style_advice": existing_auto_generated.life_style_advice,
                    "auto_generated": existing_auto_generated.auto_generated
                }
            else:
                # If no auto-generated item found, create a new user-owned item
                new_advice = PatientLifestyleAdvices(
                    life_style_advice=data.life_style_advice if data.life_style_advice is not None else catalog_item.life_style_advice,
                    patient_id=data.patient_id,
                    doctor_id=doctor.id,
                    auto_generated=False
                )
                
                db.add(new_advice)
                db.commit()
                db.refresh(new_advice)
                
                return {
                    "id": new_advice.id,
                    "life_style_advice": new_advice.life_style_advice,
                    "auto_generated": new_advice.auto_generated
                }
        
        else:
            # This is a regular patient-specific item
            advice = db.query(PatientLifestyleAdvices).filter(PatientLifestyleAdvices.id == advice_id).first()
            if not advice:
                raise HTTPException(status_code=404, detail="Patient lifestyle advice not found")

            if advice.doctor_id != doctor.id:
                raise HTTPException(status_code=403, detail="Not authorized to update this advice")

            # Check if content actually changed (smart editing) - normalize whitespace
            content_changed = False
            if data.life_style_advice is not None:
                old_advice = (advice.life_style_advice or "").strip()
                new_advice = (data.life_style_advice or "").strip()
                if old_advice != new_advice:
                    content_changed = True
                advice.life_style_advice = data.life_style_advice
            
            # If content changed and item was auto-generated, convert to user-owned
            if content_changed and advice.auto_generated:
                advice.auto_generated = False
                print(f"[SMART EDIT] Lifestyle advice content changed, removing auto_generated flag")
            
            db.commit()
            db.refresh(advice)
            return {
                "id": advice.id,
                "life_style_advice": advice.life_style_advice,
                "auto_generated": advice.auto_generated
            }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_lifestyle_advices_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Add a Patient Lifestyle Advice",
    description="Adds a new lifestyle advice for a patient."
)
def add_patient_lifestyle_advice(
    data: PatientLifestyleAdvicesCreate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check for duplicate lifestyle advice
        existing_advice = db.query(PatientLifestyleAdvices).filter(
            PatientLifestyleAdvices.patient_id == data.patient_id,
            PatientLifestyleAdvices.doctor_id == doctor.id,
            PatientLifestyleAdvices.life_style_advice == data.life_style_advice
        ).first()
        
        if existing_advice:
            raise HTTPException(
                status_code=400, 
                detail=f"A lifestyle advice with text '{data.life_style_advice}' already exists for this patient."
            )
        
        new_advice = PatientLifestyleAdvices(
            patient_id=data.patient_id,
            doctor_id=doctor.id,
            life_style_advice=data.life_style_advice,
            auto_generated=False  # User-created items are not auto-generated
        )
        db.add(new_advice)
        db.commit()
        db.refresh(new_advice)
        return {
            "id": new_advice.id,
            "life_style_advice": new_advice.life_style_advice,
            "patient_id": new_advice.patient_id,
            "auto_generated": new_advice.auto_generated
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_lifestyle_advices_router.delete(
    "/{advice_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a Patient Lifestyle Advice",
    description="Deletes a lifestyle advice for a patient."
)
def delete_patient_lifestyle_advice(
    advice_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        advice = db.query(PatientLifestyleAdvices).filter(PatientLifestyleAdvices.id == advice_id).first()
        if not advice:
            raise HTTPException(status_code=404, detail="Patient lifestyle advice not found")

        if advice.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this advice")

        db.delete(advice)
        db.commit()
        return {"message": f"Patient lifestyle advice ID {advice_id} deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_lifestyle_advices_router.get(
    "/by-patient/{patient_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Patient Lifestyle Advices by Patient ID",
    description="Retrieves all lifestyle advices for a specific patient."
)
def get_patient_lifestyle_advices_by_patient_id(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        advices = db.query(PatientLifestyleAdvices).filter(
            PatientLifestyleAdvices.patient_id == patient_id,
            PatientLifestyleAdvices.doctor_id == doctor.id
        ).all()
        return advices
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

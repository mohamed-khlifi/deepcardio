from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.patient_recommendations import PatientRecommendations
from backend.app.models.recommendations_catalog import RecommendationsCatalog
from backend.app.models.patient import Patient
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.doctor import Doctor
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.models.patient_recommendations_schema import PatientRecommendationsCreate, PatientRecommendationsUpdate, PatientRecommendationsOut

patient_recommendations_router = APIRouter(prefix="/patient-recommendations", tags=["Patient Recommendations"])

@patient_recommendations_router.put(
    "/{recommendation_id}",
    status_code=status.HTTP_200_OK,
    summary="Update a Patient Recommendation",
    description="Updates an existing recommendation for a patient or converts a catalog item to a patient-specific item."
)
def update_patient_recommendation(
    recommendation_id: int,
    data: PatientRecommendationsUpdate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check if this is a catalog item (ID >= 10000)
        if recommendation_id >= 10000:
            # This is a catalog item, we need to find the corresponding auto-generated item in patient_recommendations
            catalog_id = recommendation_id - 10000
            
            # Get the catalog item to find the matching auto-generated item
            catalog_item = db.query(RecommendationsCatalog).filter(
                RecommendationsCatalog.id == catalog_id
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
            
            # Find the existing auto-generated item in patient_recommendations
            existing_auto_generated = db.query(PatientRecommendations).filter(
                PatientRecommendations.patient_id == data.patient_id,
                PatientRecommendations.doctor_id == doctor.id,
                PatientRecommendations.recommendation == catalog_item.recommendation_value,
                PatientRecommendations.auto_generated == True
            ).first()
            
            if existing_auto_generated:
                # Update the existing auto-generated item in place
                existing_auto_generated.recommendation = data.recommendation if data.recommendation is not None else catalog_item.recommendation_value
                existing_auto_generated.auto_generated = False  # Convert to user-owned
                
                db.commit()
                db.refresh(existing_auto_generated)
                
                return {
                    "id": existing_auto_generated.id,
                    "recommendation": existing_auto_generated.recommendation,
                    "auto_generated": existing_auto_generated.auto_generated
                }
            else:
                # If no auto-generated item found, create a new user-owned item
                new_recommendation = PatientRecommendations(
                    recommendation=data.recommendation if data.recommendation is not None else catalog_item.recommendation_value,
                    patient_id=data.patient_id,
                    doctor_id=doctor.id,
                    auto_generated=False  # Catalog conversions are user-created
                )
                
                db.add(new_recommendation)
                db.commit()
                db.refresh(new_recommendation)
                
                return {
                    "id": new_recommendation.id,
                    "recommendation": new_recommendation.recommendation,
                    "auto_generated": new_recommendation.auto_generated
                }
        
        else:
            # This is a regular patient-specific item
            recommendation = db.query(PatientRecommendations).filter(PatientRecommendations.id == recommendation_id).first()
            if not recommendation:
                raise HTTPException(status_code=404, detail="Patient recommendation not found")

            if recommendation.doctor_id != doctor.id:
                raise HTTPException(status_code=403, detail="Not authorized to update this recommendation")

            # Check if content actually changed (smart editing) - normalize whitespace
            if data.recommendation is not None:
                old_rec = (recommendation.recommendation or "").strip()
                new_rec = (data.recommendation or "").strip()
                content_changed = (old_rec != new_rec)
                
                # If content changed and item was auto-generated, convert to user-owned
                if content_changed and recommendation.auto_generated:
                    recommendation.auto_generated = False
                    print(f"[SMART EDIT] Recommendation content changed: '{old_rec[:50]}...' -> '{new_rec[:50]}...', removing auto_generated flag")
                
                recommendation.recommendation = data.recommendation
            
            db.commit()
            db.refresh(recommendation)
            return {
                "id": recommendation.id,
                "recommendation": recommendation.recommendation,
                "auto_generated": recommendation.auto_generated
            }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_recommendations_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Add a Patient Recommendation",
    description="Adds a new recommendation for a patient."
)
def add_patient_recommendation(
    data: PatientRecommendationsCreate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check for duplicate recommendation
        existing_recommendation = db.query(PatientRecommendations).filter(
            PatientRecommendations.patient_id == data.patient_id,
            PatientRecommendations.doctor_id == doctor.id,
            PatientRecommendations.recommendation == data.recommendation
        ).first()
        
        if existing_recommendation:
            raise HTTPException(
                status_code=400, 
                detail=f"A recommendation with text '{data.recommendation}' already exists for this patient."
            )
        
        new_recommendation = PatientRecommendations(
            patient_id=data.patient_id,
            doctor_id=doctor.id,
            recommendation=data.recommendation,
            auto_generated=False  # User-created items are not auto-generated
        )
        db.add(new_recommendation)
        db.commit()
        db.refresh(new_recommendation)
        return {
            "id": new_recommendation.id,
            "recommendation": new_recommendation.recommendation,
            "patient_id": new_recommendation.patient_id,
            "auto_generated": new_recommendation.auto_generated
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_recommendations_router.delete(
    "/{recommendation_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a Patient Recommendation",
    description="Deletes a recommendation for a patient."
)
def delete_patient_recommendation(
    recommendation_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        recommendation = db.query(PatientRecommendations).filter(PatientRecommendations.id == recommendation_id).first()
        if not recommendation:
            raise HTTPException(status_code=404, detail="Patient recommendation not found")

        if recommendation.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this recommendation")

        db.delete(recommendation)
        db.commit()
        return {"message": f"Patient recommendation ID {recommendation_id} deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_recommendations_router.get(
    "/by-patient/{patient_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Patient Recommendations by Patient ID",
    description="Retrieves all recommendations for a specific patient."
)
def get_patient_recommendations_by_patient_id(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        recommendations = db.query(PatientRecommendations).filter(
            PatientRecommendations.patient_id == patient_id,
            PatientRecommendations.doctor_id == doctor.id
        ).all()
        return recommendations
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

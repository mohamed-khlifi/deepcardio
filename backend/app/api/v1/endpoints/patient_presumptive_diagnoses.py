from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.patient_presumptive_diagnoses import PatientPresumptiveDiagnoses
from backend.app.models.presumptive_diagnosis_catalog import PresumptiveDiagnosisCatalog
from backend.app.models.patient import Patient
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.doctor import Doctor
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.models.patient_presumptive_diagnoses_schema import PatientPresumptiveDiagnosesCreate, PatientPresumptiveDiagnosesUpdate, PatientPresumptiveDiagnosesOut

patient_presumptive_diagnoses_router = APIRouter(prefix="/patient-presumptive-diagnoses", tags=["Patient Presumptive Diagnoses"])

@patient_presumptive_diagnoses_router.put(
    "/{diagnosis_id}",
    status_code=status.HTTP_200_OK,
    summary="Update a Patient Presumptive Diagnosis",
    description="Updates an existing presumptive diagnosis for a patient."
)
def update_patient_presumptive_diagnosis(
    diagnosis_id: int,
    data: PatientPresumptiveDiagnosesUpdate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check if this is a catalog item (ID >= 10000)
        if diagnosis_id >= 10000:
            # This is a catalog item, we need to find the corresponding auto-generated item in patient_presumptive_diagnoses
            catalog_id = diagnosis_id - 10000
            
            # Get the catalog item to find the matching auto-generated item
            catalog_item = db.query(PresumptiveDiagnosisCatalog).filter(
                PresumptiveDiagnosisCatalog.id == catalog_id
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
            
            # Find the existing auto-generated item in patient_presumptive_diagnoses
            existing_auto_generated = db.query(PatientPresumptiveDiagnoses).filter(
                PatientPresumptiveDiagnoses.patient_id == data.patient_id,
                PatientPresumptiveDiagnoses.doctor_id == doctor.id,
                PatientPresumptiveDiagnoses.diagnosis_name == catalog_item.diagnosis_name,
                PatientPresumptiveDiagnoses.confidence_level == catalog_item.confidence_level,
                PatientPresumptiveDiagnoses.auto_generated == True
            ).first()
            
            if existing_auto_generated:
                # Update the existing auto-generated item in place
                existing_auto_generated.diagnosis_name = data.diagnosis_name if data.diagnosis_name is not None else catalog_item.diagnosis_name
                existing_auto_generated.confidence_level = data.confidence_level if data.confidence_level is not None else catalog_item.confidence_level
                existing_auto_generated.auto_generated = False  # Convert to user-owned
                
                db.commit()
                db.refresh(existing_auto_generated)
                
                return {
                    "id": existing_auto_generated.id,
                    "diagnosis_name": existing_auto_generated.diagnosis_name,
                    "confidence_level": existing_auto_generated.confidence_level,
                    "auto_generated": existing_auto_generated.auto_generated
                }
            else:
                # If no auto-generated item found, create a new user-owned item
                new_diagnosis = PatientPresumptiveDiagnoses(
                    diagnosis_name=data.diagnosis_name if data.diagnosis_name is not None else catalog_item.diagnosis_name,
                    confidence_level=data.confidence_level if data.confidence_level is not None else catalog_item.confidence_level,
                    patient_id=data.patient_id,
                    doctor_id=doctor.id,
                    auto_generated=False
                )
                
                db.add(new_diagnosis)
                db.commit()
                db.refresh(new_diagnosis)
                
                return {
                    "id": new_diagnosis.id,
                    "diagnosis_name": new_diagnosis.diagnosis_name,
                    "confidence_level": new_diagnosis.confidence_level,
                    "auto_generated": new_diagnosis.auto_generated
                }
        
        else:
            # This is a regular patient-specific item
            diagnosis = db.query(PatientPresumptiveDiagnoses).filter(PatientPresumptiveDiagnoses.id == diagnosis_id).first()
            if not diagnosis:
                raise HTTPException(status_code=404, detail="Patient presumptive diagnosis not found")

            if diagnosis.doctor_id != doctor.id:
                raise HTTPException(status_code=403, detail="Not authorized to update this diagnosis")

            # Check if content actually changed (smart editing) - normalize whitespace
            content_changed = False
            if data.diagnosis_name is not None:
                old_name = (diagnosis.diagnosis_name or "").strip()
                new_name = (data.diagnosis_name or "").strip()
                if old_name != new_name:
                    content_changed = True
                diagnosis.diagnosis_name = data.diagnosis_name
                
            if data.confidence_level is not None:
                old_level = (diagnosis.confidence_level or "").strip()
                new_level = (data.confidence_level or "").strip()
                if old_level != new_level:
                    content_changed = True
                diagnosis.confidence_level = data.confidence_level
            
            # If content changed and item was auto-generated, convert to user-owned
            if content_changed and diagnosis.auto_generated:
                diagnosis.auto_generated = False
                print(f"[SMART EDIT] Diagnosis content changed, removing auto_generated flag")
            
            db.commit()
            db.refresh(diagnosis)
            return {
                "id": diagnosis.id,
                "diagnosis_name": diagnosis.diagnosis_name,
                "confidence_level": diagnosis.confidence_level,
                "auto_generated": diagnosis.auto_generated
            }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_presumptive_diagnoses_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Add a Patient Presumptive Diagnosis",
    description="Adds a new presumptive diagnosis for a patient."
)
def add_patient_presumptive_diagnosis(
    data: PatientPresumptiveDiagnosesCreate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check for duplicate diagnosis with same name and confidence level
        existing_diagnosis = db.query(PatientPresumptiveDiagnoses).filter(
            PatientPresumptiveDiagnoses.patient_id == data.patient_id,
            PatientPresumptiveDiagnoses.doctor_id == doctor.id,
            PatientPresumptiveDiagnoses.diagnosis_name == data.diagnosis_name,
            PatientPresumptiveDiagnoses.confidence_level == data.confidence_level
        ).first()
        
        if existing_diagnosis:
            raise HTTPException(
                status_code=400, 
                detail=f"A presumptive diagnosis '{data.diagnosis_name}' with confidence level '{data.confidence_level}' already exists for this patient."
            )
        
        new_diagnosis = PatientPresumptiveDiagnoses(
            patient_id=data.patient_id,
            doctor_id=doctor.id,
            diagnosis_name=data.diagnosis_name,
            confidence_level=data.confidence_level,
            auto_generated=False  # User-created items are not auto-generated
        )
        db.add(new_diagnosis)
        db.commit()
        db.refresh(new_diagnosis)
        return {
            "id": new_diagnosis.id,
            "diagnosis_name": new_diagnosis.diagnosis_name,
            "confidence_level": new_diagnosis.confidence_level,
            "patient_id": new_diagnosis.patient_id,
            "auto_generated": new_diagnosis.auto_generated
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_presumptive_diagnoses_router.delete(
    "/{diagnosis_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a Patient Presumptive Diagnosis",
    description="Deletes a presumptive diagnosis for a patient."
)
def delete_patient_presumptive_diagnosis(
    diagnosis_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        diagnosis = db.query(PatientPresumptiveDiagnoses).filter(PatientPresumptiveDiagnoses.id == diagnosis_id).first()
        if not diagnosis:
            raise HTTPException(status_code=404, detail="Patient presumptive diagnosis not found")

        if diagnosis.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this diagnosis")

        db.delete(diagnosis)
        db.commit()
        return {"message": f"Patient presumptive diagnosis ID {diagnosis_id} deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_presumptive_diagnoses_router.get(
    "/by-patient/{patient_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Patient Presumptive Diagnoses by Patient ID",
    description="Retrieves all presumptive diagnoses for a specific patient."
)
def get_patient_presumptive_diagnoses_by_patient_id(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        diagnoses = db.query(PatientPresumptiveDiagnoses).filter(
            PatientPresumptiveDiagnoses.patient_id == patient_id,
            PatientPresumptiveDiagnoses.doctor_id == doctor.id
        ).all()
        return diagnoses
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

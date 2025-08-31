from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.patient_prescriptions import PatientPrescriptions
from backend.app.models.patient import Patient
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.doctor import Doctor
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.models.patient_prescriptions_schema import PatientPrescriptionsCreate, PatientPrescriptionsUpdate, PatientPrescriptionsOut

patient_prescriptions_router = APIRouter(prefix="/patient-prescriptions", tags=["Patient Prescriptions"])

@patient_prescriptions_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Add a Patient Prescription",
    description="Adds a new prescription for a patient."
)
def add_patient_prescription(
    data: PatientPrescriptionsCreate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
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
        
        new_prescription = PatientPrescriptions(
            patient_id=data.patient_id,
            doctor_id=doctor.id,
            medicine_name=data.medicine_name,
            dosage=data.dosage,
            frequency=data.frequency,
            duration=data.duration,
            instructions=data.instructions
        )
        
        db.add(new_prescription)
        db.commit()
        db.refresh(new_prescription)
        return {
            "id": new_prescription.id,
            "medicine_name": new_prescription.medicine_name,
            "dosage": new_prescription.dosage,
            "frequency": new_prescription.frequency,
            "duration": new_prescription.duration,
            "instructions": new_prescription.instructions
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@patient_prescriptions_router.put(
    "/{prescription_id}",
    status_code=status.HTTP_200_OK,
    summary="Update a Patient Prescription",
    description="Updates an existing prescription for a patient."
)
def update_patient_prescription(
    prescription_id: int,
    data: PatientPrescriptionsUpdate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        prescription = db.query(PatientPrescriptions).filter(PatientPrescriptions.id == prescription_id).first()
        if not prescription:
            raise HTTPException(status_code=404, detail="Patient prescription not found")

        if prescription.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this prescription")

        if data.medicine_name is not None:
            prescription.medicine_name = data.medicine_name
        if data.dosage is not None:
            prescription.dosage = data.dosage
        if data.frequency is not None:
            prescription.frequency = data.frequency
        if data.duration is not None:
            prescription.duration = data.duration
        if data.instructions is not None:
            prescription.instructions = data.instructions
        
        db.commit()
        db.refresh(prescription)
        return {
            "id": prescription.id,
            "medicine_name": prescription.medicine_name,
            "dosage": prescription.dosage,
            "frequency": prescription.frequency,
            "duration": prescription.duration,
            "instructions": prescription.instructions
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@patient_prescriptions_router.delete(
    "/{prescription_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a Patient Prescription",
    description="Deletes a prescription for a patient."
)
def delete_patient_prescription(
    prescription_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        prescription = db.query(PatientPrescriptions).filter(PatientPrescriptions.id == prescription_id).first()
        if not prescription:
            raise HTTPException(status_code=404, detail="Patient prescription not found")

        if prescription.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this prescription")

        db.delete(prescription)
        db.commit()
        return {"message": f"Patient prescription ID {prescription_id} deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@patient_prescriptions_router.get(
    "/by-patient/{patient_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Patient Prescriptions by Patient ID",
    description="Retrieves all prescriptions for a specific patient."
)
def get_patient_prescriptions_by_patient_id(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Verify the patient belongs to this doctor
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Check if doctor has access to this patient
        doctor_patient_relation = db.query(DoctorPatient).filter(
            DoctorPatient.doctor_id == doctor.id,
            DoctorPatient.patient_id == patient_id
        ).first()
        if not doctor_patient_relation:
            raise HTTPException(status_code=403, detail="Access denied to this patient")
        
        prescriptions = db.query(PatientPrescriptions).filter(
            PatientPrescriptions.patient_id == patient_id,
            PatientPrescriptions.doctor_id == doctor.id
        ).all()
        
        return [
            {
                "id": prescription.id,
                "medicine_name": prescription.medicine_name,
                "dosage": prescription.dosage,
                "frequency": prescription.frequency,
                "duration": prescription.duration,
                "instructions": prescription.instructions,
                "created_at": prescription.created_at.isoformat(),
                "updated_at": prescription.updated_at.isoformat()
            }
            for prescription in prescriptions
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@patient_prescriptions_router.get(
    "/history/{patient_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Prescription History for Patient",
    description="Retrieves prescription history with analytics for a patient."
)
def get_prescription_history(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Verify the patient belongs to this doctor
        patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Check if doctor has access to this patient
        doctor_patient_relation = db.query(DoctorPatient).filter(
            DoctorPatient.doctor_id == doctor.id,
            DoctorPatient.patient_id == patient_id
        ).first()
        if not doctor_patient_relation:
            raise HTTPException(status_code=403, detail="Access denied to this patient")
        
        prescriptions = db.query(PatientPrescriptions).filter(
            PatientPrescriptions.patient_id == patient_id,
            PatientPrescriptions.doctor_id == doctor.id
        ).order_by(PatientPrescriptions.created_at.desc()).all()
        
        # Analyze prescription patterns
        medicine_frequency = {}
        dosage_patterns = {}
        recent_medicines = []
        
        for prescription in prescriptions:
            # Count medicine frequency
            medicine = prescription.medicine_name.lower()
            medicine_frequency[medicine] = medicine_frequency.get(medicine, 0) + 1
            
            # Track dosage patterns
            key = f"{medicine}_{prescription.dosage}"
            dosage_patterns[key] = dosage_patterns.get(key, 0) + 1
            
            # Recent medicines (last 6 months)
            import datetime
            six_months_ago = datetime.datetime.now() - datetime.timedelta(days=180)
            if prescription.created_at >= six_months_ago:
                recent_medicines.append({
                    "medicine_name": prescription.medicine_name,
                    "dosage": prescription.dosage,
                    "frequency": prescription.frequency,
                    "duration": prescription.duration,
                    "created_at": prescription.created_at.isoformat()
                })
        
        # Most prescribed medicines
        most_prescribed = sorted(medicine_frequency.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_prescriptions": len(prescriptions),
            "most_prescribed_medicines": [{"medicine": med, "count": count} for med, count in most_prescribed],
            "recent_prescriptions": recent_medicines,
            "unique_medicines": len(medicine_frequency),
            "prescription_timeline": [
                {
                    "id": prescription.id,
                    "medicine_name": prescription.medicine_name,
                    "dosage": prescription.dosage,
                    "frequency": prescription.frequency,
                    "duration": prescription.duration,
                    "instructions": prescription.instructions,
                    "created_at": prescription.created_at.isoformat(),
                    "updated_at": prescription.updated_at.isoformat()
                }
                for prescription in prescriptions
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

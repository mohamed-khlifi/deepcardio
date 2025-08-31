# File: backend/app/api/v1/endpoints/patient.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.sql import select
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.core.deps_doctor import get_current_doctor
from typing import List, Optional
from backend.app.models import Patient
from backend.app.models.doctor import Doctor
from backend.app.models.audit_log import AuditLog
from backend.app.models.patient_schema import (
    PatientResponse,
    PatientBasic,
    Demographics,
    ContactInfo,
    SocialInfo,
    Symptom,
    PersonalHistory,
    VitalSign,
    PatientTest,
    FollowUpAction,
    Recommendation,
    Referral,
    Risk,
    LifeStyleAdvice,
    PresumptiveDiagnosis,
    TestToOrder,
    PatientCreate,
)
from backend.app.services.patient_service import (
    get_all_patients,
    get_patient_by_id,
    get_patient_symptoms,
    get_patient_personal_history,
    get_patient_vital_signs,
    get_patient_tests,
    get_risks_from_symptoms,
    get_risks_from_personal_history,
    get_risks_from_tests,
    get_risks_from_vital_signs,
)
from backend.app.core.deps import get_db
from typing import List
from datetime import date, datetime
from backend.app.models.patient_follow_up_action import PatientFollowUpAction
from backend.app.models.patient_recommendations import PatientRecommendations
from backend.app.models.patient_referrals import PatientReferrals
from backend.app.models.patient_lifestyle_advices import PatientLifestyleAdvices
from backend.app.models.patient_presumptive_diagnoses import PatientPresumptiveDiagnoses
from backend.app.models.patient_tests_to_order import PatientTestsToOrder

patient_router = APIRouter()

@patient_router.get(
    "/patients/search",
    response_model=List[PatientBasic],
    summary="Search patients by name and/or date of birth",
)
def search_patients(
        first_name: Optional[str] = Query(None),
        last_name: Optional[str] = Query(None),
        dob: Optional[date] = Query(None),
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor),
):
    patient_ids = (
        select(DoctorPatient.patient_id)
        .where(DoctorPatient.doctor_id == doctor.id)
    )

    query = db.query(Patient).filter(Patient.patient_id.in_(patient_ids))

    if first_name:
        query = query.filter(Patient.first_name.ilike(f"{first_name}%"))
    if last_name:
        query = query.filter(Patient.last_name.ilike(f"{last_name}%"))
    if dob:
        query = query.filter(Patient.dob == dob)

    patients = query.all()
    return [
        PatientBasic(
            id=p.patient_id,
            first_name=p.first_name,
            last_name=p.last_name,
            gender=p.gender,
            dob=p.dob
        )
        for p in patients
    ]

def calculate_age(dob: date) -> int:
    today = date.today()
    age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    return age

def map_patient(patient, db: Session, basic: bool = False, doctor_id: int = None) -> PatientResponse:
    if basic:
        return PatientResponse(
            id=patient.patient_id,
            demographics=Demographics(
                first_name=patient.first_name,
                last_name=patient.last_name,
                gender=patient.gender,
                date_of_birth=patient.dob,
                age=calculate_age(patient.dob),
                ethnicity=patient.ethnicity,
                weight=patient.weight,
                height=patient.height,
                smoke=patient.smoke,
                alco=patient.alco,
                active=patient.active
            ),
            contact_info=ContactInfo(
                phone=patient.phone,
                email=patient.email
            ),
            social_info=SocialInfo(
                marital_status=patient.marital_status,
                occupation=patient.occupation,
                insurance_provider=patient.insurance_provider,
                address=patient.address
            ),
            symptoms=[],
            personal_history=[],
            vital_signs=[],
            tests=[],
            follow_up_actions=[],
            recommendations=[],
            referrals=[],
            risks=[],
            life_style_advice=[],
            presumptive_diagnoses=[],
            tests_to_order=[]
        )

    symptoms = get_patient_symptoms(db, patient.patient_id)
    personal_history = get_patient_personal_history(db, patient.patient_id)
    vital_signs_raw = get_patient_vital_signs(db, patient.patient_id)
    patient_tests = get_patient_tests(db, patient.patient_id)

    # Get ALL patient-specific data (both user-created and auto-generated)
    # All items are now stored in patient-specific tables with auto_generated flag
    all_follow_up_actions = db.query(PatientFollowUpAction).filter(PatientFollowUpAction.patient_id == patient.patient_id).all()
    all_recommendations = db.query(PatientRecommendations).filter(PatientRecommendations.patient_id == patient.patient_id).all()
    all_referrals = db.query(PatientReferrals).filter(PatientReferrals.patient_id == patient.patient_id).all()
    all_lifestyle_advices = db.query(PatientLifestyleAdvices).filter(PatientLifestyleAdvices.patient_id == patient.patient_id).all()
    all_presumptive_diagnoses = db.query(PatientPresumptiveDiagnoses).filter(PatientPresumptiveDiagnoses.patient_id == patient.patient_id).all()
    all_tests_to_order = db.query(PatientTestsToOrder).filter(PatientTestsToOrder.patient_id == patient.patient_id).all()

    # Get risks from decision rules (these are still fetched from catalog as they don't have patient-specific tables)
    risks_from_symptoms = get_risks_from_symptoms(db, patient.patient_id)
    risks_from_history = get_risks_from_personal_history(db, patient.patient_id)
    risks_from_tests = get_risks_from_tests(db, patient.patient_id)
    risks_from_vitals = get_risks_from_vital_signs(db, patient.patient_id)

    all_risks = {
        r.id: r for r in risks_from_symptoms
                         + risks_from_history
                         + risks_from_tests
                         + risks_from_vitals
    }.values()

    return PatientResponse(
        id=patient.patient_id,
        demographics=Demographics(
            first_name=patient.first_name,
            last_name=patient.last_name,
            gender=patient.gender,
            date_of_birth=patient.dob,
            age=calculate_age(patient.dob),
            ethnicity=patient.ethnicity,
            weight=patient.weight,
            height=patient.height,
            smoke=patient.smoke,
            alco=patient.alco,
            active=patient.active
        ),
        contact_info=ContactInfo(
            phone=patient.phone,
            email=patient.email
        ),
        social_info=SocialInfo(
            marital_status=patient.marital_status,
            occupation=patient.occupation,
            insurance_provider=patient.insurance_provider,
            address=patient.address
        ),
        symptoms=[
            Symptom(id=s.symptom_id, name=s.name, category=s.category)
            for s in symptoms
        ],
        personal_history=[
            PersonalHistory(id=h.id, name=h.name)
            for h in personal_history
        ],
        vital_signs=[
            VitalSign(
                id=v.vital_sign_id,
                name=v.name,
                category=v.category,
                value=v.value,
                unit=v.unit
            )
            for v in vital_signs_raw
        ],
        tests=[
            PatientTest(
                test_id=t.test_id,
                name=t.name,
                category=t.category,
                value=t.result_value,
                unit=t.units,
                date=t.test_date,
                notes=t.notes
            )
            for t in patient_tests
        ],
        follow_up_actions=[
            FollowUpAction(
                id=f.id, 
                interval=f.follow_up_interval, 
                action=f.action,
                auto_generated=f.auto_generated
            )
            for f in all_follow_up_actions
        ],
        recommendations=[
            Recommendation(
                id=r.id,
                recommendation=r.recommendation,
                auto_generated=r.auto_generated
            )
            for r in all_recommendations
        ],
        referrals=[
            Referral(
                id=r.id,
                specialist=r.specialist_name,
                reason=r.referral_reason,
                auto_generated=r.auto_generated
            )
            for r in all_referrals
        ],
        risks=[
            Risk(id=r.id, value=r.value, reason=r.reason)
            for r in all_risks
        ],
        life_style_advice=[
            LifeStyleAdvice(
                id=a.id,
                advice=a.life_style_advice,
                auto_generated=a.auto_generated
            )
            for a in all_lifestyle_advices
        ],
        presumptive_diagnoses=[
            PresumptiveDiagnosis(
                id=p.id,
                diagnosis_name=p.diagnosis_name,
                confidence_level=p.confidence_level,
                auto_generated=p.auto_generated
            )
            for p in all_presumptive_diagnoses
        ],
        tests_to_order=[
            TestToOrder(
                id=t.id,
                test_to_order=t.test_to_order,
                auto_generated=t.auto_generated
            )
            for t in all_tests_to_order
        ]
    )

@patient_router.get("/patients", response_model=List[PatientResponse])
def read_my_patients(
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    links = db.query(DoctorPatient).filter_by(doctor_id=doctor.id).all()
    patient_ids = [link.patient_id for link in links]
    patients = db.query(Patient).filter(Patient.patient_id.in_(patient_ids)).all()
    result = []
    for p in patients:
        try:
            mapped = map_patient(p, db, doctor_id=doctor.id)
            result.append(mapped)
        except Exception as e:
            print(f"Failed to map patient {p.patient_id}: {e}")
    return result

@patient_router.get(
    "/patients/{patient_id}",
    response_model=PatientResponse,
    response_model_exclude_unset=True
)
def read_patient(
        patient_id: int,
        basic: bool = Query(False, description="Return basic patient info only"),
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    link = db.query(DoctorPatient).filter_by(doctor_id=doctor.id, patient_id=patient_id).first()
    if not link:
        raise HTTPException(status_code=403, detail="This patient is not assigned to you")

    patient = get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    response = map_patient(patient, db, basic=basic, doctor_id=doctor.id)

    return response

@patient_router.post("/patients", summary="Create a new patient", description="Add a new patient with basic demographics and optional details.")
def create_patient(
        data: PatientCreate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    new_patient = Patient(
        first_name=data.first_name,
        last_name=data.last_name,
        gender=data.gender,
        dob=data.dob,
        ethnicity=data.ethnicity,
        phone=data.phone,
        email=data.email,
        marital_status=data.marital_status,
        occupation=data.occupation,
        insurance_provider=data.insurance_provider,
        address=data.address,
        weight=data.weight,
        height=data.height,
        smoke=data.smoke,
        alco=data.alco,
        active=data.active
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    # Save relation in doctor_patient table
    link = DoctorPatient(doctor_id=doctor.id, patient_id=new_patient.patient_id)
    db.add(link)

    # Log the creation in audit_logs
    audit_log = AuditLog(
        patient_id=new_patient.patient_id,
        doctor_id=doctor.id,
        action_type="CREATE",
        entity_type="PATIENT",
        action_details={
            "patient_id": new_patient.patient_id,
            "first_name": data.first_name,
            "last_name": data.last_name,
            "gender": data.gender,
            "dob": str(data.dob),
            "ethnicity": data.ethnicity,
            "phone": data.phone,
            "email": data.email,
            "marital_status": data.marital_status,
            "occupation": data.occupation,
            "insurance_provider": data.insurance_provider,
            "address": data.address,
            "weight": new_patient.weight,
            "height": new_patient.height,
            "smoke": new_patient.smoke,
            "alco": new_patient.alco,
            "active": new_patient.active
        },
        description=f"Created patient {data.first_name} {data.last_name}"
    )
    db.add(audit_log)
    db.commit()

    return {
        "message": "Patient created successfully",
        "patient_id": new_patient.patient_id
    }

@patient_router.delete("/patients/{patient_id}", summary="Delete a patient", description="Only deletes if the patient belongs to the logged-in doctor.")
def delete_patient(
        patient_id: int,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    link = db.query(DoctorPatient).filter_by(doctor_id=doctor.id, patient_id=patient_id).first()
    if not link:
        raise HTTPException(status_code=403, detail="This patient is not assigned to you")

    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Log the deletion in audit_logs with full patient details
    audit_log = AuditLog(
        patient_id=patient_id,
        doctor_id=doctor.id,
        action_type="DELETE",
        entity_type="PATIENT",
        action_details={
            "patient_id": patient.patient_id,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "gender": patient.gender,
            "dob": str(patient.dob),
            "ethnicity": patient.ethnicity,
            "phone": patient.phone,
            "email": patient.email,
            "marital_status": patient.marital_status,
            "occupation": patient.occupation,
            "insurance_provider": patient.insurance_provider,
            "address": patient.address,
            "weight": patient.weight,
            "height": patient.height,
            "smoke": patient.smoke,
            "alco": patient.alco,
            "active": patient.active
        },
        description=f"Deleted patient {patient.first_name} {patient.last_name}"
    )
    db.add(audit_log)

    # Delete patient link and then patient record
    db.delete(link)
    db.delete(patient)
    db.commit()
    return {"message": "Patient deleted successfully"}

@patient_router.put("/patients/{patient_id}", summary="Update a patient", description="Only updates if the patient belongs to the logged-in doctor.")
def update_patient(
        patient_id: int,
        data: PatientCreate,
        db: Session = Depends(get_db),
        doctor: Doctor = Depends(get_current_doctor)
):
    link = db.query(DoctorPatient).filter_by(doctor_id=doctor.id, patient_id=patient_id).first()
    if not link:
        raise HTTPException(status_code=403, detail="This patient is not assigned to you")

    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Capture old values for audit log
    old_values = {}
    new_values = {}
    
    # Only track fields that are actually being updated
    fields_to_update = {
        "first_name": data.first_name,
        "last_name": data.last_name,
        "gender": data.gender,
        "dob": data.dob,
        "ethnicity": data.ethnicity,
        "phone": data.phone,
        "email": data.email,
        "marital_status": data.marital_status,
        "occupation": data.occupation,
        "insurance_provider": data.insurance_provider,
        "address": data.address,
    }
    
    # Add optional fields only if they're provided
    if hasattr(data, 'weight') and data.weight is not None:
        fields_to_update["weight"] = data.weight
    if hasattr(data, 'height') and data.height is not None:
        fields_to_update["height"] = data.height
    if hasattr(data, 'smoke') and data.smoke is not None:
        fields_to_update["smoke"] = data.smoke
    if hasattr(data, 'alco') and data.alco is not None:
        fields_to_update["alco"] = data.alco
    if hasattr(data, 'active') and data.active is not None:
        fields_to_update["active"] = data.active

    # Build old and new values for audit log
    for field, new_value in fields_to_update.items():
        if field == "dob":
            old_values[field] = str(getattr(patient, field))
            new_values[field] = str(new_value)
        else:
            old_values[field] = getattr(patient, field)
            new_values[field] = new_value

    # Update patient fields
    patient.first_name = data.first_name
    patient.last_name = data.last_name
    patient.gender = data.gender
    patient.dob = data.dob
    patient.ethnicity = data.ethnicity
    patient.phone = data.phone
    patient.email = data.email
    patient.marital_status = data.marital_status
    patient.occupation = data.occupation
    patient.insurance_provider = data.insurance_provider
    patient.address = data.address
    
    # Only update optional fields if they were provided
    if hasattr(data, 'weight') and data.weight is not None:
        patient.weight = data.weight
    if hasattr(data, 'height') and data.height is not None:
        patient.height = data.height
    if hasattr(data, 'smoke') and data.smoke is not None:
        patient.smoke = data.smoke
    if hasattr(data, 'alco') and data.alco is not None:
        patient.alco = data.alco
    if hasattr(data, 'active') and data.active is not None:
        patient.active = data.active

    # Log the update in audit_logs
    audit_log = AuditLog(
        patient_id=patient_id,
        doctor_id=doctor.id,
        action_type="UPDATE",
        entity_type="PATIENT",
        action_details={
            "old_values": old_values,
            "new_values": new_values
        },
        description=f"Updated patient {data.first_name} {data.last_name}"
    )
    db.add(audit_log)

    db.commit()
    db.refresh(patient)

    return {"message": "Patient updated successfully"}
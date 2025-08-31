from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import date
from backend.app.models.patient import Patient
from backend.app.models.symptom_dict import SymptomDict
from backend.app.models.patient_symptom import PatientSymptom
from backend.app.models.personal_history_dict import PersonalHistoryDict
from backend.app.models.patient_personal_history import PatientPersonalHistory
from backend.app.models.symptoms_decision_rules import SymptomsDecisionRule
from backend.app.models.vital_signs_dict import VitalSignsDict
from backend.app.models.patient_vital_signs import PatientVitalSigns
from backend.app.models.tests_dict import TestsDict
from backend.app.models.patient_tests import PatientTests
from backend.app.models.follow_up_actions_catalog import FollowUpActionCatalog
from backend.app.models.personal_history_decision_rules import PersonalHistoryDecisionRule
from backend.app.models.tests_decision_rules import TestsDecisionRule
from backend.app.models.vital_signs_decision_rules import VitalSignsDecisionRule
from backend.app.models.recommendations_catalog import RecommendationsCatalog
from backend.app.models.referrals_catalog import ReferralsCatalog
from backend.app.models.risk_catalog import RiskCatalog
from backend.app.models.patient_follow_up_action import PatientFollowUpAction
from backend.app.models.patient_recommendations import PatientRecommendations
from backend.app.models.patient_referrals import PatientReferrals
from backend.app.models.patient_lifestyle_advices import PatientLifestyleAdvices
from backend.app.models.patient_presumptive_diagnoses import PatientPresumptiveDiagnoses
from backend.app.models.patient_tests_to_order import PatientTestsToOrder
from backend.app.models.life_style_advices_catalog import LifeStyleAdvicesCatalog
from backend.app.models.presumptive_diagnosis_catalog import PresumptiveDiagnosisCatalog
from backend.app.models.tests_to_order_catalog import TestsToOrderCatalog
from backend.app.models.symptoms_schema import PatientSymptomCreate
from backend.app.helpers.utils import compare_values, parse_float_or_none

def get_all_patients(db: Session):
    return db.query(Patient).all()

def get_patient_by_id(db: Session, patient_id: int):
    return db.query(Patient).filter(Patient.patient_id == patient_id).first()

def get_patient_symptoms(db: Session, patient_id: int):
    return (
        db.query(SymptomDict)
        .join(PatientSymptom, SymptomDict.symptom_id == PatientSymptom.symptom_id)
        .filter(PatientSymptom.patient_id == patient_id)
        .all()
    )

def get_patient_personal_history(db: Session, patient_id: int):
    return (
        db.query(PersonalHistoryDict)
        .join(PatientPersonalHistory, PersonalHistoryDict.id == PatientPersonalHistory.history_id)
        .filter(PatientPersonalHistory.patient_id == patient_id)
        .all()
    )

def get_patient_vital_signs(db: Session, patient_id: int):
    return (
        db.query(
            VitalSignsDict.vital_sign_id,
            VitalSignsDict.name,
            VitalSignsDict.category,
            VitalSignsDict.unit,
            PatientVitalSigns.value
        )
        .join(PatientVitalSigns, VitalSignsDict.vital_sign_id == PatientVitalSigns.vital_sign_id)
        .filter(PatientVitalSigns.patient_id == patient_id)
        .all()
    )

def get_patient_tests(db: Session, patient_id: int):
    # Subquery to get the most recent record for each test_id
    subquery = (
        db.query(
            PatientTests.patient_id,
            PatientTests.test_id,
            func.max(PatientTests.recorded_at).label('max_recorded_at')
        )
        .filter(PatientTests.patient_id == patient_id)
        .group_by(PatientTests.patient_id, PatientTests.test_id)
        .subquery()
    )

    # Main query to join with subquery and TestsDict to get full records
    results = (
        db.query(
            PatientTests.test_id,
            PatientTests.test_date,
            PatientTests.result_value,
            PatientTests.notes,
            TestsDict.name,
            TestsDict.category,
            TestsDict.units
        )
        .join(TestsDict, PatientTests.test_id == TestsDict.id)
        .join(
            subquery,
            (PatientTests.patient_id == subquery.c.patient_id) &
            (PatientTests.test_id == subquery.c.test_id) &
            (PatientTests.recorded_at == subquery.c.max_recorded_at)
        )
        .filter(PatientTests.patient_id == patient_id)
        .all()
    )

    return results

def get_age_group(age: int) -> str:
    if age < 45:
        return "18_to_44"
    elif age <= 60:
        return "45_to_60"
    else:
        return "older_than_60"

def get_follow_up_actions_from_symptoms(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    # Calculate age & age group
    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    # Get symptom_ids for this patient
    symptom_ids = (
        db.query(PatientSymptom.symptom_id)
        .filter(PatientSymptom.patient_id == patient_id)
        .all()
    )
    symptom_ids = [s.symptom_id for s in symptom_ids]

    if not symptom_ids:
        return []

    # Find matching decision rules
    rules = (
        db.query(SymptomsDecisionRule.follow_up_action_key)
        .filter(
            SymptomsDecisionRule.symptom_id.in_(symptom_ids),
            or_(SymptomsDecisionRule.gender == patient.gender, SymptomsDecisionRule.gender == None),
            or_(SymptomsDecisionRule.age_group == age_group, SymptomsDecisionRule.age_group == None)
        )
        .distinct()
        .all()
    )

    keys = [r.follow_up_action_key for r in rules if r.follow_up_action_key]

    if not keys:
        return []

    return (
        db.query(FollowUpActionCatalog)
        .filter(FollowUpActionCatalog.follow_up_action_key.in_(keys))
        .all()
    )

def get_follow_up_actions_from_personal_history(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    # Get history_ids for this patient
    history_ids = (
        db.query(PatientPersonalHistory.history_id)
        .filter(PatientPersonalHistory.patient_id == patient_id)
        .all()
    )
    history_ids = [h.history_id for h in history_ids]

    if not history_ids:
        return []

    # Match rules
    rules = (
        db.query(PersonalHistoryDecisionRule.follow_up_action_key)
        .filter(
            PersonalHistoryDecisionRule.history_id.in_(history_ids),
            or_(PersonalHistoryDecisionRule.gender == patient.gender, PersonalHistoryDecisionRule.gender == None),
            or_(PersonalHistoryDecisionRule.age_group == age_group, PersonalHistoryDecisionRule.age_group == None)
        )
        .distinct()
        .all()
    )

    keys = [r.follow_up_action_key for r in rules if r.follow_up_action_key]
    if not keys:
        return []

    return (
        db.query(FollowUpActionCatalog)
        .filter(FollowUpActionCatalog.follow_up_action_key.in_(keys))
        .all()
    )

def get_follow_up_actions_from_tests(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    tests = db.query(PatientTests).filter(PatientTests.patient_id == patient_id).all()
    if not tests:
        return []

    action_keys = set()

    for test in tests:
        test_value = parse_float_or_none(test.result_value)
        if test_value is None:
            continue

        rules = db.query(TestsDecisionRule).filter(
            TestsDecisionRule.test_id == test.test_id,
            or_(TestsDecisionRule.gender == patient.gender, TestsDecisionRule.gender.is_(None)),
            or_(TestsDecisionRule.age_group == age_group, TestsDecisionRule.age_group.is_(None)),
            TestsDecisionRule.follow_up_action_key.isnot(None)
        ).all()

        for rule in rules:
            if compare_values(test_value, rule.min_value, rule.max_value):
                action_keys.add(rule.follow_up_action_key)

    if not action_keys:
        return []

    return db.query(FollowUpActionCatalog).filter(
        FollowUpActionCatalog.follow_up_action_key.in_(list(action_keys))
    ).all()

def get_follow_up_actions_from_vital_signs(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    vitals = db.query(PatientVitalSigns).filter(PatientVitalSigns.patient_id == patient_id).all()
    if not vitals:
        return []

    action_keys = set()

    for vs in vitals:
        patient_val = parse_float_or_none(vs.value)
        if patient_val is None:
            continue  # Skip invalid numeric values

        rules = db.query(VitalSignsDecisionRule).filter(
            VitalSignsDecisionRule.vital_id == vs.vital_sign_id,
            or_(VitalSignsDecisionRule.gender == patient.gender, VitalSignsDecisionRule.gender == None),
            or_(VitalSignsDecisionRule.age_group == age_group, VitalSignsDecisionRule.age_group == None),
            VitalSignsDecisionRule.follow_up_action_key != None
        ).all()

        for rule in rules:
            if compare_values(patient_val, rule.min_value, rule.max_value):
                print(f"[Match-FUP] Vital ID {vs.vital_sign_id} value {vs.value} matches rule min={rule.min_value}, max={rule.max_value} → Action {rule.follow_up_action_key}")
                action_keys.add(rule.follow_up_action_key)

    if not action_keys:
        return []

    return db.query(FollowUpActionCatalog).filter(FollowUpActionCatalog.follow_up_action_key.in_(list(action_keys))).all()

def get_recommendations_from_symptoms(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    # Get symptom IDs
    symptom_ids = (
        db.query(PatientSymptom.symptom_id)
        .filter(PatientSymptom.patient_id == patient_id)
        .all()
    )
    symptom_ids = [s.symptom_id for s in symptom_ids]

    if not symptom_ids:
        return []

    rules = (
        db.query(SymptomsDecisionRule.recommendation_key)
        .filter(
            SymptomsDecisionRule.symptom_id.in_(symptom_ids),
            or_(SymptomsDecisionRule.gender == patient.gender, SymptomsDecisionRule.gender == None),
            or_(SymptomsDecisionRule.age_group == age_group, SymptomsDecisionRule.age_group == None)
        )
        .distinct()
        .all()
    )

    keys = [r.recommendation_key for r in rules if r.recommendation_key]

    if not keys:
        return []

    return (
        db.query(RecommendationsCatalog)
        .filter(RecommendationsCatalog.recommendation_key.in_(keys))
        .all()
    )

def get_recommendations_from_vital_signs(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    vitals = db.query(PatientVitalSigns).filter(PatientVitalSigns.patient_id == patient_id).all()
    if not vitals:
        return []

    recommendation_keys = set()

    for vs in vitals:
        patient_val = parse_float_or_none(vs.value)
        if patient_val is None:
            continue

        rules = db.query(VitalSignsDecisionRule).filter(
            VitalSignsDecisionRule.vital_id == vs.vital_sign_id,
            or_(VitalSignsDecisionRule.gender == patient.gender, VitalSignsDecisionRule.gender == None),
            or_(VitalSignsDecisionRule.age_group == age_group, VitalSignsDecisionRule.age_group == None),
            VitalSignsDecisionRule.recommendation_key != None
        ).all()

        for rule in rules:
            if compare_values(patient_val, rule.min_value, rule.max_value):
                print(f"[Match-REC] Vital ID {vs.vital_sign_id} value {vs.value} matches min={rule.min_value}, max={rule.max_value} → Rec: {rule.recommendation_key}")
                recommendation_keys.add(rule.recommendation_key)

    if not recommendation_keys:
        return []

    return db.query(RecommendationsCatalog).filter(RecommendationsCatalog.recommendation_key.in_(list(recommendation_keys))).all()

def get_recommendations_from_personal_history(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    history_ids = (
        db.query(PatientPersonalHistory.history_id)
        .filter(PatientPersonalHistory.patient_id == patient_id)
        .distinct()
        .all()
    )
    history_ids = [h.history_id for h in history_ids]

    if not history_ids:
        return []

    rules = (
        db.query(PersonalHistoryDecisionRule.recommendation_key)
        .filter(
            PersonalHistoryDecisionRule.history_id.in_(history_ids),
            or_(PersonalHistoryDecisionRule.gender == patient.gender, PersonalHistoryDecisionRule.gender == None),
            or_(PersonalHistoryDecisionRule.age_group == age_group, PersonalHistoryDecisionRule.age_group == None)
        )
        .distinct()
        .all()
    )

    keys = [r.recommendation_key for r in rules if r.recommendation_key]

    if not keys:
        return []

    return (
        db.query(RecommendationsCatalog)
        .filter(RecommendationsCatalog.recommendation_key.in_(keys))
        .all()
    )

def get_recommendations_from_tests(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    tests = db.query(PatientTests).filter(PatientTests.patient_id == patient_id).all()
    if not tests:
        return []

    recommendation_keys = set()

    for test in tests:
        test_value = parse_float_or_none(test.result_value)
        if test_value is None:
            continue

        rules = db.query(TestsDecisionRule).filter(
            TestsDecisionRule.test_id == test.test_id,
            or_(TestsDecisionRule.gender == patient.gender, TestsDecisionRule.gender.is_(None)),
            or_(TestsDecisionRule.age_group == age_group, TestsDecisionRule.age_group.is_(None)),
            TestsDecisionRule.recommendation_key.isnot(None)
        ).all()

        for rule in rules:
            if compare_values(test_value, rule.min_value, rule.max_value):
                recommendation_keys.add(rule.recommendation_key)

    if not recommendation_keys:
        return []

    return db.query(RecommendationsCatalog).filter(
        RecommendationsCatalog.recommendation_key.in_(list(recommendation_keys))
    ).all()

def get_referrals_from_symptoms(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    symptom_ids = (
        db.query(PatientSymptom.symptom_id)
        .filter(PatientSymptom.patient_id == patient_id)
        .all()
    )
    symptom_ids = [s.symptom_id for s in symptom_ids]

    if not symptom_ids:
        return []

    rules = (
        db.query(SymptomsDecisionRule.referral_key)
        .filter(
            SymptomsDecisionRule.symptom_id.in_(symptom_ids),
            or_(SymptomsDecisionRule.gender == patient.gender, SymptomsDecisionRule.gender == None),
            or_(SymptomsDecisionRule.age_group == age_group, SymptomsDecisionRule.age_group == None)
        )
        .distinct()
        .all()
    )

    keys = [r.referral_key for r in rules if r.referral_key]

    if not keys:
        return []

    return (
        db.query(ReferralsCatalog)
        .filter(ReferralsCatalog.referral_key.in_(keys))
        .all()
    )

def get_referrals_from_personal_history(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    history_ids = (
        db.query(PatientPersonalHistory.history_id)
        .filter(PatientPersonalHistory.patient_id == patient_id)
        .all()
    )
    history_ids = [h.history_id for h in history_ids]

    if not history_ids:
        return []

    rules = (
        db.query(PersonalHistoryDecisionRule.referral_key)
        .filter(
            PersonalHistoryDecisionRule.history_id.in_(history_ids),
            or_(PersonalHistoryDecisionRule.gender == patient.gender, PersonalHistoryDecisionRule.gender == None),
            or_(PersonalHistoryDecisionRule.age_group == age_group, PersonalHistoryDecisionRule.age_group == None)
        )
        .distinct()
        .all()
    )

    keys = [r.referral_key for r in rules if r.referral_key]

    if not keys:
        return []

    return (
        db.query(ReferralsCatalog)
        .filter(ReferralsCatalog.referral_key.in_(keys))
        .all()
    )

def get_referrals_from_tests(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    tests = db.query(PatientTests).filter(PatientTests.patient_id == patient_id).all()
    if not tests:
        return []

    referral_keys = set()

    for test in tests:
        test_value = parse_float_or_none(test.result_value)
        if test_value is None:
            continue

        rules = db.query(TestsDecisionRule).filter(
            TestsDecisionRule.test_id == test.test_id,
            or_(TestsDecisionRule.gender == patient.gender, TestsDecisionRule.gender.is_(None)),
            or_(TestsDecisionRule.age_group == age_group, TestsDecisionRule.age_group.is_(None)),
            TestsDecisionRule.referral_key.isnot(None)
        ).all()

        for rule in rules:
            if compare_values(test_value, rule.min_value, rule.max_value):
                referral_keys.add(rule.referral_key)

    if not referral_keys:
        return []

    return db.query(ReferralsCatalog).filter(
        ReferralsCatalog.referral_key.in_(list(referral_keys))
    ).all()

def get_referrals_from_vital_signs(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    vitals = db.query(PatientVitalSigns).filter(PatientVitalSigns.patient_id == patient_id).all()
    if not vitals:
        return []

    referral_keys = set()

    for vs in vitals:
        patient_val = parse_float_or_none(vs.value)
        if patient_val is None:
            continue  # Skip invalid entries

        rules = db.query(VitalSignsDecisionRule).filter(
            VitalSignsDecisionRule.vital_id == vs.vital_sign_id,
            or_(VitalSignsDecisionRule.gender == patient.gender, VitalSignsDecisionRule.gender == None),
            or_(VitalSignsDecisionRule.age_group == age_group, VitalSignsDecisionRule.age_group == None),
            VitalSignsDecisionRule.referral_key != None
        ).all()

        for rule in rules:
            if compare_values(patient_val, rule.min_value, rule.max_value):
                print(f"[Match-REF] Vital ID {vs.vital_sign_id} value {vs.value} matches rule min={rule.min_value}, max={rule.max_value} → Referral: {rule.referral_key}")
                referral_keys.add(rule.referral_key)

    if not referral_keys:
        return []

    return db.query(ReferralsCatalog).filter(ReferralsCatalog.referral_key.in_(list(referral_keys))).all()

def get_risks_from_symptoms(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    symptom_ids = (
        db.query(PatientSymptom.symptom_id)
        .filter(PatientSymptom.patient_id == patient_id)
        .all()
    )
    symptom_ids = [s.symptom_id for s in symptom_ids]

    if not symptom_ids:
        return []

    rules = (
        db.query(SymptomsDecisionRule.risk_key)
        .filter(
            SymptomsDecisionRule.symptom_id.in_(symptom_ids),
            or_(SymptomsDecisionRule.gender == patient.gender, SymptomsDecisionRule.gender == None),
            or_(SymptomsDecisionRule.age_group == age_group, SymptomsDecisionRule.age_group == None)
        )
        .distinct()
        .all()
    )

    keys = [r.risk_key for r in rules if r.risk_key]

    if not keys:
        return []

    return (
        db.query(RiskCatalog)
        .filter(RiskCatalog.risk_key.in_(keys))
        .all()
    )

def get_risks_from_personal_history(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    history_ids = (
        db.query(PatientPersonalHistory.history_id)
        .filter(PatientPersonalHistory.patient_id == patient_id)
        .all()
    )
    history_ids = [h.history_id for h in history_ids]

    if not history_ids:
        return []

    rules = (
        db.query(PersonalHistoryDecisionRule.risk_key)
        .filter(
            PersonalHistoryDecisionRule.history_id.in_(history_ids),
            or_(PersonalHistoryDecisionRule.gender == patient.gender, PersonalHistoryDecisionRule.gender == None),
            or_(PersonalHistoryDecisionRule.age_group == age_group, PersonalHistoryDecisionRule.age_group == None)
        )
        .distinct()
        .all()
    )

    keys = [r.risk_key for r in rules if r.risk_key]

    if not keys:
        return []

    return (
        db.query(RiskCatalog)
        .filter(RiskCatalog.risk_key.in_(keys))
        .all()
    )

def get_risks_from_tests(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    tests = db.query(PatientTests).filter(PatientTests.patient_id == patient_id).all()
    if not tests:
        return []

    risk_keys = set()

    for test in tests:
        test_value = parse_float_or_none(test.result_value)
        if test_value is None:
            continue

        rules = db.query(TestsDecisionRule).filter(
            TestsDecisionRule.test_id == test.test_id,
            or_(TestsDecisionRule.gender == patient.gender, TestsDecisionRule.gender.is_(None)),
            or_(TestsDecisionRule.age_group == age_group, TestsDecisionRule.age_group.is_(None)),
            TestsDecisionRule.risk_key.isnot(None)
        ).all()

        for rule in rules:
            if compare_values(test_value, rule.min_value, rule.max_value):
                risk_keys.add(rule.risk_key)

    if not risk_keys:
        return []

    return db.query(RiskCatalog).filter(
        RiskCatalog.risk_key.in_(list(risk_keys))
    ).all()

def get_risks_from_vital_signs(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    vitals = db.query(PatientVitalSigns).filter(PatientVitalSigns.patient_id == patient_id).all()
    if not vitals:
        return []

    risk_keys = set()

    for vital in vitals:
        value = parse_float_or_none(vital.value)
        if value is None:
            continue

        rules = db.query(VitalSignsDecisionRule).filter(
            VitalSignsDecisionRule.vital_id == vital.vital_sign_id,
            or_(VitalSignsDecisionRule.gender == patient.gender, VitalSignsDecisionRule.gender == None),
            or_(VitalSignsDecisionRule.age_group == age_group, VitalSignsDecisionRule.age_group == None),
            VitalSignsDecisionRule.risk_key != None
        ).all()

        for rule in rules:
            if compare_values(value, rule.min_value, rule.max_value):
                print(f"Matched: {value} {rule.min_value} {rule.max_value} → {rule.risk_key}")
                risk_keys.add(rule.risk_key)

    if not risk_keys:
        return []

    return db.query(RiskCatalog).filter(RiskCatalog.risk_key.in_(list(risk_keys))).all()

def get_lifestyle_advices_from_symptoms(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    symptom_ids = (
        db.query(PatientSymptom.symptom_id)
        .filter(PatientSymptom.patient_id == patient_id)
        .all()
    )
    symptom_ids = [s.symptom_id for s in symptom_ids]

    if not symptom_ids:
        return []

    rules = (
        db.query(SymptomsDecisionRule.life_style_advice_key)
        .filter(
            SymptomsDecisionRule.symptom_id.in_(symptom_ids),
            or_(SymptomsDecisionRule.gender == patient.gender, SymptomsDecisionRule.gender == None),
            or_(SymptomsDecisionRule.age_group == age_group, SymptomsDecisionRule.age_group == None)
        )
        .distinct()
        .all()
    )

    keys = [r.life_style_advice_key for r in rules if r.life_style_advice_key]

    if not keys:
        return []

    return db.query(LifeStyleAdvicesCatalog).filter(LifeStyleAdvicesCatalog.life_style_advice_key.in_(keys)).all()

def get_lifestyle_advices_from_personal_history(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    history_ids = (
        db.query(PatientPersonalHistory.history_id)
        .filter(PatientPersonalHistory.patient_id == patient_id)
        .all()
    )
    history_ids = [h.history_id for h in history_ids]

    if not history_ids:
        return []

    rules = (
        db.query(PersonalHistoryDecisionRule.life_style_advice_key)
        .filter(
            PersonalHistoryDecisionRule.history_id.in_(history_ids),
            or_(PersonalHistoryDecisionRule.gender == patient.gender, PersonalHistoryDecisionRule.gender == None),
            or_(PersonalHistoryDecisionRule.age_group == age_group, PersonalHistoryDecisionRule.age_group == None)
        )
        .distinct()
        .all()
    )

    keys = [r.life_style_advice_key for r in rules if r.life_style_advice_key]

    if not keys:
        return []

    return db.query(LifeStyleAdvicesCatalog).filter(LifeStyleAdvicesCatalog.life_style_advice_key.in_(keys)).all()

def get_lifestyle_advices_from_vital_signs(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    vitals = db.query(PatientVitalSigns).filter(PatientVitalSigns.patient_id == patient_id).all()
    if not vitals:
        return []

    advice_keys = set()

    for vs in vitals:
        value = parse_float_or_none(vs.value)
        if value is None:
            continue

        rules = db.query(VitalSignsDecisionRule).filter(
            VitalSignsDecisionRule.vital_id == vs.vital_sign_id,
            or_(VitalSignsDecisionRule.gender == patient.gender, VitalSignsDecisionRule.gender == None),
            or_(VitalSignsDecisionRule.age_group == age_group, VitalSignsDecisionRule.age_group == None),
            VitalSignsDecisionRule.life_style_advice_key != None
        ).all()

        for rule in rules:
            if compare_values(value, rule.min_value, rule.max_value):
                print(f"[Lifestyle Advice] Matched: {value} {rule.min_value}-{rule.max_value} → {rule.life_style_advice_key}")
                advice_keys.add(rule.life_style_advice_key)

    if not advice_keys:
        return []

    return db.query(LifeStyleAdvicesCatalog).filter(
        LifeStyleAdvicesCatalog.life_style_advice_key.in_(list(advice_keys))
    ).all()

def get_lifestyle_advices_from_tests(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    tests = db.query(PatientTests).filter(PatientTests.patient_id == patient_id).all()
    if not tests:
        return []

    advice_keys = set()

    for test in tests:
        test_value = parse_float_or_none(test.result_value)
        if test_value is None:
            continue

        rules = db.query(TestsDecisionRule).filter(
            TestsDecisionRule.test_id == test.test_id,
            or_(TestsDecisionRule.gender == patient.gender, TestsDecisionRule.gender.is_(None)),
            or_(TestsDecisionRule.age_group == age_group, TestsDecisionRule.age_group.is_(None)),
            TestsDecisionRule.life_style_advice_key.isnot(None)
        ).all()

        for rule in rules:
            if compare_values(test_value, rule.min_value, rule.max_value):
                advice_keys.add(rule.life_style_advice_key)

    if not advice_keys:
        return []

    return db.query(LifeStyleAdvicesCatalog).filter(
        LifeStyleAdvicesCatalog.life_style_advice_key.in_(list(advice_keys))
    ).all()

def get_presumptive_diagnoses_from_symptoms(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    symptom_ids = db.query(PatientSymptom.symptom_id).filter(PatientSymptom.patient_id == patient_id).all()
    symptom_ids = [s.symptom_id for s in symptom_ids]

    if not symptom_ids:
        return []

    rules = db.query(SymptomsDecisionRule.presumptive_diagnosis_key).filter(
        SymptomsDecisionRule.symptom_id.in_(symptom_ids),
        or_(SymptomsDecisionRule.gender == patient.gender, SymptomsDecisionRule.gender.is_(None)),
        or_(SymptomsDecisionRule.age_group == age_group, SymptomsDecisionRule.age_group.is_(None))
    ).distinct().all()

    keys = [r.presumptive_diagnosis_key for r in rules if r.presumptive_diagnosis_key]

    if not keys:
        return []

    return db.query(PresumptiveDiagnosisCatalog).filter(
        PresumptiveDiagnosisCatalog.presumptive_diagnosis_key.in_(keys)
    ).all()

def get_presumptive_diagnoses_from_personal_history(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    history_ids = (
        db.query(PatientPersonalHistory.history_id)
        .filter(PatientPersonalHistory.patient_id == patient_id)
        .distinct()
        .all()
    )
    history_ids = [h.history_id for h in history_ids]

    if not history_ids:
        return []

    rules = (
        db.query(PersonalHistoryDecisionRule.presumptive_diagnosis_key)
        .filter(
            PersonalHistoryDecisionRule.history_id.in_(history_ids),
            or_(PersonalHistoryDecisionRule.gender == patient.gender, PersonalHistoryDecisionRule.gender.is_(None)),
            or_(PersonalHistoryDecisionRule.age_group == age_group, PersonalHistoryDecisionRule.age_group.is_(None))
        )
        .distinct()
        .all()
    )

    keys = [r.presumptive_diagnosis_key for r in rules if r.presumptive_diagnosis_key]
    if not keys:
        return []

    return db.query(PresumptiveDiagnosisCatalog).filter(
        PresumptiveDiagnosisCatalog.presumptive_diagnosis_key.in_(keys)
    ).all()

def get_presumptive_diagnoses_from_tests(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    tests = db.query(PatientTests).filter(PatientTests.patient_id == patient_id).all()
    if not tests:
        return []

    diagnosis_keys = set()

    for test in tests:
        test_value = parse_float_or_none(test.result_value)
        if test_value is None:
            continue

        rules = db.query(TestsDecisionRule).filter(
            TestsDecisionRule.test_id == test.test_id,
            or_(TestsDecisionRule.gender == patient.gender, TestsDecisionRule.gender == None),
            or_(TestsDecisionRule.age_group == age_group, TestsDecisionRule.age_group == None),
            TestsDecisionRule.presumptive_diagnosis_key != None
        ).all()

        for rule in rules:
            if compare_values(test_value, rule.min_value, rule.max_value):
                diagnosis_keys.add(rule.presumptive_diagnosis_key)

    if not diagnosis_keys:
        return []

    return db.query(PresumptiveDiagnosisCatalog).filter(
        PresumptiveDiagnosisCatalog.presumptive_diagnosis_key.in_(list(diagnosis_keys))
    ).all()

def get_presumptive_diagnoses_from_vital_signs(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    vitals = db.query(PatientVitalSigns).filter(PatientVitalSigns.patient_id == patient_id).all()
    if not vitals:
        return []

    diagnosis_keys = set()

    for vital in vitals:
        value = parse_float_or_none(vital.value)
        if value is None:
            continue

        rules = db.query(VitalSignsDecisionRule).filter(
            VitalSignsDecisionRule.vital_id == vital.vital_sign_id,
            or_(VitalSignsDecisionRule.gender == patient.gender, VitalSignsDecisionRule.gender == None),
            or_(VitalSignsDecisionRule.age_group == age_group, VitalSignsDecisionRule.age_group == None),
            VitalSignsDecisionRule.presumptive_diagnosis_key != None
        ).all()

        for rule in rules:
            if compare_values(value, rule.min_value, rule.max_value):
                diagnosis_keys.add(rule.presumptive_diagnosis_key)

    if not diagnosis_keys:
        return []

    return db.query(PresumptiveDiagnosisCatalog).filter(
        PresumptiveDiagnosisCatalog.presumptive_diagnosis_key.in_(list(diagnosis_keys))
    ).all()

def get_tests_to_order_from_symptoms(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    symptom_ids = db.query(PatientSymptom.symptom_id).filter(PatientSymptom.patient_id == patient_id).all()
    symptom_ids = [s.symptom_id for s in symptom_ids]

    if not symptom_ids:
        return []

    rules = db.query(SymptomsDecisionRule.tests_key).filter(
        SymptomsDecisionRule.symptom_id.in_(symptom_ids),
        or_(SymptomsDecisionRule.gender == patient.gender, SymptomsDecisionRule.gender == None),
        or_(SymptomsDecisionRule.age_group == age_group, SymptomsDecisionRule.age_group == None),
        SymptomsDecisionRule.tests_key != None
    ).distinct().all()

    keys = [r.tests_key for r in rules if r.tests_key]

    if not keys:
        return []

    return db.query(TestsToOrderCatalog).filter(
        TestsToOrderCatalog.test_to_order_key.in_(keys)
    ).all()

def get_tests_to_order_from_personal_history(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    history_ids = (
        db.query(PatientPersonalHistory.history_id)
        .filter(PatientPersonalHistory.patient_id == patient_id)
        .distinct()
        .all()
    )
    history_ids = [h.history_id for h in history_ids]

    if not history_ids:
        return []

    rules = (
        db.query(PersonalHistoryDecisionRule.tests_key)
        .filter(
            PersonalHistoryDecisionRule.history_id.in_(history_ids),
            or_(PersonalHistoryDecisionRule.gender == patient.gender, PersonalHistoryDecisionRule.gender == None),
            or_(PersonalHistoryDecisionRule.age_group == age_group, PersonalHistoryDecisionRule.age_group == None),
            PersonalHistoryDecisionRule.tests_key != None
        )
        .distinct()
        .all()
    )

    keys = [r.tests_key for r in rules if r.tests_key]
    if not keys:
        return []

    return db.query(TestsToOrderCatalog).filter(
        TestsToOrderCatalog.test_to_order_key.in_(keys)
    ).all()

def get_tests_to_order_from_vital_signs(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    vitals = db.query(PatientVitalSigns).filter(PatientVitalSigns.patient_id == patient_id).all()
    if not vitals:
        return []

    test_keys = set()

    for vs in vitals:
        rules = db.query(VitalSignsDecisionRule).filter(
            VitalSignsDecisionRule.vital_id == vs.vital_sign_id,
            or_(VitalSignsDecisionRule.gender == patient.gender, VitalSignsDecisionRule.gender == None),
            or_(VitalSignsDecisionRule.age_group == age_group, VitalSignsDecisionRule.age_group == None),
            VitalSignsDecisionRule.tests_key != None
        ).all()

        patient_value = parse_float_or_none(vs.value)

        for rule in rules:
            if patient_value is not None and compare_values(patient_value, rule.min_value, rule.max_value):
                test_keys.add(rule.tests_key)

    if not test_keys:
        return []

    return db.query(TestsToOrderCatalog).filter(
        TestsToOrderCatalog.test_to_order_key.in_(list(test_keys))
    ).all()

def get_tests_to_order_from_tests(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.patient_id == patient_id).first()
    if not patient:
        return []

    today = date.today()
    age = today.year - patient.dob.year - ((today.month, today.day) < (patient.dob.month, patient.dob.day))
    age_group = get_age_group(age)

    tests = db.query(PatientTests).filter(PatientTests.patient_id == patient_id).all()
    if not tests:
        return []

    test_keys = set()

    for test in tests:
        test_value = parse_float_or_none(test.result_value)
        if test_value is None:
            continue

        # For now, we don't have tests_key in the database, so skip this logic
        # This function would need the tests_key column to be added to the database
        # to work properly. For now, we'll return an empty set to avoid errors.
        pass

    if not test_keys:
        return []

    return db.query(TestsToOrderCatalog).filter(
        TestsToOrderCatalog.test_to_order_key.in_(list(test_keys))
    ).all()

def create_patient_symptom(db: Session, data: PatientSymptomCreate):
    new_symptom = PatientSymptom(
        patient_id=data.patient_id,
        symptom_id=data.symptom_id,
        onset_date=data.onset_date
    )
    db.add(new_symptom)
    db.commit()
    db.refresh(new_symptom)
    return new_symptom

def is_item_ignored(db: Session, patient_id: int, doctor_id: int, entity_type: str, catalog_item_key: str) -> bool:
    """
    Check if a specific auto-generated item has been ignored by the user.
    """
    from backend.app.models.patient_ignored_auto_generated import PatientIgnoredAutoGeneratedItem
    
    ignored_item = db.query(PatientIgnoredAutoGeneratedItem).filter(
        PatientIgnoredAutoGeneratedItem.patient_id == patient_id,
        PatientIgnoredAutoGeneratedItem.doctor_id == doctor_id,
        PatientIgnoredAutoGeneratedItem.entity_type == entity_type,
        PatientIgnoredAutoGeneratedItem.catalog_item_key == catalog_item_key
    ).first()
    
    return ignored_item is not None

def auto_populate_patient_summary_data(db: Session, patient_id: int, doctor_id: int):
    """
    Auto-populate patient summary tables based on decision rules when symptoms, 
    personal history, vital signs, or tests are updated.
    """
    try:
        # Remove orphaned auto-generated items that are no longer relevant
        cleanup_orphaned_auto_generated_items(db, patient_id)
        
        # Get all catalog-generated follow-up actions from decision rules
        catalog_follow_up_actions_symptoms = get_follow_up_actions_from_symptoms(db, patient_id)
        catalog_follow_up_actions_history = get_follow_up_actions_from_personal_history(db, patient_id)
        catalog_follow_up_actions_tests = get_follow_up_actions_from_tests(db, patient_id)
        catalog_follow_up_actions_vitals = get_follow_up_actions_from_vital_signs(db, patient_id)
        
        all_catalog_follow_up_actions = (catalog_follow_up_actions_symptoms + 
                                       catalog_follow_up_actions_history + 
                                       catalog_follow_up_actions_tests + 
                                       catalog_follow_up_actions_vitals)
        
        # Populate patient_follow_up_actions table
        for action_item in all_catalog_follow_up_actions:
            # Check if this action already exists to avoid duplicates
            existing = db.query(PatientFollowUpAction).filter(
                PatientFollowUpAction.patient_id == patient_id,
                PatientFollowUpAction.action == action_item.action,
                PatientFollowUpAction.follow_up_interval == action_item.interval
            ).first()
            
            # Check if this item has been ignored by the user
            catalog_key = f"{action_item.action}|{action_item.interval}"
            if is_item_ignored(db, patient_id, doctor_id, "follow_up_action", catalog_key):
                continue
            
            if not existing:
                new_action = PatientFollowUpAction(
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    action=action_item.action,
                    follow_up_interval=action_item.interval,
                    auto_generated=True
                )
                db.add(new_action)
        
        # Similar logic for recommendations
        catalog_recommendations_symptoms = get_recommendations_from_symptoms(db, patient_id)
        catalog_recommendations_vitals = get_recommendations_from_vital_signs(db, patient_id)
        catalog_recommendations_history = get_recommendations_from_personal_history(db, patient_id)
        catalog_recommendations_tests = get_recommendations_from_tests(db, patient_id)
        
        all_catalog_recommendations = (catalog_recommendations_symptoms +
                                     catalog_recommendations_vitals +
                                     catalog_recommendations_history +
                                     catalog_recommendations_tests)
        
        for rec_item in all_catalog_recommendations:
            existing = db.query(PatientRecommendations).filter(
                PatientRecommendations.patient_id == patient_id,
                PatientRecommendations.recommendation == rec_item.recommendation_value
            ).first()
            
            # Check if this item has been ignored by the user
            if is_item_ignored(db, patient_id, doctor_id, "recommendation", rec_item.recommendation_value):
                continue
            
            if not existing:
                new_rec = PatientRecommendations(
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    recommendation=rec_item.recommendation_value,
                    auto_generated=True
                )
                db.add(new_rec)
        
        # Similar logic for referrals
        catalog_referrals_symptoms = get_referrals_from_symptoms(db, patient_id)
        catalog_referrals_history = get_referrals_from_personal_history(db, patient_id)
        catalog_referrals_tests = get_referrals_from_tests(db, patient_id)
        catalog_referrals_vitals = get_referrals_from_vital_signs(db, patient_id)
        
        all_catalog_referrals = (catalog_referrals_symptoms +
                               catalog_referrals_history +
                               catalog_referrals_tests +
                               catalog_referrals_vitals)
        
        for ref_item in all_catalog_referrals:
            existing = db.query(PatientReferrals).filter(
                PatientReferrals.patient_id == patient_id,
                PatientReferrals.specialist_name == ref_item.specialist_name,
                PatientReferrals.referral_reason == ref_item.referral_reason
            ).first()
            
            # Check if this item has been ignored by the user
            catalog_key = f"{ref_item.specialist_name}|{ref_item.referral_reason}"
            if is_item_ignored(db, patient_id, doctor_id, "referral", catalog_key):
                continue
            
            if not existing:
                new_ref = PatientReferrals(
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    specialist_name=ref_item.specialist_name,
                    referral_reason=ref_item.referral_reason,
                    auto_generated=True
                )
                db.add(new_ref)
        
        # Similar logic for lifestyle advices
        catalog_lifestyle_advices_symptoms = get_lifestyle_advices_from_symptoms(db, patient_id)
        catalog_lifestyle_advices_history = get_lifestyle_advices_from_personal_history(db, patient_id)
        catalog_lifestyle_advices_vitals = get_lifestyle_advices_from_vital_signs(db, patient_id)
        catalog_lifestyle_advices_tests = get_lifestyle_advices_from_tests(db, patient_id)
        
        all_catalog_lifestyle_advices = (catalog_lifestyle_advices_symptoms +
                                       catalog_lifestyle_advices_history +
                                       catalog_lifestyle_advices_vitals +
                                       catalog_lifestyle_advices_tests)
        
        for advice_item in all_catalog_lifestyle_advices:
            existing = db.query(PatientLifestyleAdvices).filter(
                PatientLifestyleAdvices.patient_id == patient_id,
                PatientLifestyleAdvices.life_style_advice == advice_item.life_style_advice
            ).first()
            
            # Check if this item has been ignored by the user
            if is_item_ignored(db, patient_id, doctor_id, "lifestyle_advice", advice_item.life_style_advice):
                continue
            
            if not existing:
                new_advice = PatientLifestyleAdvices(
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    life_style_advice=advice_item.life_style_advice,
                    auto_generated=True
                )
                db.add(new_advice)
        
        # Similar logic for presumptive diagnoses
        catalog_presumptive_diagnoses_symptoms = get_presumptive_diagnoses_from_symptoms(db, patient_id)
        catalog_presumptive_diagnoses_history = get_presumptive_diagnoses_from_personal_history(db, patient_id)
        catalog_presumptive_diagnoses_tests = get_presumptive_diagnoses_from_tests(db, patient_id)
        catalog_presumptive_diagnoses_vitals = get_presumptive_diagnoses_from_vital_signs(db, patient_id)
        
        all_catalog_presumptive_diagnoses = (catalog_presumptive_diagnoses_symptoms +
                                           catalog_presumptive_diagnoses_history +
                                           catalog_presumptive_diagnoses_tests +
                                           catalog_presumptive_diagnoses_vitals)
        
        for diag_item in all_catalog_presumptive_diagnoses:
            existing = db.query(PatientPresumptiveDiagnoses).filter(
                PatientPresumptiveDiagnoses.patient_id == patient_id,
                PatientPresumptiveDiagnoses.diagnosis_name == diag_item.diagnosis_name
            ).first()
            
            # Check if this item has been ignored by the user
            if is_item_ignored(db, patient_id, doctor_id, "presumptive_diagnosis", diag_item.diagnosis_name):
                continue
            
            if not existing:
                new_diag = PatientPresumptiveDiagnoses(
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    diagnosis_name=diag_item.diagnosis_name,
                    confidence_level=diag_item.confidence_level,
                    auto_generated=True
                )
                db.add(new_diag)
        
        # Similar logic for tests to order
        catalog_tests_to_order_symptoms = get_tests_to_order_from_symptoms(db, patient_id)
        catalog_tests_to_order_history = get_tests_to_order_from_personal_history(db, patient_id)
        catalog_tests_to_order_vitals = get_tests_to_order_from_vital_signs(db, patient_id)
        catalog_tests_to_order_tests = get_tests_to_order_from_tests(db, patient_id)
        
        all_catalog_tests_to_order = (catalog_tests_to_order_symptoms +
                                    catalog_tests_to_order_history +
                                    catalog_tests_to_order_vitals +
                                    catalog_tests_to_order_tests)
        
        for test_item in all_catalog_tests_to_order:
            existing = db.query(PatientTestsToOrder).filter(
                PatientTestsToOrder.patient_id == patient_id,
                PatientTestsToOrder.test_to_order == test_item.test_to_order
            ).first()
            
            # Check if this item has been ignored by the user
            if is_item_ignored(db, patient_id, doctor_id, "test_to_order", test_item.test_to_order):
                continue
            
            if not existing:
                new_test = PatientTestsToOrder(
                    patient_id=patient_id,
                    doctor_id=doctor_id,
                    test_to_order=test_item.test_to_order,
                    auto_generated=True
                )
                db.add(new_test)
        
        db.commit()
        return True
        
    except Exception as e:
        db.rollback()
        print(f"Error in auto_populate_patient_summary_data: {str(e)}")
        return False

def cleanup_orphaned_auto_generated_items(db: Session, patient_id: int):
    """
    Remove auto-generated items that are no longer supported by current decision rules.
    This ensures that when symptoms/history/vitals/tests are removed, their corresponding
    auto-generated recommendations are also removed.
    """
    try:
        # Get current catalog items that should exist based on current patient data
        current_follow_up_actions = get_follow_up_actions_from_symptoms(db, patient_id) + \
                                   get_follow_up_actions_from_personal_history(db, patient_id) + \
                                   get_follow_up_actions_from_tests(db, patient_id) + \
                                   get_follow_up_actions_from_vital_signs(db, patient_id)
        
        current_recommendations = get_recommendations_from_symptoms(db, patient_id) + \
                                get_recommendations_from_vital_signs(db, patient_id) + \
                                get_recommendations_from_personal_history(db, patient_id) + \
                                get_recommendations_from_tests(db, patient_id)
        
        current_referrals = get_referrals_from_symptoms(db, patient_id) + \
                           get_referrals_from_personal_history(db, patient_id) + \
                           get_referrals_from_tests(db, patient_id) + \
                           get_referrals_from_vital_signs(db, patient_id)
        
        current_lifestyle_advices = get_lifestyle_advices_from_symptoms(db, patient_id) + \
                                   get_lifestyle_advices_from_personal_history(db, patient_id) + \
                                   get_lifestyle_advices_from_vital_signs(db, patient_id) + \
                                   get_lifestyle_advices_from_tests(db, patient_id)
        
        current_presumptive_diagnoses = get_presumptive_diagnoses_from_symptoms(db, patient_id) + \
                                       get_presumptive_diagnoses_from_personal_history(db, patient_id) + \
                                       get_presumptive_diagnoses_from_tests(db, patient_id) + \
                                       get_presumptive_diagnoses_from_vital_signs(db, patient_id)
        
        current_tests_to_order = get_tests_to_order_from_symptoms(db, patient_id) + \
                               get_tests_to_order_from_personal_history(db, patient_id) + \
                               get_tests_to_order_from_vital_signs(db, patient_id) + \
                               get_tests_to_order_from_tests(db, patient_id)
        
        # Create sets of current valid content for comparison
        current_follow_up_texts = {(item.action, item.interval) for item in current_follow_up_actions}
        current_recommendation_texts = {item.recommendation_value for item in current_recommendations}
        current_referral_texts = {(item.specialist_name, item.referral_reason) for item in current_referrals}
        current_lifestyle_texts = {item.life_style_advice for item in current_lifestyle_advices}
        current_diagnosis_texts = {item.diagnosis_name for item in current_presumptive_diagnoses}
        current_test_texts = {item.test_to_order for item in current_tests_to_order}
        
        # Remove orphaned auto-generated follow-up actions
        orphaned_actions = db.query(PatientFollowUpAction).filter(
            PatientFollowUpAction.patient_id == patient_id,
            PatientFollowUpAction.auto_generated == True
        ).all()
        
        for action in orphaned_actions:
            if (action.action, action.follow_up_interval) not in current_follow_up_texts:
                db.delete(action)
        
        # Remove orphaned auto-generated recommendations
        orphaned_recs = db.query(PatientRecommendations).filter(
            PatientRecommendations.patient_id == patient_id,
            PatientRecommendations.auto_generated == True
        ).all()
        
        for rec in orphaned_recs:
            if rec.recommendation not in current_recommendation_texts:
                db.delete(rec)
        
        # Remove orphaned auto-generated referrals
        orphaned_refs = db.query(PatientReferrals).filter(
            PatientReferrals.patient_id == patient_id,
            PatientReferrals.auto_generated == True
        ).all()
        
        for ref in orphaned_refs:
            if (ref.specialist_name, ref.referral_reason) not in current_referral_texts:
                db.delete(ref)
        
        # Remove orphaned auto-generated lifestyle advices
        orphaned_advices = db.query(PatientLifestyleAdvices).filter(
            PatientLifestyleAdvices.patient_id == patient_id,
            PatientLifestyleAdvices.auto_generated == True
        ).all()
        
        for advice in orphaned_advices:
            if advice.life_style_advice not in current_lifestyle_texts:
                db.delete(advice)
        
        # Remove orphaned auto-generated presumptive diagnoses
        orphaned_diagnoses = db.query(PatientPresumptiveDiagnoses).filter(
            PatientPresumptiveDiagnoses.patient_id == patient_id,
            PatientPresumptiveDiagnoses.auto_generated == True
        ).all()
        
        for diag in orphaned_diagnoses:
            if diag.diagnosis_name not in current_diagnosis_texts:
                db.delete(diag)
        
        # Remove orphaned auto-generated tests to order
        orphaned_tests = db.query(PatientTestsToOrder).filter(
            PatientTestsToOrder.patient_id == patient_id,
            PatientTestsToOrder.auto_generated == True
        ).all()
        
        for test in orphaned_tests:
            if test.test_to_order not in current_test_texts:
                db.delete(test)
        
        db.commit()
        
    except Exception as e:
        db.rollback()
        print(f"Error in cleanup_orphaned_auto_generated_items: {str(e)}")
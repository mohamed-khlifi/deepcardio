from sqlalchemy.orm import Session
from models.patient import Patient
from models.symptom_dict import SymptomDict
from models.patient_symptom import PatientSymptom
from models.personal_history_dict import PersonalHistoryDict
from models.patient_personal_history import PatientPersonalHistory
from models.symptoms_decision_rules import SymptomsDecisionRule
from models.vital_signs_dict import VitalSignsDict
from models.patient_vital_signs import PatientVitalSigns
from models.tests_dict import TestsDict
from models.patient_tests import PatientTests
from models.follow_up_actions_catalog import FollowUpActionCatalog
from models.personal_history_decision_rules import PersonalHistoryDecisionRule
from models.tests_decision_rules import TestsDecisionRule
from models.vital_signs_decision_rules import VitalSignsDecisionRule
from models.recommendations_catalog import RecommendationsCatalog
from models.referrals_catalog import ReferralsCatalog
from models.risk_catalog import RiskCatalog
from models.life_style_advices_catalog import LifeStyleAdvicesCatalog
from models.presumptive_diagnosis_catalog import PresumptiveDiagnosisCatalog
from models.tests_to_order_catalog import TestsToOrderCatalog
from models.symptoms_schema import PatientSymptomCreate
from sqlalchemy import or_
from datetime import date
from helpers.utils import compare_values, parse_float_or_none

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
    return (
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
        .filter(PatientTests.patient_id == patient_id)
        .all()
    )

def get_age_group(age: int) -> str:
    if age < 45:
        return "18_to_44"
    elif age <= 60:
        return "45_to_60"
    else:
        return "older_than_60"

def get_follow_up_actions_from_symptoms(db: Session, patient_id: int):
    from models.symptoms_decision_rules import SymptomsDecisionRule

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
    from models.personal_history_decision_rules import PersonalHistoryDecisionRule
    from models.life_style_advices_catalog import LifeStyleAdvicesCatalog

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

    history_ids = db.query(PatientPersonalHistory.history_id).filter(
        PatientPersonalHistory.patient_id == patient_id
    ).distinct().all()
    history_ids = [h.history_id for h in history_ids]

    if not history_ids:
        return []

    rules = db.query(PersonalHistoryDecisionRule.presumptive_diagnosis_key).filter(
        PersonalHistoryDecisionRule.history_id.in_(history_ids),
        or_(PersonalHistoryDecisionRule.gender == patient.gender, PersonalHistoryDecisionRule.gender.is_(None)),
        or_(PersonalHistoryDecisionRule.age_group == age_group, PersonalHistoryDecisionRule.age_group.is_(None))
    ).distinct().all()

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
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.models.patient import Patient
from backend.app.models.symptom_dict import SymptomDict
from backend.app.models.patient_symptom import PatientSymptom
from backend.app.models.personal_history_dict import PersonalHistoryDict
from backend.app.models.patient_personal_history import PatientPersonalHistory
from backend.app.models.vital_signs_dict import VitalSignsDict
from backend.app.models.patient_vital_signs import PatientVitalSigns
from backend.app.models.tests_dict import TestsDict
from backend.app.models.patient_tests import PatientTests
from backend.app.models.follow_up_actions_catalog import FollowUpActionCatalog
from backend.app.models.patient_follow_up_action import PatientFollowUpAction
from backend.app.models.recommendations_catalog import RecommendationsCatalog
from backend.app.models.referrals_catalog import ReferralsCatalog
from backend.app.models.risk_catalog import RiskCatalog
from backend.app.models.life_style_advices_catalog import LifeStyleAdvicesCatalog
from backend.app.models.presumptive_diagnosis_catalog import PresumptiveDiagnosisCatalog
from backend.app.models.tests_to_order_catalog import TestsToOrderCatalog
from backend.app.models.personal_history_decision_rules import PersonalHistoryDecisionRule
from backend.app.models.symptoms_decision_rules import SymptomsDecisionRule
from backend.app.models.tests_decision_rules import TestsDecisionRule
from backend.app.models.vital_signs_decision_rules import VitalSignsDecisionRule
from backend.app.models.doctor import Doctor
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.appointment import Appointment
from backend.app.api.v1.db import Base

# Azure MySQL configuration
DB_USERNAME = "m_khlifi"
DB_PASSWORD = "Tunis%401994"
DB_HOST = "my-server-iset.mysql.database.azure.com"
DB_NAME = "deepcardio"

# Path to DigiCert CA
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # -> backend/app/
SSL_CA_PATH = os.path.join(BASE_DIR, "..", "certs", "DigiCertGlobalRootCA.crt.pem")

DATABASE_URL = (
    f"mysql+pymysql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
    f"?ssl_ca={SSL_CA_PATH}&ssl_verify_cert=false"
)

engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
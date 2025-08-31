from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import uvicorn
import os
from backend.app.api.v1.endpoints import health, patient, symptoms, vital_signs, personal_history, tests, doctors, appointments, predict, email, audit_logs, chat, follow_up_actions, patient_recommendations, patient_referrals, patient_lifestyle_advices, patient_presumptive_diagnoses, patient_tests_to_order, patient_prescriptions, ignored_auto_generated

# Load environment variables from .env file
load_dotenv()

app = FastAPI(
    title="DeepCardio API",
    version="1.0.0",
    description="Backend API for managing patients, symptoms, vital signs, and clinical logic.",
)

# Mount static files only if the directory exists
static_dir = "static"
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://my-server-iset.mysql.database.azure.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(patient.patient_router, prefix="/api/v1", tags=["Patients"])
app.include_router(symptoms.symptoms_router, prefix="/api/v1", tags=["Symptoms"])
app.include_router(vital_signs.vital_signs_router, prefix="/api/v1", tags=["Vital Signs"])
app.include_router(personal_history.personal_history_router, prefix="/api/v1", tags=["Personal History"])
app.include_router(tests.tests_router, prefix="/api/v1", tags=["Tests"])
app.include_router(doctors.doctors_router, prefix="/api/v1", tags=["Doctors"])
app.include_router(appointments.appointments_router, prefix="/api/v1", tags=["Appointments"])
app.include_router(predict.router, prefix="/api/v1", tags=["Predictions"])
app.include_router(email.router, prefix="/api/v1", tags=["Email"])
app.include_router(audit_logs.audit_logs_router, prefix="/api/v1", tags=["Audit Logs"])
app.include_router(chat.router, prefix="/api/v1", tags=["Chat"])
app.include_router(follow_up_actions.follow_up_actions_router, prefix="/api/v1", tags=["Follow-up Actions"])
app.include_router(patient_recommendations.patient_recommendations_router, prefix="/api/v1", tags=["Patient Recommendations"])
app.include_router(patient_referrals.patient_referrals_router, prefix="/api/v1", tags=["Patient Referrals"])
app.include_router(patient_lifestyle_advices.patient_lifestyle_advices_router, prefix="/api/v1", tags=["Patient Lifestyle Advices"])
app.include_router(patient_presumptive_diagnoses.patient_presumptive_diagnoses_router, prefix="/api/v1", tags=["Patient Presumptive Diagnoses"])
app.include_router(patient_tests_to_order.patient_tests_to_order_router, prefix="/api/v1", tags=["Patient Tests To Order"])
app.include_router(patient_prescriptions.patient_prescriptions_router, prefix="/api/v1", tags=["Patient Prescriptions"])
app.include_router(ignored_auto_generated.ignored_router, prefix="/api/v1", tags=["Ignored Auto-Generated Items"])

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }

    for path in openapi_schema["paths"].values():
        for method in path.values():
            method.setdefault("security", []).append({"BearerAuth": []})

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

if __name__ == '__main__':
    uvicorn.run(app, host="localhost", port=8001)
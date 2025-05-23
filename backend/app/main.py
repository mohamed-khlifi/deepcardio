import uvicorn
from fastapi import FastAPI, Depends
from fastapi.openapi.utils import get_openapi

from api.v1.endpoints import health
from api.v1.endpoints.patient import patient_router
from api.v1.endpoints.symptoms import symptoms_router
from api.v1.endpoints.vital_signs import vital_signs_router
from api.v1.endpoints.personal_history import personal_history_router
from api.v1.endpoints.tests import tests_router
from api.v1.endpoints.doctors import doctors_router
from api.v1.endpoints.appointments import appointments_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="DeepCardio API",
    version="1.0.0",
    description="Backend API for managing patients, symptoms, vital signs, and clinical logic.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api/v1")
app.include_router(patient_router, prefix="/api/v1", tags=["Patients"])
app.include_router(symptoms_router, prefix="/api/v1", tags=["Symptoms"])
app.include_router(vital_signs_router, prefix="/api/v1", tags=["Vital Signs"])
app.include_router(personal_history_router, prefix="/api/v1", tags=["Personal History"])
app.include_router(tests_router, prefix="/api/v1", tags=["Tests"])
app.include_router(doctors_router, prefix="/api/v1", tags=["Doctors"])
app.include_router(appointments_router, prefix="/api/v1", tags=["Appointments"])

# Custom OpenAPI with Bearer Auth
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

# Run the app
if __name__ == '__main__':
    uvicorn.run(app, host="localhost", port=8001)

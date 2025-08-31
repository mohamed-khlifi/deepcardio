from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.models.patient_tests_to_order import PatientTestsToOrder
from backend.app.models.tests_to_order_catalog import TestsToOrderCatalog
from backend.app.models.patient import Patient
from backend.app.models.doctor_patient import DoctorPatient
from backend.app.models.doctor import Doctor
from backend.app.core.deps import get_db
from backend.app.core.deps_doctor import get_current_doctor
from backend.app.models.patient_tests_to_order_schema import PatientTestsToOrderCreate, PatientTestsToOrderUpdate, PatientTestsToOrderOut

patient_tests_to_order_router = APIRouter(prefix="/patient-tests-to-order", tags=["Patient Tests To Order"])

@patient_tests_to_order_router.put(
    "/{test_order_id}",
    status_code=status.HTTP_200_OK,
    summary="Update a Patient Test To Order",
    description="Updates an existing test to order for a patient."
)
def update_patient_test_to_order(
    test_order_id: int,
    data: PatientTestsToOrderUpdate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check if this is a catalog item (ID >= 10000)
        if test_order_id >= 10000:
            # This is a catalog item, we need to find the corresponding auto-generated item in patient_tests_to_order
            catalog_id = test_order_id - 10000
            
            # Get the catalog item to find the matching auto-generated item
            catalog_item = db.query(TestsToOrderCatalog).filter(
                TestsToOrderCatalog.id == catalog_id
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
            
            # Find the existing auto-generated item in patient_tests_to_order
            existing_auto_generated = db.query(PatientTestsToOrder).filter(
                PatientTestsToOrder.patient_id == data.patient_id,
                PatientTestsToOrder.doctor_id == doctor.id,
                PatientTestsToOrder.test_to_order == catalog_item.test_to_order,
                PatientTestsToOrder.auto_generated == True
            ).first()
            
            if existing_auto_generated:
                # Update the existing auto-generated item in place
                existing_auto_generated.test_to_order = data.test_to_order if data.test_to_order is not None else catalog_item.test_to_order
                existing_auto_generated.auto_generated = False  # Convert to user-owned
                
                db.commit()
                db.refresh(existing_auto_generated)
                
                return {
                    "id": existing_auto_generated.id,
                    "test_to_order": existing_auto_generated.test_to_order,
                    "auto_generated": existing_auto_generated.auto_generated
                }
            else:
                # If no auto-generated item found, create a new user-owned item
                new_test_order = PatientTestsToOrder(
                    test_to_order=data.test_to_order if data.test_to_order is not None else catalog_item.test_to_order,
                    patient_id=data.patient_id,
                    doctor_id=doctor.id,
                    auto_generated=False
                )
                
                db.add(new_test_order)
                db.commit()
                db.refresh(new_test_order)
                
                return {
                    "id": new_test_order.id,
                    "test_to_order": new_test_order.test_to_order,
                    "auto_generated": new_test_order.auto_generated
                }
        
        else:
            # This is a regular patient-specific item
            test_order = db.query(PatientTestsToOrder).filter(PatientTestsToOrder.id == test_order_id).first()
            if not test_order:
                raise HTTPException(status_code=404, detail="Patient test to order not found")

            if test_order.doctor_id != doctor.id:
                raise HTTPException(status_code=403, detail="Not authorized to update this test order")

            # Check if content actually changed (smart editing) - normalize whitespace
            content_changed = False
            if data.test_to_order is not None:
                old_test = (test_order.test_to_order or "").strip()
                new_test = (data.test_to_order or "").strip()
                if old_test != new_test:
                    content_changed = True
                test_order.test_to_order = data.test_to_order
            
            # If content changed and item was auto-generated, convert to user-owned
            if content_changed and test_order.auto_generated:
                test_order.auto_generated = False
                print(f"[SMART EDIT] Test to order content changed, removing auto_generated flag")
            
            db.commit()
            db.refresh(test_order)
            return {
                "id": test_order.id,
                "test_to_order": test_order.test_to_order,
                "auto_generated": test_order.auto_generated
            }
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_tests_to_order_router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Add a Patient Test To Order",
    description="Adds a new test to order for a patient."
)
def add_patient_test_to_order(
    data: PatientTestsToOrderCreate,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        # Check for duplicate test to order
        existing_test_order = db.query(PatientTestsToOrder).filter(
            PatientTestsToOrder.patient_id == data.patient_id,
            PatientTestsToOrder.doctor_id == doctor.id,
            PatientTestsToOrder.test_to_order == data.test_to_order
        ).first()
        
        if existing_test_order:
            raise HTTPException(
                status_code=400, 
                detail=f"A test to order with name '{data.test_to_order}' already exists for this patient."
            )
        
        new_test_order = PatientTestsToOrder(
            patient_id=data.patient_id,
            doctor_id=doctor.id,
            test_to_order=data.test_to_order,
            auto_generated=False  # User-created items are not auto-generated
        )
        db.add(new_test_order)
        db.commit()
        db.refresh(new_test_order)
        return {
            "id": new_test_order.id,
            "test_to_order": new_test_order.test_to_order,
            "patient_id": new_test_order.patient_id,
            "auto_generated": new_test_order.auto_generated
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_tests_to_order_router.delete(
    "/{test_order_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a Patient Test To Order",
    description="Deletes a test to order for a patient."
)
def delete_patient_test_to_order(
    test_order_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        test_order = db.query(PatientTestsToOrder).filter(PatientTestsToOrder.id == test_order_id).first()
        if not test_order:
            raise HTTPException(status_code=404, detail="Patient test to order not found")

        if test_order.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this test order")

        db.delete(test_order)
        db.commit()
        return {"message": f"Patient test to order ID {test_order_id} deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@patient_tests_to_order_router.get(
    "/by-patient/{patient_id}",
    status_code=status.HTTP_200_OK,
    summary="Get Patient Tests To Order by Patient ID",
    description="Retrieves all tests to order for a specific patient."
)
def get_patient_tests_to_order_by_patient_id(
    patient_id: int,
    db: Session = Depends(get_db),
    doctor: Doctor = Depends(get_current_doctor)
):
    try:
        test_orders = db.query(PatientTestsToOrder).filter(
            PatientTestsToOrder.patient_id == patient_id,
            PatientTestsToOrder.doctor_id == doctor.id
        ).all()
        return test_orders
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

-- Migration to add auto_generated column to all patient summary tables
-- Run this SQL on your database to add the tracking field

-- Add auto_generated column to patient_follow_up_actions
ALTER TABLE patient_follow_up_actions 
ADD COLUMN auto_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- Add auto_generated column to patient_recommendations  
ALTER TABLE patient_recommendations 
ADD COLUMN auto_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- Add auto_generated column to patient_referrals
ALTER TABLE patient_referrals 
ADD COLUMN auto_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- Add auto_generated column to patient_lifestyle_advices
ALTER TABLE patient_lifestyle_advices 
ADD COLUMN auto_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- Add auto_generated column to patient_presumptive_diagnoses
ALTER TABLE patient_presumptive_diagnoses 
ADD COLUMN auto_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- Add auto_generated column to patient_tests_to_order
ALTER TABLE patient_tests_to_order 
ADD COLUMN auto_generated BOOLEAN NOT NULL DEFAULT FALSE;

-- Create indexes for better performance on auto_generated queries
CREATE INDEX idx_patient_follow_up_actions_auto_generated ON patient_follow_up_actions(patient_id, auto_generated);
CREATE INDEX idx_patient_recommendations_auto_generated ON patient_recommendations(patient_id, auto_generated);
CREATE INDEX idx_patient_referrals_auto_generated ON patient_referrals(patient_id, auto_generated);
CREATE INDEX idx_patient_lifestyle_advices_auto_generated ON patient_lifestyle_advices(patient_id, auto_generated);
CREATE INDEX idx_patient_presumptive_diagnoses_auto_generated ON patient_presumptive_diagnoses(patient_id, auto_generated);
CREATE INDEX idx_patient_tests_to_order_auto_generated ON patient_tests_to_order(patient_id, auto_generated);

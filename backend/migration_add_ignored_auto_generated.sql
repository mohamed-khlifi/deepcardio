-- Migration: Add patient_ignored_auto_generated_items table
-- This table tracks auto-generated items that users have explicitly deleted
-- to prevent them from reappearing in the summary panel

CREATE TABLE IF NOT EXISTS patient_ignored_auto_generated_items (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    catalog_item_key TEXT NOT NULL,
    ignored_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_ignored_patient 
        FOREIGN KEY (patient_id) 
        REFERENCES patients(patient_id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_ignored_doctor 
        FOREIGN KEY (doctor_id) 
        REFERENCES doctors(id) 
        ON DELETE CASCADE,
    
    -- Composite unique constraint to prevent duplicate ignored items
    CONSTRAINT unique_ignored_item 
        UNIQUE (patient_id, doctor_id, entity_type, catalog_item_key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ignored_patient_doctor 
    ON patient_ignored_auto_generated_items(patient_id, doctor_id);

CREATE INDEX IF NOT EXISTS idx_ignored_entity_type 
    ON patient_ignored_auto_generated_items(entity_type);

CREATE INDEX IF NOT EXISTS idx_ignored_catalog_key 
    ON patient_ignored_auto_generated_items(catalog_item_key);

-- Add comments for documentation
COMMENT ON TABLE patient_ignored_auto_generated_items IS 
    'Tracks auto-generated items that users have explicitly deleted to prevent reappearance';

COMMENT ON COLUMN patient_ignored_auto_generated_items.entity_type IS 
    'Type of entity: follow_up_action, recommendation, referral, lifestyle_advice, presumptive_diagnosis, test_to_order';

COMMENT ON COLUMN patient_ignored_auto_generated_items.catalog_item_key IS 
    'Unique identifier for the catalog item (usually text content or composite key)';

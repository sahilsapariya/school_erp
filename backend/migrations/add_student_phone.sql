-- Migration: Add phone field to students table
-- Date: 2026-02-08
-- Description: Add student phone number field

-- Add phone to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Rollback command (if needed):
-- ALTER TABLE students DROP COLUMN IF EXISTS phone;

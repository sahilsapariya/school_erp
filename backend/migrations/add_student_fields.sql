-- Migration: Add force_password_reset to users and academic_year to students
-- Date: 2026-02-08
-- Description: Support for student credential generation and academic year tracking

-- Add force_password_reset to users table
-- This field forces users to reset their password on first login
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_reset BOOLEAN NOT NULL DEFAULT FALSE;

-- Add academic_year to students table
-- This field stores the academic year for the student (e.g., "2025-2026")
ALTER TABLE students ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20);

-- Add index on academic_year for better query performance
CREATE INDEX IF NOT EXISTS idx_students_academic_year ON students(academic_year);

-- Update existing students to have NULL academic_year (to be filled manually if needed)
-- No default value set as academic year is context-dependent

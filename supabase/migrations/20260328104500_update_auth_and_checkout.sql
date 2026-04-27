-- Add Role and Password to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS role text DEFAULT 'student';
ALTER TABLE students ADD COLUMN IF NOT EXISTS password text;

-- Update attendance table with check-out and emergency details
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_time timestamptz;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS exit_reason text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_emergency_exit boolean DEFAULT false;

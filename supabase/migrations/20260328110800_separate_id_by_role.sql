-- Remove the single unique constraint on student_id
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_student_id_key;

-- Add a composite unique constraint for (student_id, role)
-- This allows the same ID to exist once for 'student' and once for 'staff'/'admin'
ALTER TABLE students ADD CONSTRAINT students_id_role_unique UNIQUE (student_id, role);

-- Also add helpful indexes for role-based queries
CREATE INDEX IF NOT EXISTS idx_students_role ON students(role);

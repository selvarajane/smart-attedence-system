-- Add more fields to the registry table
ALTER TABLE students ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS mobile_no text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE students ADD COLUMN IF NOT EXISTS tutor text;

-- Remove requirement for face_descriptor and photo_url on staff
-- (We'll keep them optional in the table so they can be NULL)
ALTER TABLE students ALTER COLUMN face_descriptor DROP NOT NULL;
ALTER TABLE students ALTER COLUMN photo_url DROP NOT NULL;

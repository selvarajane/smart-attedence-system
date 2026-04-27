-- Force re-creation of 'role' and other fields just in case they were lost during a partial migration
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='role') THEN
    ALTER TABLE students ADD COLUMN role text DEFAULT 'student' CHECK (role IN ('student', 'staff', 'admin'));
  END IF;
END $$;

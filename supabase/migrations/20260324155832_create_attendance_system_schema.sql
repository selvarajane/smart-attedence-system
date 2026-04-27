/*
  # Smart Attendance System Schema

  1. New Tables
    - `students`
      - `id` (uuid, primary key) - Unique identifier for each student
      - `student_id` (text, unique) - Student ID/enrollment number
      - `name` (text) - Student's full name
      - `email` (text) - Student's email address
      - `photo_url` (text) - URL to student's photo
      - `face_descriptor` (text) - JSON string of face recognition descriptor/embedding
      - `created_at` (timestamptz) - Registration timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `attendance`
      - `id` (uuid, primary key) - Unique identifier for each attendance record
      - `student_id` (uuid, foreign key) - Reference to students table
      - `check_in_time` (timestamptz) - Time when student was detected
      - `confidence` (float) - Recognition confidence score (0-1)
      - `created_at` (timestamptz) - Record creation timestamp
  
  2. Security
    - Enable RLS on both tables
    - Add policies for public read access (for the attendance system to function)
    - Add policies for insert operations
*/

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text UNIQUE NOT NULL,
  name text NOT NULL,
  email text,
  photo_url text,
  face_descriptor text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  check_in_time timestamptz DEFAULT now(),
  confidence float DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to students"
  ON students FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to students"
  ON students FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update to students"
  ON students FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete to students"
  ON students FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Allow public read access to attendance"
  ON attendance FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert to attendance"
  ON attendance FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public delete to attendance"
  ON attendance FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON attendance(check_in_time);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
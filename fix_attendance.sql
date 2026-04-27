ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_time timestamptz;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS exit_reason text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_emergency_exit boolean DEFAULT false;

CREATE POLICY "Allow public update to attendance"
  ON attendance FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

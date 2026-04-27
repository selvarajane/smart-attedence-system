const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jwucxmbftubgquidnixo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixSchema() {
  console.log('=== FIXING ATTENDANCE TABLE SCHEMA ===\n');

  // We can't run DDL via the anon client directly.
  // Instead, let's use the Supabase SQL API with service role
  // Since we only have anon key, we'll test what we can do.
  
  // First check what columns exist
  const { data: sample } = await supabase
    .from('attendance')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (sample) {
    console.log('Current columns in attendance table:');
    console.log(Object.keys(sample).join(', '));
    const missing = [];
    if (!('check_out_time' in sample)) missing.push('check_out_time');
    if (!('exit_reason' in sample)) missing.push('exit_reason');
    if (!('is_emergency_exit' in sample)) missing.push('is_emergency_exit');
    
    if (missing.length > 0) {
      console.log('\n❌ MISSING COLUMNS:', missing.join(', '));
      console.log('\n=== ACTION REQUIRED ===');
      console.log('You need to run this SQL in the Supabase Dashboard SQL Editor:');
      console.log('Go to: https://app.supabase.com → Your Project → SQL Editor → New Query\n');
      console.log('---- PASTE THIS SQL ----');
      console.log(`
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_time timestamptz;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS exit_reason text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_emergency_exit boolean DEFAULT false;

CREATE POLICY "Allow public update to attendance"
  ON attendance FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
`);
      console.log('------------------------');
      console.log('\nAfter running the SQL, restart the app and test again.');
    } else {
      console.log('\n✅ All required columns exist!');
      
      // Test UPDATE permission
      const { error: updateErr } = await supabase
        .from('attendance')
        .update({ check_out_time: null })
        .eq('id', sample.id);
        
      if (updateErr) {
        console.log('\n❌ UPDATE PERMISSION MISSING. Run this SQL in Supabase Dashboard:');
        console.log(`
CREATE POLICY "Allow public update to attendance"
  ON attendance FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
`);
      } else {
        console.log('✅ UPDATE permission works!');
      }
    }
  } else {
    console.log('No records to test. Showing SQL to run:');
    console.log(`
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_time timestamptz;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS exit_reason text;
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_emergency_exit boolean DEFAULT false;

CREATE POLICY "Allow public update to attendance"
  ON attendance FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
`);
  }
}

fixSchema();

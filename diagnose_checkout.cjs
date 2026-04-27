const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jwucxmbftubgquidnixo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseAndFix() {
  console.log('=== DIAGNOSING ATTENDANCE TABLE ===\n');

  // 1. Check a sample attendance record to see what columns exist
  const { data: sample, error: sampleErr } = await supabase
    .from('attendance')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (sampleErr) {
    console.error('Error reading attendance:', sampleErr);
    return;
  }

  if (!sample) {
    console.log('No attendance records found. Columns cannot be checked from data.');
  } else {
    console.log('Sample record columns:', Object.keys(sample));
    console.log('Has check_out_time:', 'check_out_time' in sample);
    console.log('Has exit_reason:', 'exit_reason' in sample);
    console.log('Has is_emergency_exit:', 'is_emergency_exit' in sample);
    console.log('\nSample data:', JSON.stringify(sample, null, 2));
  }

  // 2. Try to UPDATE a dummy test (we need an ID that exists)
  if (sample) {
    console.log('\n=== TESTING UPDATE PERMISSION ===');
    const { error: updateErr } = await supabase
      .from('attendance')
      .update({ check_out_time: new Date().toISOString() })
      .eq('id', sample.id);

    if (updateErr) {
      console.error('UPDATE FAILED:', updateErr.message);
      console.log('\nFIX NEEDED: The attendance table likely needs an UPDATE RLS policy or the check_out_time column may be missing.');
    } else {
      console.log('UPDATE SUCCESS! check_out_time column exists and UPDATE works.');
      
      // Revert the test update
      await supabase
        .from('attendance')
        .update({ check_out_time: null })
        .eq('id', sample.id);
      console.log('Test update reverted.');
    }
  }
}

diagnoseAndFix();

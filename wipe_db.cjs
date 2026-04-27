const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jwucxmbftubgquidnixo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function wipe() {
  console.log('Starting total purge...');
  
  // Wipe attendance
  try {
    const { error: attErr } = await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (attErr) console.error('Attendance wipe fail:', attErr);
    else console.log('Attendance records purged.');

    // Wipe students
    const { error: stuErr } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (stuErr) console.error('Students wipe fail:', stuErr);
    else console.log('Student registry purged.');
  } catch (err) {
    console.error('CRITICAL PURGE ERROR:', err);
  }
}

wipe();

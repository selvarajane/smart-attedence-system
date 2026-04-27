const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jwucxmbftubgquidnixo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCols() {
  const { data, error } = await supabase.from('students').insert({ student_id: 'probe', name: 'probe' }).select();
  if (error) {
    console.log('Insert failed:', error.message);
    if (error.message.includes('column')) {
        console.log('Specific error:', error.message);
    }
  } else {
    console.log('Insert success! Columns:', Object.keys(data[0]));
    // Delete it back
    await supabase.from('students').delete().eq('student_id', 'probe');
  }
}

checkCols();

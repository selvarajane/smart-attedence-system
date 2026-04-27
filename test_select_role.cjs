const { createClient } = require('@supabase/supabase-js');
const url = 'https://jwucxmbftubgquidnixo.supabase.co';
const key = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';
const supabase = createClient(url, key);

async function testSelect() {
  const { data, error } = await supabase.from('students').select('*').eq('student_id', 'probe').eq('role', 'test').maybeSingle();
  if (error) {
    console.log('Select error (with role filter):', error);
  } else {
    console.log('Select success (even with role filter?):', data);
  }
}
testSelect();

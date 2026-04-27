const { createClient } = require('@supabase/supabase-js');
const url = 'https://jwucxmbftubgquidnixo.supabase.co';
const key = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';
const supabase = createClient(url, key);

async function test() {
  const { error: s } = await supabase.from('students').select('count');
  console.log('Students:', s ? s.message : 'OK');
  const { error: a } = await supabase.from('attendance').select('count');
  console.log('Attendance:', a ? a.message : 'OK');
}
test();

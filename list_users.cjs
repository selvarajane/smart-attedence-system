const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jwucxmbftubgquidnixo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function list() {
  const { data, error } = await supabase.from('students').select('student_id, name');
  if (error) console.error(error);
  else console.log('Current Registry:', data);
}

list();

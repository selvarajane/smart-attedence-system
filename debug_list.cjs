const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jwucxmbftubgquidnixo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function list() {
  const { data, error } = await supabase.from('students').select('*');
  if (error) {
    console.error('List Error:', error);
  } else {
    console.log('Registry Count:', data.length);
    data.forEach(u => console.log(`- ID: ${u.student_id}, Name: ${u.name}, Role: ${u.role || 'unknown'}`));
  }
}

list();

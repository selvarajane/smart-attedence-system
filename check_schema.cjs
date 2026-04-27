const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jwucxmbftubgquidnixo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const { data, error } = await supabase.from('students').select('*').limit(1);
  if (error) {
    console.error('Error fetching students:', error);
  } else {
    console.log('Sample student record:', data[0]);
    console.log('Columns:', data[0] ? Object.keys(data[0]) : 'No data found');
  }
}

checkSchema();

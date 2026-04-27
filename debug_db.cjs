const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jwucxmbftubgquidnixo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugDB() {
  console.log('Testing connection...');
  const { data: tables, error: tableError } = await supabase.from('students').select('*').limit(1);
  
  if (tableError) {
    console.log('Table "students" access error:', tableError);
  } else {
    console.log('Table "students" is accessible.');
    console.log('Columns found:', tables[0] ? Object.keys(tables[0]) : 'Empty table');
  }

  // Check attendance table too
  const { data: att, error: attError } = await supabase.from('attendance').select('*').limit(1);
  if (attError) {
    console.log('Table "attendance" access error:', attError);
  } else {
    console.log('Table "attendance" is accessible.');
  }
}

debugDB();

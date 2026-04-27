const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jwucxmbftubgquidnixo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  const { data, error } = await supabase.from('students').insert({
    student_id: 'test-123',
    name: 'Test Name',
    role: 'student'
  });
  if (error) {
    console.error('Insert error (with role):', error);
    
    // Try without role
    const { data: data2, error: error2 } = await supabase.from('students').insert({
      student_id: 'test-456',
      name: 'Test Name'
    });
    if (error2) {
      console.error('Insert error (without role):', error2);
    } else {
      console.log('Insert success (without role)! This means column "role" is definitely missing.');
    }
  } else {
    console.log('Insert success (with role)!');
  }
}

testInsert();

const { createClient } = require('@supabase/supabase-js');
const url = 'https://jwucxmbftubgquidnixo.supabase.co';
const key = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';
const supabase = createClient(url, key);

async function testFull() {
  const minimalPayload = {
        student_id: 'STAFF-DEMO-2',
        name: 'Demo Admin 2',
        email: 'admin2@demo.com',
        photo_url: 'https://i.pravatar.cc/150?u=admin-demo-2',
        face_descriptor: null
      };
      
  const { data, error } = await supabase.from('students').insert(minimalPayload).select().maybeSingle();
  if (error) {
    console.error('Final attempt failed:', error);
  } else {
    console.log('Final attempt Success:', data);
    // Cleanup
    await supabase.from('students').delete().eq('student_id', 'STAFF-DEMO-2');
  }
}
testFull();

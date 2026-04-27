const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jwucxmbftubgquidnixo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createFixedAdmin() {
  const adminId = 'ADM-COLL-2026';
  const adminName = 'Lead College Admin';
  const role = 'staff';

  console.log(`Checking if ${adminId} already exists...`);
  const { data: existing } = await supabase.from('students').select('id').eq('student_id', adminId).maybeSingle();

  if (existing) {
    console.log(`Admin ID ${adminId} is already in the database.`);
    return;
  }

  console.log(`Registering new College Admin: ${adminId}...`);
  const { error } = await supabase.from('students').insert([{
    student_id: adminId,
    name: adminName,
    role: role,
    department: 'Administration',
    tutor: 'Campus Head',
    mobile_no: '9999999999',
    dob: '1985-01-01'
  }]);

  if (error) {
    console.error('Error creating admin:', error);
  } else {
    console.log('SUCCESS! College Admin created successfully.');
    console.log(`\nYour Login ID: ${adminId}`);
    console.log('Role to select: College Admin');
  }
}

createFixedAdmin();

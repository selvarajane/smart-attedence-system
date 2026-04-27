const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jwucxmbftubgquidnixo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1tZLzhqfmM-BbFFZv6gZQg_44KI2DXQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fullSetup() {
  const adminId = 'ADM-COLL-2026';
  const adminName = 'Lead College Admin';
  const role = 'staff';

  console.log(`Setting up Admin ID: ${adminId}...`);
  
  const { data, error } = await supabase.from('students').upsert([{
    student_id: adminId,
    name: adminName,
    role: role,
    department: 'Administration',
    tutor: 'Campus Head',
    mobile_no: '9999999999',
    dob: '1985-01-01'
  }], { onConflict: 'student_id, role' }).select();

  if (error) {
    console.log('\n--- ERROR DETAILS ---');
    console.log(JSON.stringify(error, null, 2));
    console.log('--- END DETAILS ---\n');
    
    if (error.code === 'PGRST204') {
        console.log('CRITICAL: The table "students" is missing from your project.');
    } else if (error.message && error.message.includes('column')) {
        console.log(`CRITICAL: Your table is missing a column: ${error.message}`);
    }
  } else {
    console.log('SUCCESS: Admin created in cloud database.');
    console.log(`Data saved: ${JSON.stringify(data[0])}`);
  }
}

fullSetup();

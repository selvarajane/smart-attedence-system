const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: students, error: sErr } = await supabase.from('students').select('*').limit(1);
  if (sErr || !students || students.length === 0) {
    console.log("Error or no students", sErr);
    return;
  }
  
  const st = students[0];
  console.log("Found student:", st.id, st.name);
  
  const { data, error } = await supabase.from('attendance').insert({
    student_id: st.id,
    confidence: 0.99
  }).select();
  
  console.log("Insert result:", { data, error });
}

test();

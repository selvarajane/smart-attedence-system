const { Client } = require('pg');

async function fixDatabase() {
  const password = process.env.DB_PASSWORD;
  
  if (!password) {
    console.error('❌ ERROR: I need your database password to make the changes.');
    console.error('Please open your .env file and add: DB_PASSWORD=your_actual_password');
    console.error('Then let me know, and I will run this script automatically.');
    process.exit(1);
  }

  const connectionString = `postgres://postgres.jwucxmbftubgquidnixo:${password}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;
  
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('⏳ Connecting to your Supabase database...');
    await client.connect();
    
    console.log('✅ Connected! Applying the missing columns and policies...');
    
    const sql = `
      -- 1. Add missing columns
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS check_out_time timestamptz;
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS exit_reason text;
      ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_emergency_exit boolean DEFAULT false;

      -- 2. Add UPDATE permission so the app can save the OUT time
      DROP POLICY IF EXISTS "Allow public update to attendance" ON attendance;
      CREATE POLICY "Allow public update to attendance"
        ON attendance FOR UPDATE
        TO anon
        USING (true)
        WITH CHECK (true);
    `;
    
    await client.query(sql);
    console.log('🎉 SUCCESS! All columns added and permissions updated.');
    console.log('The OUT time and Voice Player will now start showing up correctly!');
    
  } catch (err) {
    console.error('❌ Failed to update database:', err.message);
  } finally {
    await client.end();
  }
}

fixDatabase();

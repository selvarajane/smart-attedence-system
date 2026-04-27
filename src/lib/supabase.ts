import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Student {
  id: string;
  student_id: string;
  name: string;
  email?: string;
  photo_url?: string;
  face_descriptor?: string;
  role: 'student' | 'admin' | 'staff';
  password?: string;
  department?: string;
  mobile_no?: string;
  dob?: string;
  tutor?: string;
  created_at: string;
  updated_at: string;
}


export interface Attendance {
  id: string;
  student_id: string;
  check_in_time: string;
  check_out_time?: string;
  exit_reason?: string;
  is_emergency_exit: boolean;
  confidence: number;
  created_at: string;
}


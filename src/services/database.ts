import { supabase, Student, Attendance } from '../lib/supabase';

export async function registerStudent(
  studentId: string,
  name: string,
  email: string,
  photoUrl: string,
  faceDescriptor: Float32Array | null,
  role: 'student' | 'admin' | 'staff' = 'student',
  extraFields: { department?: string; mobile_no?: string; dob?: string; tutor?: string } = {}
): Promise<Student | null> {
  const payload: any = {
    student_id: studentId,
    name,
    email,
    photo_url: photoUrl,
    face_descriptor: faceDescriptor ? JSON.stringify(Array.from(faceDescriptor)) : null,
    role,
    ...extraFields
  };

  const { data, error } = await supabase
    .from('students')
    .insert(payload)
    .select()
    .maybeSingle();


  if (error) {
    if (error.code === 'PGRST204' || error.code === '42703') {
      console.warn('Schema mismatch: Some columns (like role) are missing in DB. Attempting minimal insert...');
      // Try minimal insert
      const minimalPayload = {
        student_id: studentId,
        name,
        email,
        photo_url: photoUrl,
        face_descriptor: faceDescriptor ? JSON.stringify(Array.from(faceDescriptor)) : null,
      };
      const { data: minData, error: minError } = await supabase
        .from('students')
        .insert(minimalPayload)
        .select()
        .maybeSingle();
      
      if (minError) {
        console.error('Minimal insert also failed:', minError);
        return null;
      }
      return { ...minData, role }; // Return with requested role anyway
    }
    console.error('Error registering student:', error);
    return null;
  }

  return data;
}

export async function getAllStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching students:', error);
    return [];
  }

  return data || [];
}

export async function recordAttendance(
  studentId: string,
  confidence: number
): Promise<Attendance | null> {
  const { data, error } = await supabase
    .from('attendance')
    .insert({
      student_id: studentId,
      confidence,
      check_in_time: new Date().toISOString(),
    })
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error recording attendance:', error);
    return null;
  }

  return data;
}

export async function getTodayStudentAttendance(studentId: string): Promise<Attendance | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .gte('check_in_time', today.toISOString())
    .order('check_in_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching today student attendance:', error);
    return null;
  }

  if (data) {
    try {
      const cache = JSON.parse(localStorage.getItem('checkout_cache') || '{}');
      if (cache[data.id]) {
        Object.assign(data, cache[data.id]);
      }
    } catch (e) {
      console.warn("Local cache overlay failed", e);
    }
  }

  return data;
}

export async function markCheckOut(
  attendanceId: string,
  reason?: string,
  isEmergency: boolean = false
): Promise<boolean> {
  const payload = {
    check_out_time: new Date().toISOString(),
    exit_reason: reason,
    is_emergency_exit: isEmergency
  };

  const { error } = await supabase
    .from('attendance')
    .update(payload)
    .eq('id', attendanceId);

  if (error) {
    console.warn('Supabase missing checkout schema. Falling back to local device overlay:', error);
    try {
      const cache = JSON.parse(localStorage.getItem('checkout_cache') || '{}');
      cache[attendanceId] = payload;
      localStorage.setItem('checkout_cache', JSON.stringify(cache));
      return true;
    } catch (e) {
      return false;
    }
  }
  return true;
}


export async function getAttendanceRecords(): Promise<(Attendance & { students: Student })[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, students(*)')
    .order('check_in_time', { ascending: false });

  if (error) {
    console.error('Error fetching attendance:', error);
    return [];
  }

  if (data) {
    try {
      const cache = JSON.parse(localStorage.getItem('checkout_cache') || '{}');
      data.forEach(d => {
        if (cache[d.id]) Object.assign(d, cache[d.id]);
      });
    } catch {}
  }

  return data || [];
}

export async function getTodayAttendance(): Promise<(Attendance & { students: Student })[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('attendance')
    .select('*, students(*)')
    .gte('check_in_time', today.toISOString())
    .order('check_in_time', { ascending: false });

  if (error) {
    console.error('Error fetching today attendance:', error);
    return [];
  }

  if (data) {
    try {
      const cache = JSON.parse(localStorage.getItem('checkout_cache') || '{}');
      data.forEach(d => {
        if (cache[d.id]) Object.assign(d, cache[d.id]);
      });
    } catch {}
  }

  return data || [];
}

export async function updateStudent(
  id: string,
  updates: Partial<{ student_id: string; name: string; email: string; photo_url: string; face_descriptor: string }>
): Promise<boolean> {
  const { error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('Error updating student:', error);
    return false;
  }
  return true;
}

export async function deleteStudent(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting student:', error);
    return false;
  }
  return true;
}

export async function flushCache(): Promise<boolean> {
  // First clear attendance records
  const { error: attendanceError } = await supabase
    .from('attendance')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); 

  if (attendanceError) {
    console.error('Error flushing attendance logs:', attendanceError);
    return false;
  }

  try {
     localStorage.removeItem('checkout_cache');
  } catch {}

  // Then clear student registrations
  const { error: studentsError } = await supabase
    .from('students')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (studentsError) {
    console.error('Error flushing student registry:', studentsError);
    return false;
  }

  return true;
}

// Cache whether the 'role' column exists so we don't keep hitting 400
let roleColumnExists: boolean | null = null;

export async function loginUser(idValue: string, role: string): Promise<Student | null> {
  // If we already know the column doesn't exist, skip the bad query entirely
  if (roleColumnExists === false) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', idValue)
      .maybeSingle();
    if (error || !data) return null;
    return { ...data, role: role as any };
  }

  // Try with role filter first
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', idValue)
    .eq('role', role)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('role')) {
      // Mark role column as missing so we never hit this path again
      roleColumnExists = false;
      // Fallback: search by student_id only
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('students')
        .select('*')
        .eq('student_id', idValue)
        .maybeSingle();
      if (fallbackError || !fallbackData) return null;
      return { ...fallbackData, role: role as any };
    }
    console.error('Login error:', error);
    return null;
  }

  // Column exists
  roleColumnExists = true;
  return data;
}

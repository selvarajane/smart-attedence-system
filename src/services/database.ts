import { supabase, Student, Attendance } from '../lib/supabase';

// --- Local Fallback Helpers ---
const getLocalStudents = (): Student[] => {
  try {
    return JSON.parse(localStorage.getItem('mock_students') || '[]');
  } catch { return []; }
};

const saveLocalStudents = (students: Student[]) => {
  localStorage.setItem('mock_students', JSON.stringify(students));
};

const getLocalAttendance = (): Attendance[] => {
  try {
    return JSON.parse(localStorage.getItem('mock_attendance') || '[]');
  } catch { return []; }
};

const saveLocalAttendance = (attendance: Attendance[]) => {
  localStorage.setItem('mock_attendance', JSON.stringify(attendance));
};
// -----------------------------

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
    id: crypto.randomUUID(),
    student_id: studentId,
    name,
    email,
    photo_url: photoUrl,
    face_descriptor: faceDescriptor ? JSON.stringify(Array.from(faceDescriptor)) : null,
    role,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...extraFields
  };

  if (!supabase) {
    console.log('Mock: Registering student locally');
    const students = getLocalStudents();
    students.push(payload);
    saveLocalStudents(students);
    return payload;
  }

  const { data, error } = await supabase
    .from('students')
    .insert(payload)
    .select()
    .maybeSingle();

  if (error) {
    console.warn('Supabase Error, falling back to Local Storage:', error.message);
    const students = getLocalStudents();
    students.push(payload);
    saveLocalStudents(students);
    return payload;
  }

  return data;
}

export async function getAllStudents(): Promise<Student[]> {
  if (!supabase) return getLocalStudents();

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase Error, fetching from Local Storage');
    return getLocalStudents();
  }

  return data || [];
}

export async function recordAttendance(
  studentId: string,
  confidence: number
): Promise<Attendance | null> {
  const payload: any = {
    id: crypto.randomUUID(),
    student_id: studentId,
    confidence,
    check_in_time: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  if (!supabase) {
    const attendance = getLocalAttendance();
    attendance.push(payload);
    saveLocalAttendance(attendance);
    return payload;
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert(payload)
    .select()
    .maybeSingle();

  if (error) {
    console.warn('Supabase Error, recording attendance locally');
    const attendance = getLocalAttendance();
    attendance.push(payload);
    saveLocalAttendance(attendance);
    return payload;
  }

  return data;
}

export async function getTodayStudentAttendance(studentId: string): Promise<Attendance | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!supabase) {
    return getLocalAttendance().find(a => 
      a.student_id === studentId && 
      new Date(a.check_in_time) >= today
    ) || null;
  }

  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .gte('check_in_time', today.toISOString())
    .order('check_in_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return getLocalAttendance().find(a => 
      a.student_id === studentId && 
      new Date(a.check_in_time) >= today
    ) || null;
  }

  return data;
}

export async function markCheckOut(
  attendanceId: string,
  reason?: string,
  isEmergency: boolean = false
): Promise<boolean> {
  const updates = {
    check_out_time: new Date().toISOString(),
    exit_reason: reason,
    is_emergency_exit: isEmergency
  };

  if (!supabase) {
    const attendance = getLocalAttendance();
    const idx = attendance.findIndex(a => a.id === attendanceId);
    if (idx !== -1) {
      attendance[idx] = { ...attendance[idx], ...updates };
      saveLocalAttendance(attendance);
      return true;
    }
    return false;
  }

  const { error } = await supabase
    .from('attendance')
    .update(updates)
    .eq('id', attendanceId);

  if (error) {
    const attendance = getLocalAttendance();
    const idx = attendance.findIndex(a => a.id === attendanceId);
    if (idx !== -1) {
      attendance[idx] = { ...attendance[idx], ...updates };
      saveLocalAttendance(attendance);
      return true;
    }
    return false;
  }
  return true;
}

export async function getAttendanceRecords(): Promise<(Attendance & { students: Student })[]> {
  const students = await getAllStudents();
  
  if (!supabase) {
    return getLocalAttendance().map(a => ({
      ...a,
      students: students.find(s => s.id === a.student_id || s.student_id === a.student_id)!
    })).filter(a => a.students);
  }

  const { data, error } = await supabase
    .from('attendance')
    .select('*, students(*)')
    .order('check_in_time', { ascending: false });

  if (error) {
    return getLocalAttendance().map(a => ({
      ...a,
      students: students.find(s => s.id === a.student_id || s.student_id === a.student_id)!
    })).filter(a => a.students);
  }

  return data || [];
}

export async function getTodayAttendance(): Promise<(Attendance & { students: Student })[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const students = await getAllStudents();

  if (!supabase) {
    return getLocalAttendance()
      .filter(a => new Date(a.check_in_time) >= today)
      .map(a => ({
        ...a,
        students: students.find(s => s.id === a.student_id || s.student_id === a.student_id)!
      })).filter(a => a.students);
  }

  const { data, error } = await supabase
    .from('attendance')
    .select('*, students(*)')
    .gte('check_in_time', today.toISOString())
    .order('check_in_time', { ascending: false });

  if (error) {
    return getLocalAttendance()
      .filter(a => new Date(a.check_in_time) >= today)
      .map(a => ({
        ...a,
        students: students.find(s => s.id === a.student_id || s.student_id === a.student_id)!
      })).filter(a => a.students);
  }

  return data || [];
}

export async function updateStudent(
  id: string,
  updates: Partial<{ student_id: string; name: string; email: string; photo_url: string; face_descriptor: string }>
): Promise<boolean> {
  if (!supabase) {
    const students = getLocalStudents();
    const idx = students.findIndex(s => s.id === id);
    if (idx !== -1) {
      students[idx] = { ...students[idx], ...updates } as any;
      saveLocalStudents(students);
      return true;
    }
    return false;
  }

  const { error } = await supabase
    .from('students')
    .update(updates)
    .eq('id', id);

  return !error;
}

export async function deleteStudent(id: string): Promise<boolean> {
  if (!supabase) {
    const students = getLocalStudents();
    saveLocalStudents(students.filter(s => s.id !== id));
    return true;
  }

  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', id);

  return !error;
}

export async function flushCache(): Promise<boolean> {
  localStorage.removeItem('mock_students');
  localStorage.removeItem('mock_attendance');
  localStorage.removeItem('checkout_cache');

  if (supabase) {
    await supabase.from('attendance').delete().neq('id', '0');
    await supabase.from('students').delete().neq('id', '0');
  }

  return true;
}

export async function loginUser(idValue: string, role: string): Promise<Student | null> {
  const localUser = getLocalStudents().find(s => s.student_id === idValue && s.role === role);
  if (localUser) return localUser;

  if (!supabase) return null;

  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', idValue)
    .eq('role', role)
    .maybeSingle();

  return data || null;
}

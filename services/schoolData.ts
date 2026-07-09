// Updated schoolData service — real data, no mock fallbacks
// Powered by OnSpace.AI

import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export interface StudentRow {
  id: string;
  name: string;
  admission_no: string;
  section: string;
  attendance_pct: number;
  bus_id?: string | null;
  parent_user_id?: string | null;
  roll_no?: number | null;
  pen_no?: string;
  aadhar?: string;
  uid?: string;
  address?: string;
  email?: string;
  phone?: string;
  date_of_admission?: string;
  date_of_birth?: string;
  profile_photo?: string;
  gender?: string;
  blood_group?: string;
  father_name?: string;
  mother_name?: string;
  emergency_contact?: string;
}

export interface AttendanceRow {
  student_id: string;
  date: string;
  present: boolean;
}

// Fetch students by section, ordered by roll_no if set, else by name
export async function fetchStudents(section: string): Promise<StudentRow[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('section', section)
    .order('roll_no', { ascending: true, nullsFirst: false });
  if (error || !data) return [];
  // Students without roll_no: sort alphabetically at end
  const withRoll = data.filter((s: any) => s.roll_no != null);
  const withoutRoll = data.filter((s: any) => s.roll_no == null).sort((a: any, b: any) => a.name.localeCompare(b.name));
  return [...withRoll, ...withoutRoll] as StudentRow[];
}

// Fetch today's attendance for a section — default ALL present
export async function fetchTodayAttendance(section: string): Promise<Record<string, boolean>> {
  const today = new Date().toISOString().split('T')[0];
  const students = await fetchStudents(section);
  if (!students.length) return {};
  const ids = students.map(s => s.id);
  const { data } = await supabase
    .from('attendance')
    .select('student_id, present')
    .in('student_id', ids)
    .eq('date', today);
  const map: Record<string, boolean> = {};
  students.forEach(s => { map[s.id] = true; }); // Default all present
  if (data) data.forEach((r: AttendanceRow) => { map[r.student_id] = r.present; });
  return map;
}

// Save attendance for today
export async function saveAttendance(
  section: string,
  presence: Record<string, boolean>,
  markedBy?: string
): Promise<{ error: string | null }> {
  const today = new Date().toISOString().split('T')[0];
  const rows = Object.entries(presence).map(([student_id, present]) => ({
    student_id, date: today, present,
    marked_by: markedBy ?? null,
  }));
  const { error } = await supabase
    .from('attendance')
    .upsert(rows, { onConflict: 'student_id,date' });
  return { error: error?.message ?? null };
}

// Generate CSV string from attendance data (Excel compatible)
export function generateAttendanceCSV(
  students: StudentRow[],
  presence: Record<string, boolean>,
  section: string
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const header = `KVS EduShield AI - Attendance Report\nSection: ${section}\nDate: ${dateStr}\nGenerated: ${timeStr}\nMade by team NovaThink\n\n`;
  const cols = 'Roll No,Admission No,Student Name,Status,Time\n';
  const rows = students.map((s, i) =>
    `${s.roll_no ?? i + 1},${s.admission_no},"${s.name}",${presence[s.id] ? 'Present' : 'Absent'},${presence[s.id] ? timeStr : '—'}`
  ).join('\n');
  const present = Object.values(presence).filter(Boolean).length;
  const total = students.length;
  const absent = total - present;
  const summary = `\n\nSummary\nTotal,${total}\nPresent,${present}\nAbsent,${absent}\nRate,${total > 0 ? Math.round((present / total) * 100) : 0}%`;
  const absentNames = students.filter(s => !presence[s.id]).map(s => s.name).join('; ');
  const absentSection = absent > 0 ? `\n\nAbsent Students\n${absentNames}` : '';
  return header + cols + rows + summary + absentSection;
}

// Generate sample student upload CSV for teachers
export function generateStudentSampleCSV(section: string): string {
  const header = `KVS EduShield AI - Student Bulk Upload Template\nSection: ${section}\nMade by team NovaThink\n\n`;
  const cols = 'Roll No,Admission No,Name,Gender,Date of Birth,Date of Admission,PEN No,UID/Aadhar,Father Name,Mother Name,Phone,Email,Address,Blood Group,Emergency Contact\n';
  const sample1 = `1,271808221006008,ARCHANA S,Female,2009-05-12,2017-06-01,12345678901,123456789012,SUNDAR S,MEENA S,9876543210,archana@gmail.com,"House 12, Sector 4, New Delhi",B+,9876543211`;
  const sample2 = `2,271808221006126,ESHITA K S,Female,2009-08-23,2017-06-01,12345678902,123456789013,KRISHNA K,SUNITA K,9876543212,eshita@gmail.com,"House 45, Sector 8, New Delhi",O+,9876543213`;
  const instructions = `\n\nInstructions:\n- Roll No must be unique within section\n- Admission No is the unique identifier - if it matches existing student, that student will be updated\n- PEN No and UID are important academic identifiers\n- All dates in YYYY-MM-DD format\n- Phone must be 10 digits`;
  return header + cols + sample1 + '\n' + sample2 + instructions;
}

export async function fetchStudentAttendanceHistory(studentId: string, days = 30): Promise<AttendanceRow[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const { data } = await supabase
    .from('attendance')
    .select('student_id, date, present')
    .eq('student_id', studentId)
    .gte('date', from.toISOString().split('T')[0])
    .order('date', { ascending: false });
  return (data as AttendanceRow[]) ?? [];
}

// Update student full details (class teacher only)
export async function updateStudentDetails(studentId: string, updates: Partial<StudentRow>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('students').update(updates).eq('id', studentId);
  return { error: error?.message ?? null };
}

// Update student roll_no ordering in bulk
export async function updateStudentRollOrders(updates: { id: string; roll_no: number }[]): Promise<{ error: string | null }> {
  for (const u of updates) {
    await supabase.from('students').update({ roll_no: u.roll_no }).eq('id', u.id);
  }
  return { error: null };
}

// Fetch notices
export async function fetchNotices(targetRole?: string): Promise<any[]> {
  let query = supabase.from('notices').select('*').order('created_at', { ascending: false });
  if (targetRole) {
    query = query.or(`target_role.eq.all,target_role.eq.${targetRole}`);
  }
  const { data } = await query.limit(20);
  return data ?? [];
}

// Save notice
export async function saveNotice(notice: { title: string; body: string; category: string; target_role: string; created_by?: string }): Promise<{ error: string | null }> {
  const { error } = await supabase.from('notices').insert(notice);
  return { error: error?.message ?? null };
}

// Fetch homework for section
export async function fetchHomework(section: string): Promise<any[]> {
  const { data } = await supabase
    .from('homework')
    .select('*')
    .eq('section', section)
    .order('created_at', { ascending: false });
  return data ?? [];
}

// Save homework
export async function saveHomework(hw: {
  subject: string; title: string; description: string;
  section: string; due_date: string; assigned_by?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('homework').insert(hw);
  return { error: error?.message ?? null };
}

// Fetch lessons for section
export async function fetchLessons(section: string, limit = 20): Promise<any[]> {
  const { data } = await supabase
    .from('lessons')
    .select('*')
    .eq('section', section)
    .order('lesson_date', { ascending: false })
    .limit(limit);
  return data ?? [];
}

// Save lesson
export async function saveLesson(lesson: {
  subject: string; chapter: string; topic: string;
  section: string; lesson_date: string; taught_by?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('lessons').insert(lesson);
  return { error: error?.message ?? null };
}

// Fetch timetable
export async function fetchTimetable(section: string, day?: string): Promise<any[]> {
  let query = supabase
    .from('timetable')
    .select('*')
    .eq('section', section)
    .order('period');
  if (day) query = query.eq('day_of_week', day);
  const { data } = await query;
  return data ?? [];
}

// Save/update timetable slot
export async function saveTimetableSlot(slot: {
  section: string; day_of_week: string; period: number;
  subject: string; teacher_id?: string; start_time: string; end_time: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('timetable')
    .upsert(slot, { onConflict: 'section,day_of_week,period' });
  return { error: error?.message ?? null };
}

// Fetch incidents for section or all
export async function fetchIncidents(section?: string): Promise<any[]> {
  let query = supabase.from('incidents').select('*').order('created_at', { ascending: false }).limit(50);
  if (section) query = query.eq('section', section);
  const { data } = await query;
  return data ?? [];
}

// Save incident
export async function saveIncident(inc: {
  student_name: string; type: string; notes: string;
  section: string; severity: string; reported_by?: string; student_id?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('incidents').insert(inc);
  return { error: error?.message ?? null };
}

// Fetch exam results for a student
export async function fetchStudentExamResults(studentId: string): Promise<any[]> {
  const { data } = await supabase
    .from('exam_marks')
    .select('*, exams(name,subject,exam_date,max_marks,section)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

// Fetch exams for section
export async function fetchExams(section: string): Promise<any[]> {
  const { data } = await supabase
    .from('exams')
    .select('*')
    .eq('section', section)
    .order('exam_date', { ascending: false });
  return data ?? [];
}

// Bus events
export async function logBusEvent(event: {
  bus_id: string; student_id: string; event_type: string; created_by?: string;
  incident_type?: string; notes?: string; location?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('bus_events').insert(event);
  return { error: error?.message ?? null };
}

export async function fetchBusEvents(busId: string): Promise<any[]> {
  const { data } = await supabase
    .from('bus_events')
    .select('*, students(name,admission_no,section)')
    .eq('bus_id', busId)
    .order('timestamp', { ascending: false })
    .limit(50);
  return data ?? [];
}

// Update user profile — full profile support
export async function updateUserProfile(userId: string, updates: Record<string, any>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('user_profiles').update(updates).eq('id', userId);
  return { error: error?.message ?? null };
}

// Change email
export async function changeUserEmail(newEmail: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  return { error: error?.message ?? null };
}

// Change password
export async function changeUserPassword(newPassword: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message ?? null };
}

// Fetch remarks for a student
export async function fetchRemarks(studentId: string): Promise<any[]> {
  const { data } = await supabase
    .from('remarks')
    .select('*, user_profiles(display_name)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  return data ?? [];
}

// Add remark
export async function addRemark(remark: {
  student_id: string; teacher_id: string; remark_text: string; category: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('remarks').insert(remark);
  return { error: error?.message ?? null };
}

// Fetch early pickup requests
export async function fetchPickupRequests(filter?: { student_id?: string; status?: string }): Promise<any[]> {
  let query = supabase
    .from('early_pickup_requests')
    .select('*, students(name,admission_no,section)')
    .order('created_at', { ascending: false });
  if (filter?.student_id) query = query.eq('student_id', filter.student_id);
  if (filter?.status) query = query.eq('status', filter.status);
  const { data } = await query;
  return data ?? [];
}

// Create pickup request (by security guard at gate OR by parent in advance)
export async function createPickupRequest(req: {
  student_id: string; parent_user_id?: string | null; pickup_time: string;
  reason: string; authorized_person?: string; status?: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('early_pickup_requests').insert({
    ...req,
    status: req.status ?? 'Pending',
  });
  return { error: error?.message ?? null };
}

// Update pickup request status
export async function updatePickupStatus(id: string, status: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('early_pickup_requests').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

// Fetch all buses
export async function fetchBuses(): Promise<any[]> {
  const { data } = await supabase.from('buses').select('*').order('number');
  return data ?? [];
}

// Fetch parent's student
export async function fetchParentStudent(parentUserId: string): Promise<StudentRow | null> {
  const { data } = await supabase
    .from('students')
    .select('*')
    .eq('parent_user_id', parentUserId)
    .maybeSingle();
  return (data as StudentRow) ?? null;
}

// Fetch all user profiles (admin)
export async function fetchUsersByRole(role: string): Promise<any[]> {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('role', role)
    .eq('is_active', true)
    .order('display_name');
  return data ?? [];
}

// Push notification helpers
export async function savePushToken(userId: string, token: string): Promise<void> {
  await supabase.from('user_profiles').update({ push_token: token }).eq('id', userId);
}

export async function sendPushNotification(payload: {
  title: string; body: string; target_role?: string; target_user_id?: string;
  data?: any; created_by?: string;
}): Promise<void> {
  await supabase.from('push_notifications').insert(payload);
}

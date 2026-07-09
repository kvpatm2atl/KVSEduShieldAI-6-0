// Auth + Role context — full profile with staff_directory auto-sync
// Ambily Krishnan = Class Teacher 11A | Jini P = Class Teacher 10C
// Powered by OnSpace.AI

import { createContext, ReactNode, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/template';
import { Role } from '@/services/mockData';

const supabase = getSupabaseClient();

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  subtitle: string;
  phone?: string;
  address?: string;
  employeeCode?: string;
  classTeacherOf?: string;
  subject?: string;
  section?: string;
  teachingSections?: string[];
  admissionNo?: string;
  studentName?: string;
  busNumber?: string;
  gate?: string;
  displayName?: string;
  teacherType?: string;
  linkedStudentId?: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  signInWithPassword: (email: string, password: string, role: Role) => Promise<{ error: string | null }>;
  signUpWithRole: (email: string, password: string, role: Role, displayName?: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateTeachingSections: (sections: string[]) => Promise<{ error: string | null }>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Sync a teacher's user_profile from staff_directory using their employee code
async function syncProfileFromDirectory(userId: string, email: string): Promise<boolean> {
  try {
    const emailLocal = email.split('@')[0];
    if (!/^\d+$/.test(emailLocal)) return false; // only numeric codes
    const { data: dirEntry } = await supabase
      .from('staff_directory')
      .select('*')
      .eq('employee_code', emailLocal)
      .eq('is_active', true)
      .maybeSingle();
    if (!dirEntry) return false;

    const subtitleParts: string[] = [dirEntry.designation];
    if (dirEntry.subject) subtitleParts.push(dirEntry.subject);
    if (dirEntry.class_teacher_of) subtitleParts.push(`CT ${dirEntry.class_teacher_of}`);
    const subtitle = subtitleParts.join(' · ');
    const teachingSections = dirEntry.class_teacher_of ? [dirEntry.class_teacher_of] : [];

    await supabase.from('user_profiles').update({
      display_name: dirEntry.display_name,
      employee_code: dirEntry.employee_code,
      subtitle,
      subject: dirEntry.subject ?? null,
      class_teacher_of: dirEntry.class_teacher_of ?? null,
      teacher_type: dirEntry.teacher_type ?? 'Regular',
      date_of_joining: dirEntry.date_of_joining_kv ?? null,
      role: dirEntry.designation === 'Principal' ? 'admin' : 'teacher',
      is_active: true,
      teaching_sections: teachingSections,
    }).eq('id', userId);

    return true;
  } catch {
    return false;
  }
}

async function fetchProfile(userId: string, role: Role, email: string): Promise<UserProfile> {
  const { data } = await supabase
    .from('user_profiles')
    .select('display_name, subtitle, phone, role, employee_code, class_teacher_of, subject, bus_number, teacher_type, address, email, teaching_sections, linked_student_id, is_active')
    .eq('id', userId)
    .single();

  // Auto-sync from staff_directory if teacher/admin with kvs.in email and no display_name yet
  if ((!data?.display_name) && email.endsWith('@kvs.in')) {
    const synced = await syncProfileFromDirectory(userId, email);
    if (synced) {
      const { data: refreshed } = await supabase
        .from('user_profiles')
        .select('display_name, subtitle, phone, role, employee_code, class_teacher_of, subject, bus_number, teacher_type, address, email, teaching_sections, linked_student_id')
        .eq('id', userId)
        .single();
      if (refreshed?.display_name) {
        return buildTeacherProfile(userId, email, refreshed, role);
      }
    }
  }

  // Teacher/admin with kvs.in email — use profile data
  if (data?.display_name && email.endsWith('@kvs.in')) {
    return buildTeacherProfile(userId, email, data, role);
  }

  // Non-staff user (parent, conductor, driver, security)
  const code = email.split('@')[0];

  if (role === 'parent') {
    let student: any = null;

    // Try linked_student_id first
    if (data?.linked_student_id) {
      const { data: s } = await supabase
        .from('students')
        .select('id, name, admission_no, section')
        .eq('id', data.linked_student_id)
        .maybeSingle();
      student = s;
    }

    // Fallback: match by last 4 digits of admission number
    if (!student) {
      const last4 = code.replace('parent.', '').slice(-4);
      const { data: s } = await supabase
        .from('students')
        .select('id, name, admission_no, section')
        .ilike('admission_no', `%${last4}`)
        .limit(1)
        .maybeSingle();
      student = s;

      if (student && userId) {
        // Auto-link student to parent profile
        await supabase.from('students').update({ parent_user_id: userId }).eq('id', student.id);
        await supabase.from('user_profiles').update({
          linked_student_id: student.id,
          display_name: `Parent of ${student.name}`,
          subtitle: `${student.section} · Adm: ${student.admission_no}`,
          role: 'parent',
        }).eq('id', userId);
      }
    }

    const last4 = code.replace('parent.', '').slice(-4);
    return {
      id: userId, email,
      name: student ? `Parent of ${student.name}` : `Parent (${last4})`,
      displayName: student ? `Parent of ${student.name}` : `Parent (${last4})`,
      role: 'parent',
      subtitle: student ? `${student.section} · Adm: ${student.admission_no}` : 'Parent',
      admissionNo: student?.admission_no,
      studentName: student?.name,
      section: student?.section,
      linkedStudentId: student?.id,
    };
  }

  if (role === 'conductor') {
    const busNum = code.replace(/^cond/, '').replace(/[^0-9]/g, '') || code;
    return {
      id: userId, email,
      name: `Conductor - Bus ${busNum}`, displayName: `Conductor - Bus ${busNum}`,
      role, subtitle: `Bus Conductor · Bus ${busNum}`,
      employeeCode: busNum, busNumber: busNum,
    };
  }

  if (role === 'bus_driver') {
    const busNum = code.replace(/^driver/, '').replace(/[^0-9]/g, '') || code;
    return {
      id: userId, email,
      name: `Driver - Bus ${busNum}`, displayName: `Driver - Bus ${busNum}`,
      role, subtitle: `Bus Driver · Bus ${busNum}`,
      employeeCode: busNum, busNumber: busNum,
    };
  }

  if (role === 'security') {
    const guardId = code.replace(/^sg/i, '').toUpperCase();
    return {
      id: userId, email,
      name: `Guard SG${guardId}`, displayName: `Guard SG${guardId}`,
      role, subtitle: `Security Guard · Main Gate`,
      employeeCode: guardId, gate: 'Main Gate',
    };
  }

  if (role === 'admin') {
    const adminName = data?.display_name ?? 'Administrator';
    return {
      id: userId, email,
      name: adminName, displayName: adminName,
      role, subtitle: data?.subtitle ?? 'School Administrator · KV Pattom',
      employeeCode: data?.employee_code,
    };
  }

  // Fallback: use code as name
  return {
    id: userId, email,
    name: data?.display_name ?? code, role,
    subtitle: data?.subtitle ?? role,
    employeeCode: data?.employee_code ?? code,
    section: '10A', teachingSections: [],
  };
}

function buildTeacherProfile(userId: string, email: string, data: any, fallbackRole: Role): UserProfile {
  const resolvedRole = (data.role as Role) ?? fallbackRole;
  const teachingSections: string[] = Array.isArray(data.teaching_sections)
    ? data.teaching_sections
    : data.class_teacher_of ? [data.class_teacher_of] : [];

  return {
    id: userId,
    email: data.email ?? email,
    name: data.display_name,
    displayName: data.display_name,
    role: resolvedRole,
    subtitle: data.subtitle ?? `${data.designation ?? ''} · ${data.subject ?? ''}`.trim(),
    phone: data.phone ?? undefined,
    address: data.address ?? undefined,
    employeeCode: data.employee_code ?? undefined,
    classTeacherOf: data.class_teacher_of ?? undefined,
    subject: data.subject ?? undefined,
    section: data.class_teacher_of ?? teachingSections[0] ?? undefined,
    teachingSections,
    busNumber: data.bus_number ?? undefined,
    teacherType: data.teacher_type ?? 'Regular',
    linkedStudentId: data.linked_student_id ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const u = data.session.user;
        const role = (u.user_metadata?.role as Role) || guessRoleFromEmail(u.email ?? '');
        try {
          const profile = await fetchProfile(u.id, role, u.email ?? '');
          setUser(profile);
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const u = session.user;
        const role = (u.user_metadata?.role as Role) || guessRoleFromEmail(u.email ?? '');
        try {
          const profile = await fetchProfile(u.id, role, u.email ?? '');
          setUser(profile);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPassword = async (email: string, password: string, role: Role): Promise<{ error: string | null }> => {
    // First try to sign in
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const errMsg = error.message.toLowerCase();
      const isInvalidCreds = errMsg.includes('invalid') || errMsg.includes('not found') ||
        errMsg.includes('credentials') || errMsg.includes('user not found');
      const isEmailNotConfirmed = errMsg.includes('email not confirmed') || errMsg.includes('email_not_confirmed');

      if (isEmailNotConfirmed) {
        // Email not confirmed — silently treat as success
        error = null;
      } else if (isInvalidCreds) {
        // Try auto-register (new user signing in for first time)
        const signUpRes = await supabase.auth.signUp({
          email, password, options: { data: { role, display_name: null } }
        });

        if (!signUpRes.error || signUpRes.error.message.includes('already registered')) {
          // Try sign in again
          const retry = await supabase.auth.signInWithPassword({ email, password });
          if (!retry.error || retry.error.message.toLowerCase().includes('email not confirmed')) {
            data = (retry.data ?? signUpRes.data) as any;
            error = null;
          } else {
            return { error: retry.error.message };
          }
        } else {
          return { error: signUpRes.error.message };
        }
      }
    }

    if (error) return { error: error.message };

    const userId = data?.user?.id ?? data?.session?.user?.id;
    if (userId) {
      // Update role metadata
      await supabase.auth.updateUser({ data: { role } });
      await supabase.from('user_profiles').update({ role }).eq('id', userId);

      // Auto-sync from staff_directory for @kvs.in emails
      if (email.endsWith('@kvs.in')) {
        await syncProfileFromDirectory(userId, email);
      }

      try {
        const profile = await fetchProfile(userId, role, email);
        setUser(profile);
      } catch {
        // Profile fetch failed — user is still logged in
      }
    }

    return { error: null };
  };

  const signUpWithRole = async (email: string, password: string, role: Role, displayName?: string): Promise<{ error: string | null }> => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { role, display_name: displayName ?? null } }
    });

    const isAlreadyRegistered = error?.message?.includes('already registered');
    if (error && !error.message.toLowerCase().includes('email not confirmed') && !isAlreadyRegistered) {
      return { error: error.message };
    }

    const userId = data?.user?.id;
    if (userId) {
      if (displayName) {
        await supabase.from('user_profiles').update({ role, display_name: displayName }).eq('id', userId);
      } else {
        await supabase.from('user_profiles').update({ role }).eq('id', userId);
      }

      // Try sign in to get session
      const signInRes = await supabase.auth.signInWithPassword({ email, password });
      if (!signInRes.error || signInRes.error.message.toLowerCase().includes('email not confirmed')) {
        try {
          const profile = await fetchProfile(userId, role, email);
          setUser(profile);
        } catch {}
      }
    }

    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const role = (session.user.user_metadata?.role as Role) || guessRoleFromEmail(session.user.email ?? '');
      try {
        const profile = await fetchProfile(session.user.id, role, session.user.email ?? '');
        setUser(profile);
      } catch {}
    }
  };

  const updateTeachingSections = async (sections: string[]): Promise<{ error: string | null }> => {
    if (!user?.id) return { error: 'Not logged in' };
    const { error } = await supabase
      .from('user_profiles')
      .update({ teaching_sections: sections })
      .eq('id', user.id);
    if (!error) {
      setUser(prev => prev ? {
        ...prev,
        teachingSections: sections,
        section: sections[0] ?? prev.section,
      } : prev);
    }
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      signInWithPassword, signUpWithRole,
      logout, refreshProfile, updateTeachingSections,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

function guessRoleFromEmail(email: string): Role {
  if (email.endsWith('@kvs.in')) return 'teacher';
  if (email.startsWith('parent.')) return 'parent';
  if (email.startsWith('cond')) return 'conductor';
  if (email.startsWith('driver')) return 'bus_driver';
  if (email.startsWith('sg')) return 'security';
  if (email.includes('kendriyavidyalaya') || email.includes('kvpattom')) return 'admin';
  return 'parent';
}

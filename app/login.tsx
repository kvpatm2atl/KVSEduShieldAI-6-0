// Login — all 6 roles + parent admission-number linking
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { useAlert } from '@/template';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/services/mockData';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

const cfg: Record<Role, {
  title: string; subtitle: string; usernameLabel: string;
  usernamePh: string; hint: string;
  gradient: [string, string, string]; accent: string; icon: string;
}> = {
  admin: {
    title: 'Admin Portal', subtitle: 'School Administration',
    usernameLabel: 'Employee Code / Email',
    usernamePh: 'e.g. 4764  (Principal code)',
    hint: 'Principal: 4764@kvs.in / Kvpatm2.4764\nOr use full admin email + password',
    gradient: ['#1a0533', '#3B1F6B', '#6B3FA0'], accent: '#A36BD6', icon: 'shield-account',
  },
  teacher: {
    title: 'Teacher Portal', subtitle: 'Academic Management',
    usernameLabel: 'Employee Code',
    usernamePh: 'e.g. 79553',
    hint: 'Enter your employee code (e.g. 79553)\nPassword: Kvpatm2.[EmployeeCode]',
    gradient: ['#0B2A1C', '#1B5E3F', '#1FA971'], accent: '#1FA971', icon: 'book-education',
  },
  parent: {
    title: 'Parent Portal', subtitle: 'Child Safety & Academics',
    usernameLabel: 'Admission Number (last 4 digits)',
    usernamePh: 'e.g. 4350',
    hint: 'Enter last 4 digits of your ward\'s admission number.\nFirst time? Use "Link Child" tab to connect your account.',
    gradient: ['#091A40', '#0F2A5C', '#2A6FDB'], accent: '#4F8EF7', icon: 'account-heart',
  },
  conductor: {
    title: 'Conductor Portal', subtitle: 'Bus Boarding Management',
    usernameLabel: 'Bus Number', usernamePh: 'e.g. 1  (for Bus 1)',
    hint: 'Email: cond[N]@kvpattom.edu\nPassword: KVPATTOM_64\nNew? Use Register tab.',
    gradient: ['#3A1A00', '#7C3000', '#F59E0B'], accent: '#F59E0B', icon: 'bus-clock',
  },
  bus_driver: {
    title: 'Driver Portal', subtitle: 'Route & Trip Management',
    usernameLabel: 'Bus Number', usernamePh: 'e.g. 1  (for Bus 1)',
    hint: 'Email: driver[N]@kvpattom.edu\nPassword: KVPATTOM_64\nNew? Use Register tab.',
    gradient: ['#021A0F', '#064E3B', '#059669'], accent: '#10B981', icon: 'steering',
  },
  security: {
    title: 'Security Guard', subtitle: 'Gate & Pickup Management',
    usernameLabel: 'Guard ID', usernamePh: 'e.g. SG1@KV',
    hint: 'Username: SG[N]@KV  (e.g. SG1@KV)\nPassword: KVPATTOM_64\nAccounts created by Admin.',
    gradient: ['#2D0A0A', '#7F1D1D', '#DC2626'], accent: '#EF4444', icon: 'shield-star',
  },
};

function buildEmail(role: Role, username: string): string {
  const u = username.trim().toLowerCase();
  switch (role) {
    case 'admin': {
      if (u.includes('@')) return u;
      // If numeric code → Principal/admin kvs.in email
      if (/^\d+$/.test(u)) return `${u}@kvs.in`;
      return `${u}@kvpattom.edu`;
    }
    case 'teacher': {
      const code = u.replace('kv@', '').replace(/\s/g, '');
      return `${code.toLowerCase()}@kvs.in`;
    }
    case 'parent': {
      const digits = u.replace(/\D/g, '').slice(-4);
      return `parent.${digits}@kvpattom.edu`;
    }
    case 'conductor': {
      const busNum = u.replace('cond', '').replace('@kv', '').replace(/\s/g, '');
      return `cond${busNum}@kvpattom.edu`;
    }
    case 'bus_driver': {
      const busNum = u.replace('driver', '').replace('@kv', '').replace(/\s/g, '');
      return `driver${busNum}@kvpattom.edu`;
    }
    case 'security': {
      const sg = u.replace('@kv', '').replace(/\s/g, '');
      return `${sg}@kvpattom.edu`;
    }
  }
}

function defaultPassword(role: Role, username?: string): string {
  if (role === 'parent') return 'Parent.123';
  if (role === 'teacher' || role === 'admin') {
    const code = (username ?? '').replace(/\D/g, '');
    if (code) return `Kvpatm2.${code}`;
  }
  return 'KVPATTOM_64';
}

// ── Parent Child Linking ─────────────────────────────────────────────────────
function ParentLinkForm({ config }: { config: typeof cfg[Role] }) {
  const { showAlert } = useAlert();
  const router = useRouter();
  const { signInWithPassword } = useAuth();

  const [admissionNo, setAdmissionNo] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const searchStudent = async (val: string) => {
    setAdmissionNo(val);
    setFoundStudent(null);
    if (val.trim().length < 4) return;
    setSearching(true);
    const { data } = await supabase
      .from('students')
      .select('id, name, admission_no, section')
      .ilike('admission_no', `%${val.trim()}`)
      .limit(1)
      .maybeSingle();
    setFoundStudent(data ?? null);
    setSearching(false);
  };

  const handleLink = async () => {
    if (!admissionNo.trim()) { showAlert('Required', 'Enter admission number.'); return; }
    if (!foundStudent) { showAlert('Not found', 'No student found with that admission number.'); return; }
    const last4 = admissionNo.trim().slice(-4);
    const email = `parent.${last4}@kvpattom.edu`;
    const pass = password.trim() || 'Parent.123';
    setBusy(true);
    // Sign up or sign in
    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email, password: pass, options: { data: { role: 'parent' } },
    });
    if (signUpErr && !signUpErr.message.includes('already registered')) {
      setBusy(false); showAlert('Error', signUpErr.message); return;
    }
    const userId = authData?.user?.id;
    if (userId) {
      // Link student
      await supabase.from('students').update({ parent_user_id: userId }).eq('id', foundStudent.id);
      await supabase.from('user_profiles').update({
        role: 'parent', linked_student_id: foundStudent.id,
        display_name: `Parent of ${foundStudent.name}`,
        subtitle: `${foundStudent.section} · Adm: ${foundStudent.admission_no}`,
      }).eq('id', userId);
    }
    // Sign in after linking
    const { error: loginErr } = await signInWithPassword(email, pass, 'parent');
    setBusy(false);
    if (loginErr) { showAlert('Error', loginErr); return; }
    router.replace('/pin');
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formLabel}>Child's Admission Number</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="card-account-details" color={Colors.textMuted} size={20} />
        <TextInput
          value={admissionNo} onChangeText={searchStudent}
          placeholder="e.g. 271808221006008"
          placeholderTextColor={Colors.textMuted}
          keyboardType="default" style={styles.textInput}
        />
        {searching ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
      </View>

      {foundStudent ? (
        <View style={[styles.foundBox, { borderColor: config.accent }]}>
          <MaterialCommunityIcons name="check-circle" color={config.accent} size={18} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.foundName}>{foundStudent.name}</Text>
            <Text style={styles.foundMeta}>{foundStudent.section} · {foundStudent.admission_no}</Text>
          </View>
        </View>
      ) : admissionNo.length >= 4 && !searching ? (
        <View style={styles.notFoundBox}>
          <MaterialCommunityIcons name="account-search" color={Colors.textMuted} size={16} />
          <Text style={styles.notFoundText}>No student found. Check the admission number.</Text>
        </View>
      ) : null}

      <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Set Password</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="lock" color={Colors.textMuted} size={20} />
        <TextInput
          value={password} onChangeText={setPassword}
          placeholder="Default: Parent.123"
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={!showPass}
          style={[styles.textInput, { flex: 1 }]}
        />
        <Pressable onPress={() => setShowPass(p => !p)} hitSlop={10}>
          <MaterialCommunityIcons name={showPass ? 'eye-off' : 'eye'} color={Colors.textMuted} size={20} />
        </Pressable>
      </View>

      <View style={styles.hintBox}>
        <MaterialCommunityIcons name="information-outline" color={config.accent} size={14} />
        <Text style={[styles.hintText, { color: config.accent }]}>
          Enter the full admission number (e.g. 271808221006008). Your account will be linked to your child.
        </Text>
      </View>

      <PrimaryButton
        label={busy ? 'Linking…' : 'Link & Sign In'}
        onPress={handleLink}
        loading={busy}
        size="lg"
        style={[styles.loginBtn, { backgroundColor: config.accent }]}
      />
    </View>
  );
}

// ── Login Form ────────────────────────────────────────────────────────────────
function LoginForm({ role, config }: { role: Role; config: typeof cfg[Role] }) {
  const { signInWithPassword } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  // Teacher profile preview from staff_directory
  const [teacherPreview, setTeacherPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleUsernameChange = async (val: string) => {
    setUsername(val);
    setTeacherPreview(null);
    if (role !== 'teacher') return;
    const code = val.trim().replace(/\D/g, '');
    if (code.length < 4) return;
    setPreviewLoading(true);
    const { data } = await supabase
      .from('staff_directory')
      .select('display_name, designation, subject, class_teacher_of, employee_code')
      .eq('employee_code', code)
      .maybeSingle();
    setTeacherPreview(data ?? null);
    setPreviewLoading(false);
  };

  const handleLogin = async () => {
    if (!username.trim()) {
      showAlert('Required', `Please enter your ${config.usernameLabel.toLowerCase()}.`);
      return;
    }
    const email = buildEmail(role, username);
    const pass = password.trim() || defaultPassword(role, username);
    setBusy(true);
    const { error } = await signInWithPassword(email, pass, role);
    setBusy(false);
    // Suppress email-confirmation noise — handled silently in AuthContext
    if (error && !error.toLowerCase().includes('email not confirmed') && !error.toLowerCase().includes('email_not_confirmed')) {
      showAlert('Login Failed', 'Check your credentials and try again.\n\n' + error);
      return;
    }
    if (error) return; // silently blocked (shouldn't happen)
    switch (role) {
      case 'parent': router.replace('/pin'); break;
      case 'teacher': router.replace('/(teacher)'); break;
      case 'admin': router.replace('/(admin)'); break;
    default: router.replace('/'); break;
      case 'conductor': router.replace('/(conductor)'); break;
      case 'bus_driver': router.replace('/(bus_driver)'); break;
      case 'security': router.replace('/(security)'); break;
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formLabel}>{config.usernameLabel}</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="account" color={Colors.textMuted} size={20} />
        <TextInput
          value={username} onChangeText={handleUsernameChange}
          placeholder={config.usernamePh}
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          keyboardType={role === 'parent' ? 'number-pad' : 'number-pad'}
          style={styles.textInput}
          returnKeyType="next"
        />
        {previewLoading ? <ActivityIndicator size="small" color={config.accent} /> : null}
      </View>

      {/* Teacher identity preview card */}
      {role === 'teacher' && teacherPreview ? (
        <View style={[styles.foundBox, { borderColor: config.accent }]}>
          <View style={[styles.teacherAvatar, { backgroundColor: config.accent }]}>
            <Text style={styles.teacherAvatarText}>{teacherPreview.display_name[0]}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>  
            <Text style={styles.foundName}>{teacherPreview.display_name}</Text>
            <Text style={styles.foundMeta}>
              {teacherPreview.designation} · {teacherPreview.subject ?? 'Staff'}
              {teacherPreview.class_teacher_of ? ` · Class Teacher ${teacherPreview.class_teacher_of}` : ''}
            </Text>
            <Text style={[styles.foundMeta, { color: config.accent, marginTop: 2 }]}>
              Code: {teacherPreview.employee_code}
            </Text>
          </View>
          <MaterialCommunityIcons name="check-circle" color={config.accent} size={20} />
        </View>
      ) : role === 'teacher' && username.trim().length >= 4 && !previewLoading && !teacherPreview ? (
        <View style={styles.notFoundBox}>
          <MaterialCommunityIcons name="account-search" color={Colors.textMuted} size={16} />
          <Text style={styles.notFoundText}>Code not in directory — you can still sign in if registered.</Text>
        </View>
      ) : null}

      <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Password</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="lock" color={Colors.textMuted} size={20} />
        <TextInput
          value={password} onChangeText={setPassword}
          placeholder={`Default: ${defaultPassword(role, username)}`}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={!showPass}
          autoCapitalize="none"
          style={[styles.textInput, { flex: 1 }]}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
        />
        <Pressable onPress={() => setShowPass(p => !p)} hitSlop={10}>
          <MaterialCommunityIcons name={showPass ? 'eye-off' : 'eye'} color={Colors.textMuted} size={20} />
        </Pressable>
      </View>

      <View style={styles.hintBox}>
        <MaterialCommunityIcons name="information-outline" color={config.accent} size={14} />
        <Text style={[styles.hintText, { color: config.accent }]}>{config.hint}</Text>
      </View>

      <PrimaryButton
        label={busy ? 'Signing in…' : teacherPreview ? `Sign in as ${teacherPreview.display_name.split(' ')[0]}` : 'Sign In'}
        onPress={handleLogin}
        loading={busy}
        size="lg"
        style={[styles.loginBtn, { backgroundColor: config.accent }]}
      />
    </View>
  );
}

// ── Register Form (Conductor & Driver only) ───────────────────────────────────
function RegisterForm({ role, config }: { role: Role; config: typeof cfg[Role] }) {
  const { signUpWithRole } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();

  const [busNumber, setBusNumber] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('KVPATTOM_64');
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [loadingBuses, setLoadingBuses] = useState(false);

  const searchBus = async (num: string) => {
    setBusNumber(num);
    setSelectedBus(null);
    if (num.trim().length === 0) { setBuses([]); return; }
    setLoadingBuses(true);
    const { data } = await supabase.from('buses').select('*').ilike('number', `%${num}%`).limit(5);
    setBuses(data ?? []);
    setLoadingBuses(false);
  };

  const handleRegister = async () => {
    if (!selectedBus) { showAlert('Select Bus', 'Search and select your assigned bus first.'); return; }
    if (!name.trim()) { showAlert('Required', 'Enter your full name.'); return; }
    const busNum = selectedBus.number.replace('Bus ', '').trim();
    const email = role === 'conductor' ? `cond${busNum}@kvpattom.edu` : `driver${busNum}@kvpattom.edu`;

    setBusy(true);
    const { error } = await signUpWithRole(email, password, role, name.trim());
    if (!error) {
      const fieldKey = role === 'conductor' ? 'conductor_name' : 'driver';
      await supabase.from('buses').update({ [fieldKey]: name.trim() }).eq('id', selectedBus.id);
    }
    setBusy(false);
    if (error) { showAlert('Registration Failed', error); return; }
    showAlert('Registered!', `Welcome ${name}! You are linked to ${selectedBus.number}.`);
    switch (role) {
      case 'conductor': router.replace('/(conductor)'); break;
      case 'bus_driver': router.replace('/(bus_driver)'); break;
    }
  };

  return (
    <View style={styles.formCard}>
      <Text style={styles.formLabel}>Your Full Name</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="account" color={Colors.textMuted} size={20} />
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Ramesh Kumar" placeholderTextColor={Colors.textMuted} style={styles.textInput} />
      </View>

      <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Search Your Bus</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="bus" color={Colors.textMuted} size={20} />
        <TextInput value={busNumber} onChangeText={searchBus} placeholder="Type bus number e.g. Bus 1" placeholderTextColor={Colors.textMuted} style={styles.textInput} />
      </View>

      {buses.length > 0 && !selectedBus && (
        <View style={styles.busResults}>
          {buses.map(b => (
            <Pressable key={b.id} onPress={() => { setSelectedBus(b); setBusNumber(b.number); setBuses([]); }} style={styles.busResultRow}>
              <MaterialCommunityIcons name="bus" color={config.accent} size={18} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.busResultTitle}>{b.number}</Text>
                <Text style={styles.busResultSub}>{b.route} · Driver: {b.driver}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" color={Colors.textMuted} size={18} />
            </Pressable>
          ))}
        </View>
      )}

      {selectedBus && (
        <View style={[styles.selectedBusBox, { borderColor: config.accent }]}>
          <MaterialCommunityIcons name="check-circle" color={config.accent} size={18} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.selectedBusTitle}>{selectedBus.number} · {selectedBus.route}</Text>
            <Text style={styles.selectedBusSub}>Selected</Text>
          </View>
        </View>
      )}

      <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Set Password</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="lock" color={Colors.textMuted} size={20} />
        <TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPass} style={[styles.textInput, { flex: 1 }]} />
        <Pressable onPress={() => setShowPass(p => !p)} hitSlop={10}>
          <MaterialCommunityIcons name={showPass ? 'eye-off' : 'eye'} color={Colors.textMuted} size={20} />
        </Pressable>
      </View>

      <PrimaryButton label={busy ? 'Registering…' : 'Register & Connect to Bus'} onPress={handleRegister} loading={busy} size="lg" style={[styles.loginBtn, { backgroundColor: config.accent }]} />
    </View>
  );
}

export default function LoginScreen() {
  const params = useLocalSearchParams<{ role?: string }>();
  const role = (params.role as Role) || 'parent';
  const config = cfg[role] ?? cfg.parent;
  const router = useRouter();

  const canRegister = role === 'conductor' || role === 'bus_driver';
  const canLink = role === 'parent';
  const [tab, setTab] = useState<'login' | 'register' | 'link'>('login');

  return (
    <LinearGradient colors={config.gradient} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <ResponsiveContainer maxWidth={550}>
              <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
                <MaterialCommunityIcons name="arrow-left" color="rgba(255,255,255,0.9)" size={22} />
              </Pressable>
              <View style={styles.brandRow}>
                <Image source={require('@/assets/kvs-logo.png')} style={styles.logo} contentFit="contain" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.brandName}>KVS EduShield AI</Text>
                  <Text style={styles.brandSub}>Kendriya Vidyalaya Sangathan</Text>
                </View>
              </View>
              <View style={styles.roleBadge}>
                <MaterialCommunityIcons name={config.icon as any} color={config.accent} size={20} />
                <Text style={[styles.roleTag, { color: config.accent }]}>{config.title}</Text>
              </View>
              <Text style={styles.pageTitle}>{config.title}</Text>
              <Text style={styles.pageSubtitle}>{config.subtitle}</Text>
            </View>

            {/* Tab switcher */}
            {(canRegister || canLink) && (
              <View style={styles.tabRow}>
                <Pressable onPress={() => setTab('login')} style={[styles.tabBtn, tab === 'login' && { backgroundColor: config.accent }]}>
                  <MaterialCommunityIcons name="login" color={tab === 'login' ? '#fff' : 'rgba(255,255,255,0.7)'} size={16} />
                  <Text style={[styles.tabBtnText, tab === 'login' && { color: '#fff' }]}>Sign In</Text>
                </Pressable>
                {canLink && (
                  <Pressable onPress={() => setTab('link')} style={[styles.tabBtn, tab === 'link' && { backgroundColor: config.accent }]}>
                    <MaterialCommunityIcons name="account-child" color={tab === 'link' ? '#fff' : 'rgba(255,255,255,0.7)'} size={16} />
                    <Text style={[styles.tabBtnText, tab === 'link' && { color: '#fff' }]}>Link Child</Text>
                  </Pressable>
                )}
                {canRegister && (
                  <Pressable onPress={() => setTab('register')} style={[styles.tabBtn, tab === 'register' && { backgroundColor: config.accent }]}>
                    <MaterialCommunityIcons name="account-plus" color={tab === 'register' ? '#fff' : 'rgba(255,255,255,0.7)'} size={16} />
                    <Text style={[styles.tabBtnText, tab === 'register' && { color: '#fff' }]}>Register</Text>
                  </Pressable>
                )}
              </View>
            )}

            {tab === 'link' && canLink ? (
              <ParentLinkForm config={config} />
            ) : tab === 'register' && canRegister ? (
              <RegisterForm role={role} config={config} />
            ) : (
              <LoginForm role={role} config={config} />
            )}

            {role === 'security' && (
              <View style={styles.infoBox}>
                <MaterialCommunityIcons name="shield-lock" color="rgba(255,255,255,0.7)" size={16} />
                <Text style={styles.infoText}>Security guard accounts are created by the school administrator.</Text>
              </View>
            )}

              <Text style={styles.footer}>Secured by Supabase Auth · Made by team NovaThink</Text>
            </ResponsiveContainer>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, paddingBottom: Spacing.xxl },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xxl },
  logo: { width: 44, height: 44 },
  brandName: { color: '#fff', fontSize: 16, fontWeight: '800' },
  brandSub: { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.pill, marginBottom: Spacing.lg },
  roleTag: { fontSize: 13, fontWeight: '700' },
  pageTitle: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
  pageSubtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 15, marginTop: 6, lineHeight: 22 },
  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radius.md, padding: 4, gap: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radius.sm },
  tabBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700' },
  formCard: { backgroundColor: '#fff', borderRadius: Radius.xl, marginHorizontal: Spacing.xl, padding: Spacing.xl, ...Shadows.raised },
  formLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: Colors.border },
  textInput: { flex: 1, fontSize: 16, color: Colors.textPrimary, fontWeight: '500' },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F8F6FF', borderRadius: Radius.md, padding: 12, marginTop: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.border },
  hintText: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 19 },
  loginBtn: { marginTop: Spacing.xl, borderRadius: Radius.md },
  foundBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FAF5', borderRadius: Radius.md, padding: 12, marginTop: 8, borderWidth: 1.5 },
  foundName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  foundMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  notFoundBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, padding: 10, marginTop: 8 },
  notFoundText: { fontSize: 12, color: Colors.textMuted, fontWeight: '500' },
  busResults: { backgroundColor: '#fff', borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, marginTop: 6, overflow: 'hidden' },
  busResultRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  busResultTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  busResultSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  selectedBusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FAF5', borderRadius: Radius.md, padding: 12, marginTop: 8, borderWidth: 1.5 },
  selectedBusTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  selectedBusSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: Spacing.xl, marginTop: Spacing.xl, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, padding: Spacing.lg },
  infoText: { flex: 1, color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500', lineHeight: 20 },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', marginTop: Spacing.xxl },
  teacherAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  teacherAvatarText: { fontSize: 18, fontWeight: '900', color: '#fff' },
});

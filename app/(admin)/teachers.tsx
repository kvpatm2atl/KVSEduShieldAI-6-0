// Admin: Teachers — Bulk Add All + Staff Directory
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useAlert } from '@/template';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

const supabase = getSupabaseClient();

const SUBJECTS = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi',
  'Social Science', 'Computer Science', 'Economics', 'Work Education', 'Art Education', 'Physical Education'];
const SECTIONS = ['10A', '10B', '10C', '10D', '11A', '11B', '12A', '12B'];
const DESIGNATIONS = ['PGT', 'TGT', 'PRT', 'Librarian', 'PET', 'Principal'];
const TEACHER_TYPES = ['Regular', 'Contractual', 'Guest', 'Part-time'] as const;
type TeacherType = typeof TEACHER_TYPES[number];

const TYPE_COLORS: Record<TeacherType, string> = {
  Regular: 'success', Contractual: 'warning', Guest: 'info', 'Part-time': 'neutral',
};

const SAMPLE_TEACHER_CSV = `display_name,employee_code,email,designation,subject,class_teacher_of,teacher_type,date_of_joining,phone
AMBILY KRISHNAN,8955,ambily@kvs.in,PGT,Computer Science,11A,Regular,2023-08-14,9876543210
JINI P,79553,jini@kvs.in,TGT,English,10C,Regular,2021-10-22,9876543211`;

export default function AdminTeachers() {
  const { showAlert } = useAlert();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [directory, setDirectory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<TeacherType | 'All'>('All');
  const [activeTab, setActiveTab] = useState<'registered' | 'directory'>('registered');
  const [showForm, setShowForm] = useState(false);
  const [editTeacher, setEditTeacher] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [addingAll, setAddingAll] = useState(false);
  const [creatingAllAccounts, setCreatingAllAccounts] = useState(false);
  const [createResults, setCreateResults] = useState<any>(null);
  const [showCreateResults, setShowCreateResults] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [ownEmail, setOwnEmail] = useState('');
  const [designation, setDesignation] = useState('TGT');
  const [subject, setSubject] = useState('Mathematics');
  const [classOf, setClassOf] = useState('');
  const [phone, setPhone] = useState('');
  const [teacherType, setTeacherType] = useState<TeacherType>('Regular');
  const [dateOfJoining, setDateOfJoining] = useState('');

  const [showBulk, setShowBulk] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [teacherRes, dirRes] = await Promise.all([
      supabase.from('user_profiles').select('*').in('role', ['teacher', 'admin']).eq('is_active', true).order('display_name'),
      supabase.from('staff_directory').select('*').order('display_name'),
    ]);
    setTeachers(teacherRes.data ?? []);
    setDirectory(dirRes.data ?? []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditTeacher(null);
    setDisplayName(''); setEmpCode(''); setOwnEmail('');
    setDesignation('TGT'); setSubject('Mathematics');
    setClassOf(''); setPhone(''); setTeacherType('Regular'); setDateOfJoining('');
    setShowForm(true);
  };

  const openEdit = (t: any) => {
    setEditTeacher(t);
    setDisplayName(t.display_name ?? '');
    setEmpCode(t.employee_code ?? '');
    setOwnEmail(t.email ?? '');
    const desg = t.subtitle?.split(' ')[0] ?? 'TGT';
    setDesignation(DESIGNATIONS.includes(desg) ? desg : 'TGT');
    setSubject(t.subject ?? 'Mathematics');
    setClassOf(t.class_teacher_of ?? '');
    setPhone(t.phone ?? '');
    setTeacherType((t.teacher_type as TeacherType) ?? 'Regular');
    setDateOfJoining(t.date_of_joining ?? '');
    setShowForm(true);
  };

  const submit = async () => {
    if (!displayName.trim()) { showAlert('Missing', 'Enter teacher name.'); return; }
    setSaving(true);
    const subtitle = `${designation} ${subject}${classOf ? ` · CT ${classOf}` : ''}${teacherType !== 'Regular' ? ` · ${teacherType}` : ''}`;

    if (editTeacher) {
      await supabase.from('user_profiles').update({
        display_name: displayName.trim(), employee_code: empCode.trim(),
        subtitle, subject, class_teacher_of: classOf || null,
        phone: phone.trim(), teacher_type: teacherType, date_of_joining: dateOfJoining || null,
      }).eq('id', editTeacher.id);
    } else {
      const email = ownEmail.trim() || `${empCode.trim().toLowerCase()}@kvs.in`;
      const password = `Kvpatm2.${empCode.trim() || displayName.replace(/\s/g, '').toLowerCase()}`;
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email, password, options: { data: { role: 'teacher' } }
      });
      if (signUpError && !signUpError.message.includes('already registered')) {
        showAlert('Error', signUpError.message); setSaving(false); return;
      }
      const userId = authData?.user?.id;
      if (userId) {
        await supabase.from('user_profiles').upsert({
          id: userId, email, display_name: displayName.trim(), employee_code: empCode.trim(),
          subtitle, subject, class_teacher_of: classOf || null,
          phone: phone.trim(), role: 'teacher', is_active: true,
          teacher_type: teacherType, date_of_joining: dateOfJoining || null,
        });
      }
      if (empCode.trim()) {
        await supabase.from('staff_directory').update({ class_teacher_of: classOf || null }).eq('employee_code', empCode.trim());
      }
    }
    setSaving(false);
    showAlert('Saved', `${displayName} saved.`);
    setShowForm(false);
    loadAll();
  };

  const removeTeacher = (t: any) => {
    showAlert('Remove teacher?', `${t.display_name} will be deactivated.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await supabase.from('user_profiles').update({ is_active: false }).eq('id', t.id);
        loadAll();
        showAlert('Done', `${t.display_name} removed.`);
      }},
    ]);
  };

  // ─── Create ALL Teacher Accounts via Edge Function (service role) ──────────
  const createAllTeacherAccounts = async () => {
    showAlert(
      'Create All Teacher Accounts?',
      `This will create login accounts for all ${directory.length} staff members in the directory using the server-side admin API.\n\nEmail: [code]@kvs.in\nPassword: Kvpatm2.[Code]`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create All', onPress: async () => {
          setCreatingAllAccounts(true);
          setCreateResults(null);
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token ?? '';
            const { data, error } = await supabase.functions.invoke('create-teacher-accounts', {
              body: {},
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (error) {
              let msg = error.message;
              if (error instanceof FunctionsHttpError) {
                try { msg = await error.context?.text() ?? msg; } catch {}
              }
              showAlert('Error', msg);
              setCreatingAllAccounts(false);
              return;
            }
            setCreateResults(data);
            setShowCreateResults(true);
            loadAll();
          } catch (e: any) {
            showAlert('Error', String(e));
          }
          setCreatingAllAccounts(false);
        }},
      ]
    );
  };

  // ─── Add All Unregistered Staff ────────────────────────────────────────────
  const addAllUnregistered = async () => {
    const registeredCodes = new Set(teachers.map(t => t.employee_code).filter(Boolean));
    const pending = directory.filter(d => d.employee_code && !registeredCodes.has(d.employee_code));

    if (pending.length === 0) {
      showAlert('All registered', 'All staff directory members already have accounts.');
      return;
    }

    showAlert(
      'Register All Pending Staff?',
      `This will create accounts for ${pending.length} unregistered staff members.\nDefault password: Kvpatm2.[EmployeeCode]`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Register All', onPress: async () => {
          setAddingAll(true);
          let success = 0;
          let failed = 0;
          for (const staff of pending) {
            const email = `${staff.employee_code.toLowerCase()}@kvs.in`;
            const password = `Kvpatm2.${staff.employee_code}`;
            const { data: authData, error } = await supabase.auth.signUp({
              email, password, options: { data: { role: 'teacher' } },
            });
            const alreadyExists = error?.message?.includes('already registered');
            if (error && !alreadyExists) { failed++; continue; }
            const userId = authData?.user?.id;
            if (userId) {
              const subtitle = `${staff.designation} ${staff.subject ?? ''}${staff.class_teacher_of ? ` · CT ${staff.class_teacher_of}` : ''}`;
              await supabase.from('user_profiles').upsert({
                id: userId, email,
                display_name: staff.display_name,
                employee_code: staff.employee_code,
                subtitle, subject: staff.subject,
                class_teacher_of: staff.class_teacher_of,
                role: staff.designation === 'Principal' ? 'admin' : 'teacher',
                is_active: true,
                teacher_type: staff.teacher_type ?? 'Regular',
                date_of_joining: staff.date_of_joining_kv,
              });
              success++;
            } else if (alreadyExists) {
              success++;
            }
          }
          setAddingAll(false);
          showAlert('Done', `${success} staff registered. ${failed > 0 ? `${failed} failed.` : ''}`);
          loadAll();
        }},
      ]
    );
  };

  // ─── Import from directory ──────────────────────────────────────────────
  const importFromDirectory = async (staff: any) => {
    const email = `${staff.employee_code?.toLowerCase()}@kvs.in`;
    const password = `Kvpatm2.${staff.employee_code}`;
    setSaving(true);
    const { data: authData, error: signUpErr } = await supabase.auth.signUp({
      email, password, options: { data: { role: 'teacher' } },
    });
    const alreadyExists = signUpErr?.message?.includes('already registered');
    if (signUpErr && !alreadyExists) {
      setSaving(false);
      showAlert('Error', signUpErr.message);
      return;
    }
    if (authData?.user?.id) {
      const subtitle = `${staff.designation} ${staff.subject ?? ''}${staff.class_teacher_of ? ` · CT ${staff.class_teacher_of}` : ''}`;
      await supabase.from('user_profiles').upsert({
        id: authData.user.id, email,
        display_name: staff.display_name,
        employee_code: staff.employee_code,
        subtitle, subject: staff.subject,
        class_teacher_of: staff.class_teacher_of,
        role: staff.designation === 'Principal' ? 'admin' : 'teacher',
        is_active: true, teacher_type: staff.teacher_type ?? 'Regular',
        date_of_joining: staff.date_of_joining_kv,
      });
    }
    setSaving(false);
    showAlert('Added', `${staff.display_name} added.\nPassword: ${password}`);
    loadAll();
  };

  // ─── Bulk CSV Import ─────────────────────────────────────────────────────
  const importCSV = async () => {
    if (!csvText.trim()) { showAlert('Empty', 'Paste CSV content first.'); return; }
    setImporting(true);
    setImportResults(null);
    const lines = csvText.trim().split('\n').filter(l => l.trim());
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const rows = lines.slice(1);
    let success = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const vals = rows[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const row: any = {};
      header.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
      const name = (row.display_name || row.name || '').trim();
      const empCodeVal = (row.employee_code || row.emp_code || '').trim();
      if (!name) { errors.push(`Row ${i + 2}: Missing name`); continue; }
      const emailVal = (row.email || `${empCodeVal.toLowerCase()}@kvs.in`).trim();
      const desg = (row.designation || 'TGT').trim();
      const subjectVal = (row.subject || 'Mathematics').trim();
      const classTeacher = (row.class_teacher_of || '').trim() || null;
      const tType = (row.teacher_type || 'Regular').trim();
      const doj = (row.date_of_joining || '').trim() || null;
      const subtitle = `${desg} ${subjectVal}${classTeacher ? ` · CT ${classTeacher}` : ''}`;
      const password = `Kvpatm2.${empCodeVal || name.replace(/\s/g, '').toLowerCase().slice(0, 8)}`;

      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email: emailVal, password, options: { data: { role: 'teacher' } },
      });
      const isAlreadyRegistered = signUpErr?.message?.includes('already registered');
      if (signUpErr && !isAlreadyRegistered) { errors.push(`Row ${i + 2} (${name}): ${signUpErr.message}`); continue; }
      const userId = authData?.user?.id;
      if (userId) {
        await supabase.from('user_profiles').upsert({
          id: userId, email: emailVal, display_name: name,
          employee_code: empCodeVal, subtitle, subject: subjectVal,
          class_teacher_of: classTeacher, phone: row.phone ?? '',
          role: 'teacher', is_active: true, teacher_type: tType, date_of_joining: doj,
        });
        success++;
      } else if (isAlreadyRegistered) {
        const { data: existing } = await supabase.from('user_profiles').select('id').eq('email', emailVal).maybeSingle();
        if (existing?.id) {
          await supabase.from('user_profiles').update({ display_name: name, employee_code: empCodeVal, subtitle, subject: subjectVal, class_teacher_of: classTeacher, teacher_type: tType, date_of_joining: doj }).eq('id', existing.id);
          success++;
        } else {
          errors.push(`Row ${i + 2} (${name}): Already registered but profile not found`);
        }
      }
    }
    setImporting(false);
    setImportResults({ success, failed: errors.length, errors });
    if (errors.length === 0) {
      showAlert('Import complete', `${success} teachers imported.`);
      setShowBulk(false); setCsvText(''); setImportResults(null);
    }
    loadAll();
  };

  const registeredCodes = new Set(teachers.map(t => t.employee_code).filter(Boolean));
  const filtered = teachers.filter(t => {
    const matchType = filterType === 'All' || (t.teacher_type ?? 'Regular') === filterType;
    const matchSearch = !search.trim() || (t.display_name ?? '').toLowerCase().includes(search.toLowerCase()) || (t.employee_code ?? '').includes(search) || (t.subject ?? '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });
  const filteredDir = directory.filter(d => !search.trim() || d.display_name.toLowerCase().includes(search.toLowerCase()) || (d.employee_code ?? '').includes(search));
  const unregistered = filteredDir.filter(d => !registeredCodes.has(d.employee_code));

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Teachers" subtitle={`${teachers.length} registered · ${unregistered.length} pending`} />
      </SafeAreaView>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" color={Colors.textMuted} size={18} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search…" placeholderTextColor={Colors.textMuted} style={styles.searchInput} />
        </View>
        <Pressable onPress={() => setShowBulk(true)} style={styles.bulkBtn}>
          <MaterialCommunityIcons name="upload" color={Colors.success} size={18} />
          <Text style={styles.bulkBtnText}>Bulk</Text>
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        <Pressable onPress={() => setActiveTab('registered')} style={[styles.tab, activeTab === 'registered' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'registered' && styles.tabTextActive]}>Registered ({teachers.length})</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('directory')} style={[styles.tab, activeTab === 'directory' && styles.tabActive]}>
          <Text style={[styles.tabText, activeTab === 'directory' && styles.tabTextActive]}>
            Directory {unregistered.length > 0 ? `(${unregistered.length} pending)` : ''}
          </Text>
        </Pressable>
      </View>

      {activeTab === 'registered' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {(['All', ...TEACHER_TYPES] as const).map(t => (
            <Pressable key={t} onPress={() => setFilterType(t as any)} style={[styles.filterChip, filterType === t && styles.filterChipActive]}>
              <Text style={[styles.filterText, filterType === t && styles.filterTextActive]}>{t}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : activeTab === 'registered' ? (
        <FlatList
          data={filtered}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <MaterialCommunityIcons name="account-group" color={Colors.textMuted} size={48} />
              <Text style={styles.emptyText}>No teachers found</Text>
              <Text style={styles.emptySubText}>Use Bulk Import or tap the Staff Directory tab</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.tCard}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.display_name ?? 'T')[0]}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.tName} numberOfLines={1}>{item.display_name ?? '—'}</Text>
                  <Text style={styles.tSub} numberOfLines={1}>{item.subtitle ?? item.subject ?? '—'}</Text>
                  {item.employee_code ? <Text style={styles.tCode}>Code: {item.employee_code}</Text> : null}
                  {item.email ? <Text style={styles.tCode}>{item.email}</Text> : null}
                </View>
                <View style={{ gap: 4, alignItems: 'flex-end' }}>
                  <Pill label={item.teacher_type ?? 'Regular'} tone={TYPE_COLORS[item.teacher_type as TeacherType] as any ?? 'success'} />
                  {item.class_teacher_of ? <Pill label={`CT ${item.class_teacher_of}`} tone="info" /> : null}
                </View>
              </View>
              <View style={styles.actionRowBtns}>
                <Pressable onPress={() => openEdit(item)} style={styles.editBtn}>
                  <MaterialCommunityIcons name="pencil" color={Colors.info} size={14} />
                  <Text style={[styles.actionText, { color: Colors.info }]}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => removeTeacher(item)} style={styles.delBtn}>
                  <MaterialCommunityIcons name="delete-outline" color={Colors.danger} size={14} />
                  <Text style={[styles.actionText, { color: Colors.danger }]}>Remove</Text>
                </Pressable>
              </View>
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        />
      ) : (
        <FlatList
          data={filteredDir}
          keyExtractor={d => d.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              <View style={styles.dirInfo}>
                <MaterialCommunityIcons name="information" color={Colors.info} size={14} />
                <Text style={styles.dirInfoText}>
                  {unregistered.length} staff not yet registered. Default password: Kvpatm2.[EmployeeCode]
                </Text>
              </View>
              {/* Primary: Server-side bulk creation via edge function */}
              <Pressable
                onPress={createAllTeacherAccounts}
                style={[styles.createAllBtn, creatingAllAccounts && { opacity: 0.6 }]}
                disabled={creatingAllAccounts}
              >
                {creatingAllAccounts ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <MaterialCommunityIcons name="server" color="#fff" size={18} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.addAllText}>
                    {creatingAllAccounts ? 'Creating accounts…' : `Create All ${directory.length} Teacher Accounts`}
                  </Text>
                  <Text style={styles.addAllSubText}>Uses admin API · Auto-confirms email · No spam</Text>
                </View>
              </Pressable>

              {unregistered.length > 0 && (
                <Pressable
                  onPress={addAllUnregistered}
                  style={[styles.addAllBtn, addingAll && { opacity: 0.6 }]}
                  disabled={addingAll}
                >
                  {addingAll ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <MaterialCommunityIcons name="account-multiple-plus" color="#fff" size={18} />
                  )}
                  <Text style={styles.addAllText}>
                    {addingAll ? 'Registering all…' : `Register ${unregistered.length} Pending (client-side)`}
                  </Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item }) => {
            const isRegistered = registeredCodes.has(item.employee_code);
            return (
              <Card style={[styles.tCard, isRegistered && { opacity: 0.55 }]}>
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: isRegistered ? Colors.successBg : Colors.surfaceTint }]}>
                    <Text style={[styles.avatarText, { color: isRegistered ? Colors.success : Colors.primary }]}>
                      {item.display_name[0]}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.tName} numberOfLines={1}>{item.display_name}</Text>
                    <Text style={styles.tSub}>{item.designation} · {item.subject ?? 'Principal'}</Text>
                    <Text style={styles.tCode}>Code: {item.employee_code}</Text>
                    {item.class_teacher_of ? <Text style={[styles.tCode, { color: Colors.info }]}>Class Teacher: {item.class_teacher_of}</Text> : null}
                  </View>
                  {isRegistered ? (
                    <Pill label="Registered" tone="success" />
                  ) : (
                    <Pressable onPress={() => importFromDirectory(item)} style={[styles.editBtn, { backgroundColor: Colors.successBg }]} disabled={saving}>
                      <MaterialCommunityIcons name="account-plus" color={Colors.success} size={14} />
                      <Text style={[styles.actionText, { color: Colors.success }]}>Add</Text>
                    </Pressable>
                  )}
                </View>
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        />
      )}

      {/* Create Results Modal */}
      <Modal visible={showCreateResults} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreateResults(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Account Creation Results</Text>
            <Pressable onPress={() => setShowCreateResults(false)} hitSlop={12}>
              <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form}>
            {createResults && (
              <>
                <View style={styles.summaryRow}>
                  <SummaryBadge count={createResults.summary?.created ?? 0} label="Created" color={Colors.success} bg={Colors.successBg} />
                  <SummaryBadge count={createResults.summary?.skipped ?? 0} label="Skipped" color={Colors.warning} bg={Colors.warningBg} />
                  <SummaryBadge count={createResults.summary?.failed ?? 0} label="Failed" color={Colors.danger} bg={Colors.dangerBg} />
                </View>
                <View style={styles.infoBanner}>
                  <MaterialCommunityIcons name="information" color={Colors.info} size={14} />
                  <Text style={styles.infoText}>
                    Login format: [employee_code]@kvs.in{`\n`}Password: Kvpatm2.[EmployeeCode]{`\n`}Example: 79553@kvs.in / Kvpatm2.79553
                  </Text>
                </View>
                {(createResults.results ?? []).map((r: any, i: number) => (
                  <View key={i} style={[styles.resultRow, { borderLeftColor: r.status === 'created' ? Colors.success : r.status === 'failed' ? Colors.danger : Colors.warning }]}>
                    <MaterialCommunityIcons
                      name={r.status === 'created' ? 'check-circle' : r.status === 'failed' ? 'close-circle' : 'skip-next-circle'}
                      color={r.status === 'created' ? Colors.success : r.status === 'failed' ? Colors.danger : Colors.warning}
                      size={16}
                    />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.resultName}>{r.name}</Text>
                      <Text style={styles.resultEmail}>{r.email}</Text>
                      {r.error ? <Text style={styles.resultError}>{r.error}</Text> : null}
                    </View>
                    <Pill label={r.status} tone={r.status === 'created' ? 'success' : r.status === 'failed' ? 'danger' : 'warning'} />
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Pressable onPress={openAdd} style={styles.fab}>
        <MaterialCommunityIcons name="plus" color="#fff" size={28} />
      </Pressable>

      {/* Single Teacher Form */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTeacher ? 'Edit Teacher' : 'Add Teacher'}</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <FField label="Full Name" value={displayName} onChange={setDisplayName} />
              <FField label="Employee Code" value={empCode} onChange={setEmpCode} keyboard="number-pad" />
              <FField label="Official Email" value={ownEmail} onChange={setOwnEmail} keyboard="email-address" placeholder="teacher@kvs.in" />
              <FField label="Phone" value={phone} onChange={setPhone} keyboard="phone-pad" />
              <FField label="Date of Joining (YYYY-MM-DD)" value={dateOfJoining} onChange={setDateOfJoining} />

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Teacher Type</Text>
              <View style={styles.chips}>
                {TEACHER_TYPES.map(t => (
                  <Pressable key={t} onPress={() => setTeacherType(t)} style={[styles.chip, teacherType === t && styles.chipActive]}>
                    <Text style={[styles.chipText, teacherType === t && styles.chipTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Designation</Text>
              <View style={styles.chips}>
                {DESIGNATIONS.map(d => (
                  <Pressable key={d} onPress={() => setDesignation(d)} style={[styles.chip, designation === d && styles.chipActive]}>
                    <Text style={[styles.chipText, designation === d && styles.chipTextActive]}>{d}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Subject</Text>
              <View style={styles.chips}>
                {SUBJECTS.map(s => (
                  <Pressable key={s} onPress={() => setSubject(s)} style={[styles.chip, subject === s && styles.chipActive]}>
                    <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Class Teacher Of</Text>
              <View style={styles.chips}>
                <Pressable onPress={() => setClassOf('')} style={[styles.chip, classOf === '' && styles.chipActive]}>
                  <Text style={[styles.chipText, classOf === '' && styles.chipTextActive]}>None</Text>
                </Pressable>
                {SECTIONS.map(s => (
                  <Pressable key={s} onPress={() => setClassOf(s)} style={[styles.chip, classOf === s && styles.chipActive]}>
                    <Text style={[styles.chipText, classOf === s && styles.chipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              <PrimaryButton label={editTeacher ? 'Update' : 'Add Teacher'} onPress={submit} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal visible={showBulk} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBulk(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Teacher Import</Text>
              <Pressable onPress={() => setShowBulk(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <View style={styles.infoBanner}>
                <MaterialCommunityIcons name="information" color={Colors.info} size={14} />
                <Text style={styles.infoText}>Required: display_name, employee_code. Optional: email, designation, subject, class_teacher_of, teacher_type, date_of_joining, phone.{'\n'}Default login: [code]@kvs.in · Password: Kvpatm2.[Code]</Text>
              </View>
              <Pressable onPress={async () => { try { await Share.share({ message: SAMPLE_TEACHER_CSV }); } catch {} }} style={styles.sampleBtn}>
                <MaterialCommunityIcons name="download" color={Colors.info} size={16} />
                <Text style={styles.sampleBtnText}>Download Sample CSV</Text>
              </Pressable>
              <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Paste CSV Content</Text>
              <TextInput value={csvText} onChangeText={setCsvText} placeholder={SAMPLE_TEACHER_CSV} placeholderTextColor={Colors.textMuted} multiline numberOfLines={10} style={styles.csvInput} />
              {importResults && (
                <View style={[styles.resultsBox, { borderColor: importResults.failed > 0 ? Colors.warning : Colors.success }]}>
                  <Text style={[styles.resultsTitle, { color: importResults.failed > 0 ? Colors.warning : Colors.success }]}>
                    {importResults.success} success · {importResults.failed} failed
                  </Text>
                  {importResults.errors.map((e, i) => <Text key={i} style={styles.errorLine}>• {e}</Text>)}
                </View>
              )}
              <PrimaryButton label={importing ? 'Importing…' : 'Import Teachers'} onPress={importCSV} loading={importing} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SummaryBadge({ count, label, color, bg }: { count: number; label: string; color: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' }}>
      <Text style={{ fontSize: 28, fontWeight: '900', color }}>{count}</Text>
      <Text style={{ fontSize: 11, fontWeight: '700', color, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

function FField({ label, value, onChange, keyboard, placeholder }: { label: string; value: string; onChange: (v: string) => void; keyboard?: any; placeholder?: string }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType={keyboard ?? 'default'} placeholder={placeholder ?? ''} placeholderTextColor={Colors.textMuted} autoCapitalize="none"
        style={{ marginTop: 6, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, gap: 8 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  bulkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: Colors.successBg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.success + '40' },
  bulkBtnText: { color: Colors.success, fontSize: 12, fontWeight: '800' },
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, gap: 8 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  filterBar: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },
  createAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1B5E3F', borderRadius: Radius.md, paddingVertical: 14, paddingHorizontal: 16, marginBottom: Spacing.md, borderWidth: 1.5, borderColor: '#2ECC71' },
  addAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12, paddingHorizontal: 16, marginBottom: Spacing.md },
  addAllText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  addAllSubText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '500', marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderLeftWidth: 3, borderRadius: Radius.sm, backgroundColor: Colors.surfaceMuted, marginBottom: 6 },
  resultName: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  resultEmail: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  resultError: { fontSize: 11, color: Colors.danger, marginTop: 2 },
  dirInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: 10, marginBottom: Spacing.md },
  dirInfoText: { flex: 1, fontSize: 12, color: Colors.info, fontWeight: '500', lineHeight: 18 },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  tCard: { paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  tName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  tSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  tCode: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  actionRowBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.infoBg, borderRadius: Radius.sm },
  delBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.dangerBg, borderRadius: Radius.sm },
  actionText: { fontSize: 12, fontWeight: '700' },
  emptyText: { fontSize: 15, fontWeight: '600', color: Colors.textMuted, marginTop: 12 },
  emptySubText: { fontSize: 12, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: 12, marginBottom: Spacing.lg },
  infoText: { flex: 1, fontSize: 12, color: Colors.info, fontWeight: '500', lineHeight: 18 },
  sampleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: Colors.infoBg, borderRadius: Radius.md },
  sampleBtnText: { color: Colors.info, fontSize: 13, fontWeight: '700' },
  csvInput: { backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, padding: 14, fontSize: 13, color: Colors.textPrimary, minHeight: 180, borderWidth: 1, borderColor: Colors.border, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 8 },
  resultsBox: { borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg },
  resultsTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  errorLine: { fontSize: 12, color: Colors.danger, marginTop: 4 },
});

// Admin: Timetable + Bulk Teacher Assignment to Sections
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useAlert } from '@/template';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SECTIONS = ['10A', '10B', '10C', '10D', '11A', '11B', '12A', '12B'];
const SUBJECTS = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Hindi',
  'Social Science', 'Computer Science', 'Economics', 'Work Education', 'Art Education', 'Physical Education'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const PERIOD_TIMES: Record<number, [string, string]> = {
  1: ['8:00', '8:45'], 2: ['8:45', '9:30'], 3: ['9:30', '10:15'],
  4: ['10:30', '11:15'], 5: ['11:15', '12:00'], 6: ['12:45', '1:30'],
  7: ['1:30', '2:15'], 8: ['2:15', '3:00'],
};

const SAMPLE_CSV = `section,day_of_week,period,subject,start_time,end_time
10C,Monday,1,English,8:00,8:45
10C,Monday,2,Mathematics,8:45,9:30
10C,Monday,3,Science,9:30,10:15
11A,Monday,1,Computer Science,8:00,8:45
11A,Monday,2,Physics,8:45,9:30`;

const subjectColor = (sub: string): string => {
  const map: Record<string, string> = {
    'Mathematics': '#2A6FDB', 'Science': '#1FA971', 'English': '#E0414C',
    'Hindi': '#E8A317', 'Social Science': '#6E55C2', 'Physics': '#0891b2',
    'Chemistry': '#d97706', 'Computer Science': '#7c3aed', 'Biology': '#059669',
  };
  return map[sub] ?? Colors.primary;
};

export default function AdminTimetableManager() {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<'timetable' | 'assign'>('timetable');
  const [section, setSection] = useState('10C');
  const [day, setDay] = useState('Monday');
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [uploading, setUploading] = useState(false);

  // Add form
  const [period, setPeriod] = useState(1);
  const [subject, setSubject] = useState('Mathematics');
  const [saving, setSaving] = useState(false);

  // Teacher assignment state
  const [teachers, setTeachers] = useState<any[]>([]);
  const [assignSection, setAssignSection] = useState('10C');
  const [assignTeacherId, setAssignTeacherId] = useState('');
  const [assignSubject, setAssignSubject] = useState('Mathematics');
  const [assignAllDays, setAssignAllDays] = useState(true);
  const [assignPeriods, setAssignPeriods] = useState<number[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  useEffect(() => { loadTimetable(); }, [section, day]);
  useEffect(() => { if (activeTab === 'assign') loadTeachers(); }, [activeTab]);

  const loadTimetable = async () => {
    setLoading(true);
    const { data } = await supabase.from('timetable').select('*, user_profiles(display_name)').eq('section', section).eq('day_of_week', day).order('period');
    setTimetable(data ?? []);
    setLoading(false);
  };

  const loadTeachers = async () => {
    setLoadingTeachers(true);
    const { data } = await supabase.from('user_profiles').select('id, display_name, subject, class_teacher_of, employee_code').in('role', ['teacher', 'admin']).eq('is_active', true).order('display_name');
    setTeachers(data ?? []);
    setLoadingTeachers(false);
  };

  const addPeriod = async () => {
    const times = PERIOD_TIMES[period] ?? ['8:00', '8:45'];
    setSaving(true);
    const { error } = await supabase.from('timetable').upsert({
      section, day_of_week: day, period, subject,
      start_time: times[0], end_time: times[1],
    }, { onConflict: 'section,day_of_week,period' });
    setSaving(false);
    if (error) { showAlert('Error', error.message); return; }
    showAlert('Added', `Period ${period} · ${subject}`);
    setShowAddForm(false);
    loadTimetable();
  };

  const deletePeriod = async (id: string, periodNum: number) => {
    showAlert('Delete period?', `Remove Period ${periodNum}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('timetable').delete().eq('id', id);
        loadTimetable();
      }},
    ]);
  };

  // ─── Bulk assign teacher to multiple timetable periods ────────────────────
  const bulkAssignTeacher = async () => {
    if (!assignTeacherId) { showAlert('Select teacher', 'Choose a teacher first.'); return; }
    if (assignPeriods.length === 0 && !assignAllDays) { showAlert('Select periods', 'Select at least one period.'); return; }

    setAssignSaving(true);
    const selectedTeacher = teachers.find(t => t.id === assignTeacherId);
    const daysToAssign = assignAllDays ? DAYS : [day];
    let count = 0;
    const errors: string[] = [];

    for (const d of daysToAssign) {
      const periodsToUse = assignPeriods.length > 0 ? assignPeriods : PERIODS;
      for (const p of periodsToUse) {
        const { error } = await supabase.from('timetable').upsert({
          section: assignSection,
          day_of_week: d,
          period: p,
          subject: assignSubject,
          teacher_id: assignTeacherId,
          start_time: PERIOD_TIMES[p]?.[0] ?? '8:00',
          end_time: PERIOD_TIMES[p]?.[1] ?? '8:45',
        }, { onConflict: 'section,day_of_week,period' });
        if (error) errors.push(`${d} P${p}: ${error.message}`);
        else count++;
      }
    }

    // Also update teacher_assignments
    const existing = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('teacher_id', assignTeacherId)
      .eq('section', assignSection)
      .eq('subject', assignSubject)
      .maybeSingle();

    if (!existing.data) {
      await supabase.from('teacher_assignments').insert({
        teacher_id: assignTeacherId,
        section: assignSection,
        subject: assignSubject,
        is_class_teacher: selectedTeacher?.class_teacher_of === assignSection,
      });
    }

    // Update teacher's teaching_sections
    const { data: profileData } = await supabase.from('user_profiles').select('teaching_sections').eq('id', assignTeacherId).single();
    const existingSections: string[] = Array.isArray(profileData?.teaching_sections) ? profileData.teaching_sections : [];
    if (!existingSections.includes(assignSection)) {
      await supabase.from('user_profiles').update({
        teaching_sections: [...existingSections, assignSection],
      }).eq('id', assignTeacherId);
    }

    setAssignSaving(false);
    if (errors.length > 0) {
      showAlert('Partial success', `${count} slots assigned. ${errors.length} failed.`);
    } else {
      showAlert('Assigned', `${selectedTeacher?.display_name} assigned to ${count} slot(s) in ${assignSection}.`);
    }
    setAssignPeriods([]);
    loadTimetable();
  };

  const parseCsvAndUpload = async () => {
    if (!csvText.trim()) { showAlert('Empty', 'Paste CSV content first.'); return; }
    setUploading(true);
    const lines = csvText.trim().split('\n').filter(l => l.trim());
    const header = lines[0].toLowerCase().split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      header.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
      if (row.section && row.day_of_week && row.period && row.subject) {
        rows.push({
          section: row.section, day_of_week: row.day_of_week,
          period: parseInt(row.period), subject: row.subject,
          start_time: row.start_time || '8:00', end_time: row.end_time || '8:45',
        });
      }
    }
    if (rows.length === 0) { showAlert('Parse error', 'No valid rows found.'); setUploading(false); return; }
    const { error } = await supabase.from('timetable').upsert(rows, { onConflict: 'section,day_of_week,period' });
    setUploading(false);
    if (error) { showAlert('Upload failed', error.message); return; }
    showAlert('Uploaded', `${rows.length} timetable entries updated.`);
    setShowBulkUpload(false);
    setCsvText('');
    loadTimetable();
  };

  const togglePeriod = (p: number) => {
    setAssignPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Timetable Manager" subtitle="Schedule & teacher assignment" />
      </SafeAreaView>

      {/* Tab row */}
      <View style={styles.tabRow}>
        <Pressable onPress={() => setActiveTab('timetable')} style={[styles.tab, activeTab === 'timetable' && styles.tabActive]}>
          <MaterialCommunityIcons name="timetable" color={activeTab === 'timetable' ? '#fff' : Colors.textSecondary} size={16} />
          <Text style={[styles.tabText, activeTab === 'timetable' && styles.tabTextActive]}>View Schedule</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('assign')} style={[styles.tab, activeTab === 'assign' && styles.tabActive]}>
          <MaterialCommunityIcons name="account-arrow-right" color={activeTab === 'assign' ? '#fff' : Colors.textSecondary} size={16} />
          <Text style={[styles.tabText, activeTab === 'assign' && styles.tabTextActive]}>Assign Teachers</Text>
        </Pressable>
      </View>

      {activeTab === 'timetable' ? (
        <>
          {/* Section & Day filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBarContent}>
            {SECTIONS.map(s => (
              <Pressable key={s} onPress={() => setSection(s)} style={[styles.chip, section === s && styles.chipActive]}>
                <Text style={[styles.chipText, section === s && styles.chipTextActive]}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBarContent}>
            {DAYS.map(d => (
              <Pressable key={d} onPress={() => setDay(d)} style={[styles.chip, day === d && styles.chipActive]}>
                <Text style={[styles.chipText, day === d && styles.chipTextActive]}>{d.slice(0, 3)}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.actionRow}>
            <Pressable onPress={async () => { try { await Share.share({ message: SAMPLE_CSV }); } catch {} }} style={styles.sampleBtn}>
              <MaterialCommunityIcons name="download" color={Colors.info} size={16} />
              <Text style={styles.sampleBtnText}>Sample</Text>
            </Pressable>
            <Pressable onPress={() => setShowBulkUpload(true)} style={styles.uploadBtn}>
              <MaterialCommunityIcons name="upload" color={Colors.success} size={16} />
              <Text style={styles.uploadBtnText}>Bulk Upload</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={timetable}
              keyExtractor={i => i.id}
              contentContainerStyle={styles.list}
              ListHeaderComponent={<Text style={styles.dayHeader}>{section} · {day} · {timetable.length} periods</Text>}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 60 }}>
                  <MaterialCommunityIcons name="timetable" color={Colors.textMuted} size={48} />
                  <Text style={{ color: Colors.textMuted, fontSize: 16, fontWeight: '600', marginTop: 12 }}>No periods for {day}</Text>
                </View>
              }
              renderItem={({ item }) => {
                const color = subjectColor(item.subject);
                return (
                  <Card style={[styles.periodCard, { borderLeftWidth: 4, borderLeftColor: color }]}>
                    <View style={styles.row}>
                      <View style={[styles.periodBadge, { backgroundColor: color + '20' }]}>
                        <Text style={[styles.periodNum, { color }]}>P{item.period}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.subjectName}>{item.subject}</Text>
                        <Text style={styles.timeText}>{item.start_time} – {item.end_time}</Text>
                        {item.user_profiles?.display_name ? (
                          <Text style={styles.teacherText}>👤 {item.user_profiles.display_name}</Text>
                        ) : null}
                      </View>
                      <Pressable onPress={() => deletePeriod(item.id, item.period)} style={styles.delBtn} hitSlop={8}>
                        <MaterialCommunityIcons name="delete-outline" color={Colors.danger} size={20} />
                      </Pressable>
                    </View>
                  </Card>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          )}

          <Pressable onPress={() => setShowAddForm(true)} style={styles.fab}>
            <MaterialCommunityIcons name="plus" color="#fff" size={28} />
          </Pressable>
        </>
      ) : (
        /* ─── Assign Teachers Tab ─── */
        <ScrollView contentContainerStyle={styles.assignContent}>
          {/* Info banner */}
          <View style={styles.infoBanner}>
            <MaterialCommunityIcons name="information" color={Colors.info} size={14} />
            <Text style={styles.infoText}>
              Assign a teacher to all (or selected) periods of a section. This also updates the teacher's accessible sections in their portal.
            </Text>
          </View>

          {/* Section selector */}
          <Text style={styles.formLabel}>Section</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {SECTIONS.map(s => (
                <Pressable key={s} onPress={() => setAssignSection(s)} style={[styles.chip, assignSection === s && styles.chipActive]}>
                  <Text style={[styles.chipText, assignSection === s && styles.chipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Subject selector */}
          <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Subject</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {SUBJECTS.map(s => (
                <Pressable key={s} onPress={() => setAssignSubject(s)} style={[styles.chip, assignSubject === s && styles.chipActive]}>
                  <Text style={[styles.chipText, assignSubject === s && styles.chipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {/* Teacher picker */}
          <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Select Teacher</Text>
          {loadingTeachers ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 10 }} />
          ) : (
            <View style={styles.teacherList}>
              {teachers.filter(t => !assignSubject || (t.subject && t.subject.toLowerCase().includes(assignSubject.toLowerCase().slice(0, 4)))).concat(
                teachers.filter(t => assignSubject && (!t.subject || !t.subject.toLowerCase().includes(assignSubject.toLowerCase().slice(0, 4))))
              ).slice(0, 20).map((t, i, arr) => {
                const isSelected = assignTeacherId === t.id;
                const matchesSubject = t.subject?.toLowerCase().includes(assignSubject.toLowerCase().slice(0, 4));
                return (
                  <Pressable key={t.id} onPress={() => setAssignTeacherId(isSelected ? '' : t.id)}
                    style={[styles.teacherRow, isSelected && styles.teacherRowActive]}>
                    <View style={[styles.tAvatar, { backgroundColor: isSelected ? Colors.primary : Colors.surfaceTint }]}>
                      <Text style={[styles.tAvatarText, isSelected && { color: '#fff' }]}>{t.display_name?.[0] ?? 'T'}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.tName, isSelected && { color: Colors.primary }]}>{t.display_name}</Text>
                      <Text style={styles.tSub}>{t.subject ?? '—'}{t.class_teacher_of ? ` · CT ${t.class_teacher_of}` : ''}</Text>
                    </View>
                    {matchesSubject && (
                      <View style={styles.matchBadge}>
                        <Text style={styles.matchBadgeText}>Match</Text>
                      </View>
                    )}
                    {isSelected ? <MaterialCommunityIcons name="check-circle" color={Colors.primary} size={20} /> : null}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Period selection */}
          <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Assign to Periods</Text>
          <Pressable onPress={() => setAssignAllDays(p => !p)} style={[styles.toggleBtn, assignAllDays && styles.toggleBtnActive]}>
            <MaterialCommunityIcons name={assignAllDays ? 'check-circle' : 'circle-outline'} color={assignAllDays ? '#fff' : Colors.textSecondary} size={18} />
            <Text style={[styles.toggleText, assignAllDays && { color: '#fff' }]}>All days (Mon-Sat)</Text>
          </Pressable>

          <Text style={[styles.formLabel, { marginTop: Spacing.md }]}>Specific periods (leave empty = all)</Text>
          <View style={styles.chips}>
            {PERIODS.map(p => (
              <Pressable key={p} onPress={() => togglePeriod(p)} style={[styles.chip, assignPeriods.includes(p) && styles.chipActive]}>
                <Text style={[styles.chipText, assignPeriods.includes(p) && styles.chipTextActive]}>P{p}</Text>
              </Pressable>
            ))}
          </View>

          {assignTeacherId ? (
            <View style={styles.assignPreview}>
              <MaterialCommunityIcons name="information" color={Colors.primary} size={14} />
              <Text style={styles.assignPreviewText}>
                Assign {teachers.find(t => t.id === assignTeacherId)?.display_name} to teach {assignSubject} in {assignSection}
                {assignAllDays ? ' (all days' : ''}
                {assignPeriods.length > 0 ? `, P${assignPeriods.join(', P')}` : assignAllDays ? ', all periods' : ''}
                {assignAllDays ? ')' : ''}
              </Text>
            </View>
          ) : null}

          <PrimaryButton
            label={assignSaving ? 'Assigning…' : 'Assign Teacher to Timetable'}
            onPress={bulkAssignTeacher}
            loading={assignSaving}
            size="lg"
            style={{ marginTop: Spacing.xl }}
          />
        </ScrollView>
      )}

      {/* Add Period Modal */}
      <Modal visible={showAddForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddForm(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Period</Text>
            <Pressable onPress={() => setShowAddForm(false)} hitSlop={12}>
              <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.formLabel}>Section: {section} · {day}</Text>
            <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Period Number</Text>
            <View style={styles.chips}>
              {PERIODS.map(p => (
                <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.chip, period === p && styles.chipActive]}>
                  <Text style={[styles.chipText, period === p && styles.chipTextActive]}>P{p}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.hint}>Time: {PERIOD_TIMES[period]?.[0]} – {PERIOD_TIMES[period]?.[1]}</Text>
            <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Subject</Text>
            <View style={styles.chips}>
              {SUBJECTS.map(s => (
                <Pressable key={s} onPress={() => setSubject(s)} style={[styles.chip, subject === s && styles.chipActive]}>
                  <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton label={saving ? 'Saving…' : 'Add Period'} onPress={addPeriod} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal visible={showBulkUpload} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBulkUpload(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Upload Timetable</Text>
              <Pressable onPress={() => setShowBulkUpload(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <View style={styles.infoBanner}>
                <MaterialCommunityIcons name="information" color={Colors.info} size={16} />
                <Text style={styles.infoText}>Required columns: section, day_of_week, period, subject, start_time, end_time</Text>
              </View>
              <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Paste CSV Content</Text>
              <TextInput
                value={csvText} onChangeText={setCsvText}
                placeholder={SAMPLE_CSV}
                placeholderTextColor={Colors.textMuted}
                multiline numberOfLines={10} style={styles.csvInput}
              />
              <PrimaryButton label={uploading ? 'Uploading…' : 'Upload Timetable'} onPress={parseCsvAndUpload} loading={uploading} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.xl, marginVertical: Spacing.md, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  filterBarContent: { gap: 8, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  actionRow: { flexDirection: 'row', gap: 10, marginHorizontal: Spacing.xl, marginTop: Spacing.sm, marginBottom: Spacing.sm },
  sampleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: Colors.infoBg, borderRadius: Radius.md },
  sampleBtnText: { color: Colors.info, fontSize: 13, fontWeight: '700' },
  uploadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: Colors.successBg, borderRadius: Radius.md },
  uploadBtnText: { color: Colors.success, fontSize: 13, fontWeight: '700' },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  dayHeader: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  periodCard: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  periodBadge: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  periodNum: { fontSize: 16, fontWeight: '900' },
  subjectName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  timeText: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  teacherText: { fontSize: 11, color: Colors.info, marginTop: 2, fontWeight: '600' },
  delBtn: { padding: 6 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  assignContent: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  teacherList: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden', marginTop: 8 },
  teacherRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#fff' },
  teacherRowActive: { backgroundColor: Colors.surfaceTint },
  tAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tAvatarText: { fontSize: 14, fontWeight: '800', color: Colors.primary },
  tName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  tSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  matchBadge: { backgroundColor: Colors.successBg, borderRadius: Radius.sm, paddingHorizontal: 7, paddingVertical: 3, marginRight: 8 },
  matchBadgeText: { fontSize: 10, fontWeight: '800', color: Colors.success },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, alignSelf: 'flex-start', marginTop: 8 },
  toggleBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  assignPreview: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.surfaceTint, borderRadius: Radius.md, padding: 12, marginTop: Spacing.lg },
  assignPreviewText: { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '500', lineHeight: 18 },
  hint: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontStyle: 'italic' },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: 12, marginBottom: Spacing.lg },
  infoText: { flex: 1, fontSize: 13, color: Colors.info, fontWeight: '500', lineHeight: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  csvInput: { backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, padding: 14, fontSize: 13, color: Colors.textPrimary, minHeight: 200, borderWidth: 1, borderColor: Colors.border, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});

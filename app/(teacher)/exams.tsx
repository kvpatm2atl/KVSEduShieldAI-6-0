// Teacher: Exam & Marks Module — section-aware (class teacher vs subject teacher)
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useAlert } from '@/template';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { getSupabaseClient } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { fetchStudents, StudentRow } from '@/services/schoolData';

const supabase = getSupabaseClient();

interface Exam {
  id: string;
  name: string;
  subject: string;
  section: string;
  exam_date: string;
  max_marks: number;
  created_at: string;
}

const ALL_SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics'];
const ALL_SECTIONS = ['10A', '10B', '10C', '10D', '11A', '11B'];

function calcGrade(marks: number, max: number): string {
  const pct = (marks / max) * 100;
  if (pct >= 91) return 'A1';
  if (pct >= 81) return 'A2';
  if (pct >= 71) return 'B1';
  if (pct >= 61) return 'B2';
  if (pct >= 51) return 'C1';
  if (pct >= 41) return 'C2';
  if (pct >= 33) return 'D';
  return 'E';
}

const gradeTone = (g: string): 'success' | 'info' | 'warning' | 'danger' => {
  if (['A1','A2'].includes(g)) return 'success';
  if (['B1','B2'].includes(g)) return 'info';
  if (['C1','C2','D'].includes(g)) return 'warning';
  return 'danger';
};

export default function TeacherExams() {
  const { showAlert } = useAlert();
  const { user } = useAuth();

  const isClassTeacher = !!user?.classTeacherOf;
  const mySubject = user?.subject ?? '';
  const myClass = user?.classTeacherOf ?? user?.section ?? '10A';

  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [showMarks, setShowMarks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [filterSection, setFilterSection] = useState<string>(myClass);
  const [filterSubject, setFilterSubject] = useState<string>(isClassTeacher ? 'All' : mySubject);

  // Create form
  const [examName, setExamName] = useState('');
  const [subject, setSubject]   = useState(mySubject || ALL_SUBJECTS[0]);
  const [section, setSection]   = useState(myClass);
  const [examDate, setExamDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');

  useEffect(() => { loadExams(); }, [filterSection, filterSubject]);

  const loadExams = async () => {
    setLoading(true);
    let query = supabase.from('exams').select('*').order('exam_date', { ascending: false });

    if (isClassTeacher) {
      // Class teacher: see all subjects for their class + their subject for other classes
      if (filterSection === myClass) {
        query = query.eq('section', myClass);
      } else {
        query = query.eq('section', filterSection).eq('subject', mySubject);
      }
    } else {
      // Subject teacher: only their subject
      query = query.eq('subject', mySubject).eq('section', filterSection);
    }

    const { data } = await query;
    setExams((data as Exam[]) ?? []);
    setLoading(false);
  };

  const openMarksEntry = async (exam: Exam) => {
    setSelectedExam(exam);
    const stds = await fetchStudents(exam.section);
    setStudents(stds);

    const { data } = await supabase.from('exam_marks').select('*').eq('exam_id', exam.id);
    const marksInit: Record<string, string> = {};
    if (data) data.forEach((m: any) => { marksInit[m.student_id] = m.marks !== null ? String(m.marks) : ''; });
    setMarks(marksInit);
    setShowMarks(true);
  };

  const createExam = async () => {
    if (!examName.trim() || !examDate.trim()) { showAlert('Missing fields', 'Enter exam name and date.'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('exams')
      .insert({ name: examName.trim(), subject, section, exam_date: examDate.trim(), max_marks: parseInt(maxMarks) || 100, created_by: user?.id })
      .select().single();
    setSaving(false);
    if (error) { showAlert('Error', error.message); return; }
    setExams(prev => [data as Exam, ...prev]);
    setShowCreate(false);
    setExamName(''); setExamDate(''); setMaxMarks('100');
    showAlert('Exam created', `${subject} · ${section}`);
  };

  const saveMarks = async () => {
    if (!selectedExam) return;
    setSaving(true);
    const rows = students.map(s => {
      const m = marks[s.id];
      const numMarks = m !== undefined && m !== '' ? parseInt(m) : null;
      const grade = numMarks !== null ? calcGrade(numMarks, selectedExam.max_marks) : null;
      return { exam_id: selectedExam.id, student_id: s.id, marks: numMarks, grade, entered_by: user?.id };
    });
    const { error } = await supabase.from('exam_marks').upsert(rows, { onConflict: 'exam_id,student_id' });
    setSaving(false);
    if (error) { showAlert('Error', error.message); return; }
    showAlert('Marks saved', `${students.length} students updated.`);
    setShowMarks(false);
    loadExams();
  };

  const subjectBadge = (sub: string) => sub.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();

  const sectionsToShow = isClassTeacher
    ? ALL_SECTIONS
    : [myClass];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader
          title="Exams & Marks"
          subtitle={isClassTeacher ? `Class Teacher · ${myClass} · All subjects` : `${mySubject} · Subject Teacher`}
        />
      </SafeAreaView>

      {/* Section filter */}
      {isClassTeacher && (
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: Spacing.xl }}>
            {sectionsToShow.map(sec => (
              <Pressable key={sec} onPress={() => setFilterSection(sec)} style={[styles.chip, filterSection === sec && styles.chipActive]}>
                <Text style={[styles.chipText, filterSection === sec && styles.chipTextActive]}>
                  {sec} {sec === myClass ? '(My class)' : `· ${mySubject}`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Role info card */}
      <View style={styles.roleCard}>
        <MaterialCommunityIcons name={isClassTeacher ? 'star-circle' : 'book-open-variant'} color={isClassTeacher ? Colors.saffron : Colors.info} size={18} />
        <Text style={styles.roleText}>
          {isClassTeacher
            ? `Class Teacher: Full access to ${myClass}. Subject teacher (${mySubject}) for other sections.`
            : `Subject Teacher: Viewing ${mySubject} exams for section ${filterSection}.`}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <StatBox label="Total" value={`${exams.length}`} icon="clipboard-list" tone={Colors.primary} bg={Colors.surfaceTint} />
              <StatBox label="Subjects" value={`${new Set(exams.map(e => e.subject)).size}`} icon="book-multiple" tone={Colors.info} bg={Colors.infoBg} />
              <StatBox label="Sections" value={`${new Set(exams.map(e => e.section)).size}`} icon="google-classroom" tone={Colors.success} bg={Colors.successBg} />
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="clipboard-list" color={Colors.textMuted} size={48} />
              <Text style={styles.emptyText}>No exams yet</Text>
              <Text style={styles.emptySubText}>Tap + to create one</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={{ marginBottom: Spacing.md }}>
              <View style={styles.examRow}>
                <View style={styles.examBadge}>
                  <Text style={styles.examBadgeText}>{subjectBadge(item.subject)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.examName}>{item.name}</Text>
                  <Text style={styles.examSub}>{item.subject} · {item.section} · Max {item.max_marks}</Text>
                  <Text style={styles.examDate}>{item.exam_date}</Text>
                </View>
                <Pill label={item.section} tone="info" />
              </View>
              <Pressable onPress={() => openMarksEntry(item)} style={styles.enterBtn}>
                <MaterialCommunityIcons name="pencil-box" color={Colors.primary} size={16} />
                <Text style={styles.enterBtnText}>Enter / Edit Marks</Text>
              </Pressable>
            </Card>
          )}
        />
      )}

      <Pressable onPress={() => setShowCreate(true)} style={styles.fab}>
        <MaterialCommunityIcons name="plus" color="#fff" size={28} />
      </Pressable>

      {/* Create Exam */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top','bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Exam</Text>
            <Pressable onPress={() => setShowCreate(false)} hitSlop={10}>
              <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <Text style={styles.formLabel}>Exam Name</Text>
            <TextInput value={examName} onChangeText={setExamName} placeholder="e.g. Unit Test 2" placeholderTextColor={Colors.textMuted} style={styles.formInput} />

            <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Section</Text>
            <View style={styles.chips}>
              {(isClassTeacher ? ALL_SECTIONS : [myClass]).map(s => (
                <Pressable key={s} onPress={() => setSection(s)} style={[styles.chip, section === s && styles.chipActive]}>
                  <Text style={[styles.chipText, section === s && styles.chipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Subject</Text>
            <View style={styles.chips}>
              {(isClassTeacher && section === myClass ? ALL_SUBJECTS : [mySubject]).map(s => (
                <Pressable key={s} onPress={() => setSubject(s)} style={[styles.chip, subject === s && styles.chipActive]}>
                  <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Date (YYYY-MM-DD)</Text>
            <TextInput value={examDate} onChangeText={setExamDate} placeholder="2025-07-21" placeholderTextColor={Colors.textMuted} style={styles.formInput} />

            <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Max Marks</Text>
            <TextInput value={maxMarks} onChangeText={setMaxMarks} placeholder="100" placeholderTextColor={Colors.textMuted} style={styles.formInput} keyboardType="number-pad" />

            <PrimaryButton label="Create Exam" onPress={createExam} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Marks Entry */}
      <Modal visible={showMarks} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowMarks(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top','bottom']}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedExam?.name}</Text>
                <Text style={styles.modalSub}>{selectedExam?.subject} · {selectedExam?.section} · Max {selectedExam?.max_marks}</Text>
              </View>
              <Pressable onPress={() => setShowMarks(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            {students.length === 0 ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={{ color: Colors.textMuted, marginTop: 12 }}>Loading students…</Text>
              </View>
            ) : (
              <FlatList
                data={students}
                keyExtractor={(s) => s.id}
                contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 120 }}
                renderItem={({ item }) => {
                  const m = marks[item.id] ?? '';
                  const numM = m !== '' ? parseInt(m) : null;
                  const grade = numM !== null && selectedExam ? calcGrade(numM, selectedExam.max_marks) : null;
                  return (
                    <View style={styles.markRow}>
                      <View style={styles.markAvatar}>
                        <Text style={styles.markAvatarText}>{item.name.split(' ').map(w => w[0]).slice(0,2).join('')}</Text>
                      </View>
                      <Text style={styles.markName} numberOfLines={1}>{item.name}</Text>
                      <TextInput
                        value={m}
                        onChangeText={v => setMarks(prev => ({ ...prev, [item.id]: v }))}
                        placeholder="—"
                        placeholderTextColor={Colors.textMuted}
                        keyboardType="number-pad"
                        style={styles.markInput}
                        maxLength={3}
                      />
                      {grade ? <Pill label={grade} tone={gradeTone(grade)} /> : <View style={{ width: 42 }} />}
                    </View>
                  );
                }}
                ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
              />
            )}
            <View style={styles.marksFooter}>
              <PrimaryButton label={`Save Marks (${students.length} students)`} onPress={saveMarks} loading={saving} size="lg" />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StatBox({ label, value, icon, tone, bg }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; tone: string; bg: string }) {
  return (
    <View style={[styles.statBox, Shadows.card]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} color={tone} size={20} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { paddingVertical: Spacing.md },
  roleCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: Spacing.xl, marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceTint, borderRadius: Radius.md, padding: 10,
  },
  roleText: { flex: 1, fontSize: 12, color: Colors.textSecondary, fontWeight: '600', lineHeight: 18 },
  list: { padding: Spacing.xl, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.xl },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, marginTop: 8 },
  statLabel: { fontSize: 10, color: Colors.textSecondary, fontWeight: '600', marginTop: 2 },
  examRow: { flexDirection: 'row', alignItems: 'center' },
  examBadge: { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  examBadgeText: { fontSize: 12, fontWeight: '900', color: Colors.primary, letterSpacing: 0.5 },
  examName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  examSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  examDate: { fontSize: 12, color: Colors.textMuted, marginTop: 2, fontWeight: '600' },
  enterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.lg, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: Colors.surfaceTint, borderRadius: Radius.md, alignSelf: 'flex-start' },
  enterBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  emptySubText: { fontSize: 13, color: Colors.textMuted },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  formInput: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', padding: 12, borderRadius: Radius.md, ...Shadows.card },
  markAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  markAvatarText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  markName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  markInput: { width: 58, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 8, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', borderWidth: 1.5, borderColor: Colors.border },
  marksFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.xl, backgroundColor: 'rgba(245,247,251,0.96)', borderTopWidth: 1, borderTopColor: Colors.border },
});

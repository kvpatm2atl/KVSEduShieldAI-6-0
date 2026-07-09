// Teacher: Student Analytics — weak students, attendance trends, HW defaulters, remarks
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useAlert } from '@/template';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { fetchStudents, StudentRow, addRemark, fetchRemarks } from '@/services/schoolData';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

const REMARK_CATEGORIES = ['Academic', 'Behaviour', 'Health', 'Achievement', 'Attendance'];

const TABS = ['Overview', 'Weak Students', 'Absentees', 'HW Defaulters', 'Remarks'];

export default function TeacherAnalytics() {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const section = user?.classTeacherOf ?? user?.section ?? '10A';

  const [activeTab, setActiveTab] = useState(0);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, boolean>>({});

  // Remarks state
  const [remarks, setRemarks] = useState<any[]>([]);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [remarkText, setRemarkText] = useState('');
  const [remarkCategory, setRemarkCategory] = useState('Academic');
  const [savingRemark, setSavingRemark] = useState(false);

  useEffect(() => { loadData(); }, [section]);

  const loadData = async () => {
    setLoading(true);
    const stds = await fetchStudents(section);
    setStudents(stds);

    // Load today's attendance
    const today = new Date().toISOString().split('T')[0];
    const ids = stds.map(s => s.id);
    if (ids.length > 0) {
      const { data: attData } = await supabase
        .from('attendance')
        .select('student_id, present')
        .in('student_id', ids)
        .eq('date', today);
      const map: Record<string, boolean> = {};
      stds.forEach(s => { map[s.id] = true; }); // default present
      if (attData) attData.forEach((r: any) => { map[r.student_id] = r.present; });
      setAttendanceMap(map);
    }

    // Load remarks
    if (ids.length > 0) {
      const { data: rmkData } = await supabase
        .from('remarks')
        .select('*, students(name, section)')
        .in('student_id', ids)
        .order('created_at', { ascending: false })
        .limit(50);
      setRemarks(rmkData ?? []);
    }

    setLoading(false);
  };

  const weakStudents = students.filter(s => (s.attendance_pct ?? 90) < 80).sort((a, b) => a.attendance_pct - b.attendance_pct);
  const absentToday = students.filter(s => attendanceMap[s.id] === false);
  const goodAttendance = students.filter(s => (s.attendance_pct ?? 90) >= 90);

  const avgAtt = students.length > 0
    ? Math.round(students.reduce((s, st) => s + (st.attendance_pct ?? 90), 0) / students.length)
    : 0;

  const openRemark = (student: StudentRow) => {
    setSelectedStudent(student);
    setRemarkText('');
    setRemarkCategory('Academic');
    setShowRemarkModal(true);
  };

  const saveRemark = async () => {
    if (!selectedStudent || !remarkText.trim()) {
      showAlert('Missing', 'Please enter a remark.');
      return;
    }
    setSavingRemark(true);
    const { error } = await addRemark({
      student_id: selectedStudent.id,
      teacher_id: user!.id,
      remark_text: remarkText.trim(),
      category: remarkCategory,
    });
    setSavingRemark(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Remark added', `Remark for ${selectedStudent.name} saved.`);
    setShowRemarkModal(false);
    loadData();
  };

  const renderOverview = () => (
    <ScrollView contentContainerStyle={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Summary stats */}
      <View style={styles.statsGrid}>
        <StatCard icon="account-group" label="Total" value={`${students.length}`} tone={Colors.primary} bg={Colors.surfaceTint} />
        <StatCard icon="account-check" label="Avg Att." value={`${avgAtt}%`} tone={Colors.success} bg={Colors.successBg} />
        <StatCard icon="account-alert" label="Below 80%" value={`${weakStudents.length}`} tone={Colors.danger} bg={Colors.dangerBg} />
        <StatCard icon="check-circle" label="Above 90%" value={`${goodAttendance.length}`} tone={Colors.success} bg={Colors.successBg} />
      </View>

      {/* Attendance distribution bar */}
      <Card style={{ marginTop: Spacing.lg }}>
        <Text style={styles.cardTitle}>Attendance distribution</Text>
        <View style={styles.distRow}>
          {[
            { label: '<70%', count: students.filter(s => s.attendance_pct < 70).length, color: Colors.danger },
            { label: '70-80%', count: students.filter(s => s.attendance_pct >= 70 && s.attendance_pct < 80).length, color: Colors.warning },
            { label: '80-90%', count: students.filter(s => s.attendance_pct >= 80 && s.attendance_pct < 90).length, color: Colors.info },
            { label: '90%+', count: students.filter(s => s.attendance_pct >= 90).length, color: Colors.success },
          ].map(b => (
            <View key={b.label} style={styles.distItem}>
              <View style={[styles.distBar, { height: Math.max(10, b.count * 4), backgroundColor: b.color }]} />
              <Text style={styles.distCount}>{b.count}</Text>
              <Text style={styles.distLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Today's absentees */}
      {absentToday.length > 0 && (
        <Card style={{ marginTop: Spacing.lg }}>
          <View style={styles.row}>
            <MaterialCommunityIcons name="account-remove" color={Colors.danger} size={20} />
            <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Absent today ({absentToday.length})</Text>
          </View>
          <View style={{ marginTop: Spacing.md, gap: 6 }}>
            {absentToday.map(s => (
              <View key={s.id} style={styles.miniRow}>
                <View style={styles.miniAvatar}>
                  <Text style={styles.miniAvatarText}>{s.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</Text>
                </View>
                <Text style={styles.miniName} numberOfLines={1}>{s.name}</Text>
                <Text style={styles.miniMeta}>{s.admission_no}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Performance insight */}
      <Card style={{ marginTop: Spacing.lg, backgroundColor: '#F0ECFD' }}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="brain" color="#6E55C2" size={22} />
          <Text style={[styles.cardTitle, { marginLeft: 8, color: '#6E55C2' }]}>AI Class Insight</Text>
        </View>
        <Text style={[styles.insightText]}>
          Class {section} average attendance is {avgAtt}%. {weakStudents.length > 0
            ? `${weakStudents.length} students need immediate attention — their attendance is below 80%.`
            : 'All students have healthy attendance above 80%.'}
          {absentToday.length > 0
            ? ` Today ${absentToday.length} students are absent.`
            : ' Full attendance today!'}
        </Text>
      </Card>
    </ScrollView>
  );

  const renderWeakStudents = () => (
    <FlatList
      data={weakStudents}
      keyExtractor={s => s.id}
      contentContainerStyle={styles.tabContent}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="check-circle" color={Colors.success} size={48} />
          <Text style={styles.emptyText}>No weak students — all above 80%!</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Card style={[styles.studentCard, { borderLeftWidth: 3, borderLeftColor: item.attendance_pct < 70 ? Colors.danger : Colors.warning }]}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: item.attendance_pct < 70 ? Colors.dangerBg : Colors.warningBg }]}>
              <Text style={[styles.avatarText, { color: item.attendance_pct < 70 ? Colors.danger : Colors.warning }]}>
                {item.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.studentMeta}>{item.admission_no}</Text>
              <View style={styles.attBar}>
                <View style={[styles.attFill, { width: `${item.attendance_pct}%`, backgroundColor: item.attendance_pct < 70 ? Colors.danger : Colors.warning }]} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <Pill label={`${item.attendance_pct}%`} tone={item.attendance_pct < 70 ? 'danger' : 'warning'} />
              <Pressable onPress={() => openRemark(item)} style={styles.remarkBtn}>
                <MaterialCommunityIcons name="comment-plus" color={Colors.info} size={14} />
                <Text style={styles.remarkBtnText}>Remark</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );

  const renderAbsentees = () => (
    <FlatList
      data={absentToday}
      keyExtractor={s => s.id}
      contentContainerStyle={styles.tabContent}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="check-all" color={Colors.success} size={48} />
          <Text style={styles.emptyText}>Full attendance today!</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Card style={styles.studentCard}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: Colors.dangerBg }]}>
              <Text style={[styles.avatarText, { color: Colors.danger }]}>
                {item.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentMeta}>{item.admission_no} · Avg {item.attendance_pct}%</Text>
            </View>
            <Pressable onPress={() => openRemark(item)} style={styles.remarkBtn}>
              <MaterialCommunityIcons name="comment-plus" color={Colors.info} size={14} />
              <Text style={styles.remarkBtnText}>Remark</Text>
            </Pressable>
          </View>
        </Card>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );

  const renderHWDefaulters = () => (
    <FlatList
      data={students.filter(s => (s.attendance_pct ?? 90) < 85)}
      keyExtractor={s => s.id}
      contentContainerStyle={styles.tabContent}
      ListHeaderComponent={
        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="information" color={Colors.info} size={16} />
          <Text style={styles.infoText}>Students with attendance below 85% are likely to have homework gaps. Connect homework completion tracking to see real data.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Card style={styles.studentCard}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: Colors.warningBg }]}>
              <Text style={[styles.avatarText, { color: Colors.warning }]}>
                {item.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentMeta}>{item.admission_no} · Att: {item.attendance_pct}%</Text>
            </View>
            <Pill label="At risk" tone="warning" />
          </View>
        </Card>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );

  const renderRemarks = () => (
    <FlatList
      data={remarks}
      keyExtractor={r => r.id}
      contentContainerStyle={styles.tabContent}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <MaterialCommunityIcons name="comment-outline" color={Colors.textMuted} size={48} />
          <Text style={styles.emptyText}>No remarks yet</Text>
          <Text style={styles.emptySubText}>Add remarks from Weak Students or Absentees tab</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Card style={styles.studentCard}>
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: Colors.infoBg }]}>
              <MaterialCommunityIcons name="comment-text" color={Colors.info} size={20} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.studentName}>{item.students?.name ?? 'Student'}</Text>
              <Text style={styles.remarkText}>{item.remark_text}</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4, alignItems: 'center' }}>
                <Pill label={item.category} tone="info" />
                <Text style={styles.remarkTime}>
                  {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Student Analytics" subtitle={`Class ${section} · ${students.length} students`} />
      </SafeAreaView>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabBarContent}>
        {TABS.map((tab, idx) => (
          <Pressable key={tab} onPress={() => setActiveTab(idx)} style={[styles.tab, activeTab === idx && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === idx && styles.tabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={{ color: Colors.textMuted, marginTop: 12, fontWeight: '600' }}>Loading analytics…</Text>
        </View>
      ) : (
        activeTab === 0 ? renderOverview() :
        activeTab === 1 ? renderWeakStudents() :
        activeTab === 2 ? renderAbsentees() :
        activeTab === 3 ? renderHWDefaulters() :
        renderRemarks()
      )}

      {/* FAB to add remark */}
      {activeTab !== 4 && (
        <Pressable
          onPress={() => {
            if (students.length > 0) openRemark(students[0]);
            else showAlert('No students', 'Load students first.');
          }}
          style={styles.fab}
        >
          <MaterialCommunityIcons name="comment-plus" color="#fff" size={24} />
        </Pressable>
      )}

      {/* Remark Modal */}
      <Modal visible={showRemarkModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowRemarkModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Remark</Text>
              <Pressable onPress={() => setShowRemarkModal(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {/* Student picker */}
              <Text style={styles.formLabel}>Student</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {students.map(s => (
                    <Pressable
                      key={s.id}
                      onPress={() => setSelectedStudent(s)}
                      style={[styles.chip, selectedStudent?.id === s.id && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, selectedStudent?.id === s.id && styles.chipTextActive]} numberOfLines={1}>
                        {s.name.split(' ')[0]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              {selectedStudent && (
                <View style={[styles.infoCard, { marginTop: Spacing.md }]}>
                  <MaterialCommunityIcons name="account" color={Colors.primary} size={16} />
                  <Text style={[styles.infoText, { color: Colors.primary }]}>
                    {selectedStudent.name} · {selectedStudent.admission_no} · Att: {selectedStudent.attendance_pct}%
                  </Text>
                </View>
              )}

              <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Category</Text>
              <View style={styles.chips}>
                {REMARK_CATEGORIES.map(c => (
                  <Pressable key={c} onPress={() => setRemarkCategory(c)} style={[styles.chip, remarkCategory === c && styles.chipActive]}>
                    <Text style={[styles.chipText, remarkCategory === c && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Remark</Text>
              <TextInput
                value={remarkText}
                onChangeText={setRemarkText}
                placeholder="Enter your observation or remark about this student…"
                placeholderTextColor={Colors.textMuted}
                style={[styles.formInput, { height: 120, textAlignVertical: 'top', paddingTop: 12 }]}
                multiline
              />

              <PrimaryButton
                label={savingRemark ? 'Saving…' : 'Save Remark'}
                onPress={saveRemark}
                loading={savingRemark}
                size="lg"
                style={{ marginTop: Spacing.xl }}
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function StatCard({ icon, label, value, tone, bg }: { icon: any; label: string; value: string; tone: string; bg: string }) {
  return (
    <View style={[styles.statCard, Shadows.card]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} color={tone} size={20} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: { paddingVertical: Spacing.sm },
  tabBarContent: { gap: 8, paddingHorizontal: Spacing.xl },
  tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  tabContent: { padding: Spacing.xl, paddingBottom: 100 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, width: '47.8%' },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary, marginTop: 8 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center' },
  distRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: Spacing.lg, height: 80 },
  distItem: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  distBar: { width: '70%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 8 },
  distCount: { fontSize: 14, fontWeight: '900', color: Colors.textPrimary, marginTop: 4 },
  distLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  miniRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniAvatar: { width: 30, height: 30, borderRadius: 9, backgroundColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { fontSize: 10, fontWeight: '800', color: Colors.danger },
  miniName: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  miniMeta: { fontSize: 11, color: Colors.textMuted },
  insightText: { fontSize: 14, color: '#6E55C2', lineHeight: 22, marginTop: Spacing.sm, fontWeight: '500' },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.success },
  emptySubText: { fontSize: 13, color: Colors.textMuted },
  studentCard: { paddingVertical: 12, paddingHorizontal: 14 },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 13 },
  studentName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  studentMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  attBar: { height: 4, backgroundColor: Colors.surfaceMuted, borderRadius: 2, marginTop: 6, width: 100 },
  attFill: { height: 4, borderRadius: 2 },
  remarkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: Colors.infoBg, borderRadius: Radius.sm },
  remarkBtnText: { color: Colors.info, fontSize: 11, fontWeight: '800' },
  remarkText: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  remarkTime: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: Spacing.md },
  infoText: { flex: 1, fontSize: 12, color: Colors.info, fontWeight: '600', lineHeight: 18 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.info, alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  formInput: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
});

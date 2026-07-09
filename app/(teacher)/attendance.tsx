// Teacher: Real attendance — ALL PRESENT default, teacher marks absent, CSV export
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAlert } from '@/template';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchStudents, fetchTodayAttendance, generateAttendanceCSV,
  saveAttendance, StudentRow
} from '@/services/schoolData';

export default function TeacherAttendance() {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const section = user?.classTeacherOf ?? user?.section ?? '10A';

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, [section]);

  const loadData = async () => {
    setLoading(true);
    const stds = await fetchStudents(section);
    setStudents(stds);
    if (stds.length > 0) {
      const att = await fetchTodayAttendance(section);
      setPresence(att);
    }
    setLoading(false);
  };

  const present = useMemo(() => Object.values(presence).filter(Boolean).length, [presence]);
  const total = students.length;
  const absent = total - present;

  const filtered = useMemo(() =>
    search.trim() ? students.filter(s =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.admission_no.toLowerCase().includes(search.toLowerCase()) ||
      String(s.roll_no ?? '').includes(search)
    ) : students
  , [students, search]);

  const toggle = (id: string) => {
    setPresence(p => ({ ...p, [id]: !p[id] }));
    setSaved(false);
  };

  const markAllPresent = () => {
    setPresence(Object.fromEntries(students.map(s => [s.id, true])));
    setSaved(false);
    showAlert('All Present', `${students.length} students marked present.`);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await saveAttendance(section, presence, user?.id);
    setSaving(false);
    if (error) { showAlert('Error saving', error); return; }
    setSaved(true);
    const absentStudents = students.filter(s => !presence[s.id]).map(s => s.name);
    const absentMsg = absentStudents.length > 0
      ? `\nAbsent: ${absentStudents.slice(0, 3).join(', ')}${absentStudents.length > 3 ? ` +${absentStudents.length - 3} more` : ''}`
      : '\nAll students present.';
    showAlert('Attendance saved', `${present}P · ${absent}A · ${total > 0 ? Math.round((present / total) * 100) : 0}%${absentMsg}`);
  };

  const exportCSV = async () => {
    const csv = generateAttendanceCSV(students, presence, section);
    try {
      const date = new Date().toLocaleDateString('en-IN').replace(/\//g, '_');
      await Share.share({ title: `Class${section}_${date}`, message: csv });
    } catch {
      showAlert('Export failed', 'Could not share the attendance file.');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={{ color: Colors.textMuted, marginTop: 12, fontWeight: '600' }}>Loading {section} students…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title={`Class ${section}`} subtitle={`${total} students · Tap to mark absent`} />
      </SafeAreaView>

      <View style={styles.infoBanner}>
        <MaterialCommunityIcons name="information" color={Colors.info} size={16} />
        <Text style={styles.infoBannerText}>All students marked Present by default. Tap a name to mark Absent.</Text>
      </View>

      <View style={styles.summary}>
        <SummaryCell value={`${present}`} label="Present" color={Colors.success} />
        <View style={styles.sep} />
        <SummaryCell value={`${absent}`} label="Absent" color={Colors.danger} />
        <View style={styles.sep} />
        <SummaryCell value={`${total > 0 ? Math.round((present / total) * 100) : 0}%`} label="Rate" color={Colors.primary} />
      </View>

      <View style={styles.actionRow}>
        <Pressable onPress={markAllPresent} style={styles.allBtn}>
          <MaterialCommunityIcons name="check-all" color={Colors.success} size={18} />
          <Text style={styles.allBtnText}>All Present</Text>
        </Pressable>
        <Pressable onPress={exportCSV} style={styles.exportBtn}>
          <MaterialCommunityIcons name="microsoft-excel" color={Colors.info} size={18} />
          <Text style={styles.exportBtnText}>Export Excel</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" color={Colors.textMuted} size={18} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search by name, adm no or roll…"
          placeholderTextColor={Colors.textMuted} style={styles.searchInput} />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <MaterialCommunityIcons name="close-circle" color={Colors.textMuted} size={18} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const isPresent = presence[item.id] ?? true;
          return (
            <Pressable onPress={() => toggle(item.id)} style={[styles.studentRow, !isPresent && styles.absentRow]}>
              <View style={[styles.rollNo, { backgroundColor: isPresent ? Colors.successBg : Colors.dangerBg }]}>
                <Text style={[styles.rollNoText, { color: isPresent ? Colors.success : Colors.danger }]}>
                  {item.roll_no ?? index + 1}
                </Text>
              </View>
              <View style={[styles.avatar, { backgroundColor: isPresent ? Colors.successBg : Colors.dangerBg }]}>
                <Text style={[styles.avatarText, { color: isPresent ? Colors.success : Colors.danger }]}>
                  {item.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.studentMeta}>{item.admission_no} · {item.attendance_pct}% avg</Text>
              </View>
              <View style={[styles.toggle, { backgroundColor: isPresent ? Colors.success : Colors.danger }]}>
                <MaterialCommunityIcons name={isPresent ? 'check' : 'close'} color="#fff" size={16} />
                <Text style={styles.toggleText}>{isPresent ? 'P' : 'A'}</Text>
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <MaterialCommunityIcons name="account-group" color={Colors.textMuted} size={48} />
            <Text style={{ color: Colors.textMuted, fontSize: 16, marginTop: 12, fontWeight: '600' }}>
              {search ? 'No students match search' : `No students in section ${section}`}
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        {saved && (
          <View style={styles.savedBadge}>
            <MaterialCommunityIcons name="check-circle" color={Colors.success} size={16} />
            <Text style={styles.savedText}>Saved · Made by team NovaThink</Text>
          </View>
        )}
        <PrimaryButton
          label={saving ? 'Saving…' : `Save Attendance (${present}P · ${absent}A)`}
          onPress={save} size="lg" loading={saving}
        />
      </View>
    </View>
  );
}

function SummaryCell({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={styles.cell}>
      <Text style={[styles.cellValue, { color }]}>{value}</Text>
      <Text style={styles.cellLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.infoBg, marginHorizontal: Spacing.xl, marginTop: Spacing.md, borderRadius: Radius.md, padding: 10 },
  infoBannerText: { flex: 1, color: Colors.info, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  summary: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: Spacing.xl, marginTop: Spacing.md, borderRadius: Radius.lg, paddingVertical: Spacing.lg, ...Shadows.card },
  cell: { flex: 1, alignItems: 'center' },
  sep: { width: 1, backgroundColor: Colors.border },
  cellValue: { fontSize: 24, fontWeight: '900' },
  cellLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', marginTop: 4, letterSpacing: 0.6 },
  actionRow: { paddingHorizontal: Spacing.xl, marginTop: Spacing.lg, flexDirection: 'row', gap: 10 },
  allBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: Colors.successBg, borderRadius: Radius.md, flex: 1, justifyContent: 'center' },
  allBtnText: { color: Colors.success, fontSize: 14, fontWeight: '800' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: Colors.infoBg, borderRadius: Radius.md, flex: 1, justifyContent: 'center' },
  exportBtnText: { color: Colors.info, fontSize: 14, fontWeight: '800' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.xl, marginTop: Spacing.md, marginBottom: 4, backgroundColor: '#fff', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary, fontWeight: '500' },
  list: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, paddingBottom: 140 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: Radius.md, padding: 10, ...Shadows.card },
  absentRow: { backgroundColor: '#FFF4F5', borderLeftWidth: 3, borderLeftColor: Colors.danger },
  rollNo: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rollNoText: { fontSize: 11, fontWeight: '900' },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 13 },
  studentName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  studentMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, minWidth: 50, justifyContent: 'center' },
  toggleText: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: Spacing.xl, backgroundColor: 'rgba(245,247,251,0.97)', borderTopWidth: 1, borderTopColor: Colors.border, gap: Spacing.sm },
  savedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  savedText: { color: Colors.success, fontSize: 12, fontWeight: '700' },
});

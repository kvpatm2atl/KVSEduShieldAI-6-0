// Admin: Student Management — Add, Edit, Transfer, View all
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
import { getSupabaseClient } from '@/template';
import { useAuth } from '@/hooks/useAuth';

const supabase = getSupabaseClient();

const SECTIONS = ['10A', '10B', '10C', '10D', '11A', '11B', '12A', '12B'];

interface Student {
  id: string; name: string; admission_no: string;
  section: string; attendance_pct: number;
}

export default function AdminStudents() {
  const { showAlert } = useAlert();
  const { user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [admNo, setAdmNo] = useState('');
  const [section, setSection] = useState('10A');

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('students')
      .select('id, name, admission_no, section, attendance_pct')
      .order('section')
      .order('name')
      .limit(200);
    setStudents((data as Student[]) ?? []);
    setLoading(false);
  };

  const filtered = students.filter(s => {
    const matchSection = filterSection === 'All' || s.section === filterSection;
    const matchSearch = !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.admission_no.toLowerCase().includes(search.toLowerCase());
    return matchSection && matchSearch;
  });

  const openAdd = () => {
    setEditStudent(null); setName(''); setAdmNo(''); setSection('10A');
    setShowForm(true);
  };

  const openEdit = (s: Student) => {
    setEditStudent(s); setName(s.name); setAdmNo(s.admission_no); setSection(s.section);
    setShowForm(true);
  };

  const submit = async () => {
    if (!name.trim() || !admNo.trim()) { showAlert('Missing fields', 'Enter name and admission no.'); return; }
    setSaving(true);
    if (editStudent) {
      const { error } = await supabase.from('students').update({ name: name.trim(), section }).eq('id', editStudent.id);
      if (error) { showAlert('Error', error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('students').insert({ name: name.trim(), admission_no: admNo.trim(), section });
      if (error) { showAlert('Error', error.message); setSaving(false); return; }
    }
    setSaving(false);
    showAlert('Saved', `${name} · ${section}`);
    setShowForm(false);
    loadStudents();
  };

  const transferSection = (s: Student) => {
    showAlert(
      'Transfer student',
      `Move ${s.name} to which section?`,
      SECTIONS.filter(sec => sec !== s.section).slice(0, 3).map(sec => ({
        text: sec,
        onPress: async () => {
          await supabase.from('students').update({ section: sec }).eq('id', s.id);
          loadStudents();
          showAlert('Transferred', `${s.name} moved to ${sec}`);
        },
      }))
    );
  };

  const sectionCounts: Record<string, number> = {};
  students.forEach(s => { sectionCounts[s.section] = (sectionCounts[s.section] ?? 0) + 1; });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Student Management" subtitle={`${students.length} students`} />
      </SafeAreaView>

      {/* Stats */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionBar} contentContainerStyle={{ gap: 8, paddingHorizontal: Spacing.xl }}>
        {['All', ...SECTIONS].map(sec => (
          <Pressable key={sec} onPress={() => setFilterSection(sec)} style={[styles.secChip, filterSection === sec && styles.secChipActive]}>
            <Text style={[styles.secChipText, filterSection === sec && styles.secChipTextActive]}>
              {sec}{sec !== 'All' && sectionCounts[sec] ? ` (${sectionCounts[sec]})` : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" color={Colors.textMuted} size={18} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or admission no…" placeholderTextColor={Colors.textMuted} style={styles.searchInput} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 60 }}><Text style={{ color: Colors.textMuted, fontSize: 16, fontWeight: '600' }}>No students found</Text></View>}
          renderItem={({ item, index }) => (
            <Card style={styles.studentCard}>
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: Colors.surfaceTint }]}>
                  <Text style={styles.avatarText}>{index + 1}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.studentMeta}>{item.admission_no} · Att: {item.attendance_pct}%</Text>
                </View>
                <Pill label={item.section} tone="info" />
              </View>
              <View style={styles.actionBtns}>
                <Pressable onPress={() => openEdit(item)} style={styles.smallBtn}>
                  <MaterialCommunityIcons name="pencil" color={Colors.info} size={14} />
                  <Text style={[styles.smallBtnText, { color: Colors.info }]}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => transferSection(item)} style={styles.smallBtn}>
                  <MaterialCommunityIcons name="transfer" color={Colors.warning} size={14} />
                  <Text style={[styles.smallBtnText, { color: Colors.warning }]}>Transfer</Text>
                </Pressable>
              </View>
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        />
      )}

      <Pressable onPress={openAdd} style={styles.fab}>
        <MaterialCommunityIcons name="plus" color="#fff" size={28} />
      </Pressable>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editStudent ? 'Edit Student' : 'Add Student'}</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Full Name</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Student full name" placeholderTextColor={Colors.textMuted} style={styles.formInput} />

              {!editStudent && (
                <>
                  <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Admission Number</Text>
                  <TextInput value={admNo} onChangeText={setAdmNo} placeholder="e.g. 271808221006008" placeholderTextColor={Colors.textMuted} style={styles.formInput} />
                </>
              )}

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Section</Text>
              <View style={styles.chips}>
                {SECTIONS.map(s => (
                  <Pressable key={s} onPress={() => setSection(s)} style={[styles.chip, section === s && styles.chipActive]}>
                    <Text style={[styles.chipText, section === s && styles.chipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              <PrimaryButton label={editStudent ? 'Update Student' : 'Add Student'} onPress={submit} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBar: { paddingVertical: Spacing.md },
  secChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  secChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  secChipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  secChipTextActive: { color: '#fff' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: '#fff', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 100, paddingTop: Spacing.sm },
  studentCard: { paddingVertical: 10, paddingHorizontal: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800', color: Colors.primary },
  studentName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  studentMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  actionBtns: { flexDirection: 'row', gap: 8, marginTop: 8 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.sm },
  smallBtnText: { fontSize: 12, fontWeight: '700' },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  formInput: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
});

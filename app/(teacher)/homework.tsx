// Teacher Homework Module — Add, Edit, Copy previous, Due date, Subject assignment
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
import { fetchHomework, saveHomework } from '@/services/schoolData';

const ALL_SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science',
  'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics'];

export default function TeacherHomework() {
  const { showAlert } = useAlert();
  const { user } = useAuth();

  const section = user?.classTeacherOf ?? user?.section ?? '10A';
  const mySubject = user?.subject ?? ALL_SUBJECTS[0];
  const isClassTeacher = !!user?.classTeacherOf;

  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [subject, setSubject] = useState(mySubject);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => { loadHomework(); }, [section]);

  const loadHomework = async () => {
    setLoading(true);
    const data = await fetchHomework(section);
    setHomework(data);
    setLoading(false);
  };

  const openNew = () => {
    setEditItem(null);
    setSubject(mySubject); setTitle(''); setDescription(''); setDueDate('');
    setShowForm(true);
  };

  const openEdit = (hw: any) => {
    setEditItem(hw);
    setSubject(hw.subject); setTitle(hw.title);
    setDescription(hw.description ?? ''); setDueDate(hw.due_date ?? '');
    setShowForm(true);
  };

  const copyPrevious = () => {
    if (homework.length === 0) { showAlert('No previous homework', 'Add your first homework manually.'); return; }
    const prev = homework[0];
    setEditItem(null);
    setSubject(prev.subject); setTitle(prev.title);
    setDescription(prev.description ?? ''); setDueDate('');
    setShowForm(true);
    showAlert('Copied', 'Edit as needed and save.');
  };

  const submit = async () => {
    if (!title.trim() || !dueDate.trim()) {
      showAlert('Missing fields', 'Enter title and due date (YYYY-MM-DD).');
      return;
    }
    setSaving(true);
    const { error } = await saveHomework({
      subject, title: title.trim(), description: description.trim(),
      section, due_date: dueDate.trim(), assigned_by: user?.id,
    });
    setSaving(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Homework saved', `${subject} · Due ${dueDate}`);
    setShowForm(false);
    loadHomework();
  };

  const subjectColor = (sub: string) => {
    const map: Record<string, string> = {
      'Mathematics': '#2A6FDB', 'Science': '#1FA971', 'English': '#E0414C',
      'Hindi': '#E8A317', 'Social Science': '#6E55C2', 'Physics': '#0891b2',
      'Chemistry': '#d97706', 'Biology': '#059669', 'Computer Science': '#7c3aed',
    };
    return map[sub] ?? Colors.primary;
  };

  const dueSoon = (d: string) => {
    if (!d) return false;
    const due = new Date(d);
    const today = new Date();
    const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 2 && diff >= 0;
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Homework" subtitle={`Section ${section} · ${isClassTeacher ? 'All subjects' : mySubject}`} />
      </SafeAreaView>

      <View style={styles.actionRow}>
        <Pressable onPress={openNew} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus-circle" color={Colors.primary} size={20} />
          <Text style={styles.addBtnText}>Add Homework</Text>
        </Pressable>
        <Pressable onPress={copyPrevious} style={styles.copyBtn}>
          <MaterialCommunityIcons name="content-copy" color={Colors.info} size={18} />
          <Text style={styles.copyBtnText}>Copy Previous</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={homework}
          keyExtractor={(hw) => hw.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="clipboard-text" color={Colors.textMuted} size={48} />
              <Text style={styles.emptyText}>No homework assigned yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.hwCard}>
              <View style={styles.hwRow}>
                <View style={[styles.subBadge, { backgroundColor: subjectColor(item.subject) + '18' }]}>
                  <Text style={[styles.subBadgeText, { color: subjectColor(item.subject) }]}>
                    {item.subject.slice(0, 3).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.hwTitle}>{item.title}</Text>
                  <Text style={styles.hwSub}>{item.subject} · Section {item.section}</Text>
                  {item.description ? (
                    <Text style={styles.hwDesc} numberOfLines={2}>{item.description}</Text>
                  ) : null}
                  <View style={styles.hwMeta}>
                    <MaterialCommunityIcons name="calendar-clock" size={13} color={Colors.textMuted} />
                    <Text style={[styles.hwMetaText, dueSoon(item.due_date) && { color: Colors.danger, fontWeight: '700' }]}>
                      Due {item.due_date}
                    </Text>
                    {dueSoon(item.due_date) && <Pill label="Due soon!" tone="danger" />}
                  </View>
                  {typeof item.completion_rate === 'number' && (
                    <View style={styles.progressRow}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${item.completion_rate}%`, backgroundColor: item.completion_rate >= 70 ? Colors.success : Colors.warning }]} />
                      </View>
                      <Text style={styles.progressText}>{item.completion_rate}% done</Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable onPress={() => openEdit(item)} style={styles.editBtn}>
                <MaterialCommunityIcons name="pencil" color={Colors.primary} size={16} />
                <Text style={styles.editBtnText}>Edit</Text>
              </Pressable>
            </Card>
          )}
        />
      )}

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editItem ? 'Edit Homework' : 'Add Homework'}</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(isClassTeacher ? ALL_SUBJECTS : [mySubject]).map(s => (
                    <Pressable key={s} onPress={() => setSubject(s)} style={[styles.chip, subject === s && styles.chipActive]}>
                      <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Title</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Triangles worksheet" placeholderTextColor={Colors.textMuted} style={styles.formInput} />

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Description (optional)</Text>
              <TextInput
                value={description} onChangeText={setDescription}
                placeholder="Detailed instructions..." placeholderTextColor={Colors.textMuted}
                style={[styles.formInput, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                multiline
              />

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Due Date (YYYY-MM-DD)</Text>
              <TextInput value={dueDate} onChangeText={setDueDate} placeholder="2025-07-05" placeholderTextColor={Colors.textMuted} style={styles.formInput} />

              <PrimaryButton label={editItem ? 'Update Homework' : 'Save Homework'} onPress={submit} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', gap: 10, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: Colors.surfaceTint, borderRadius: Radius.md },
  addBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  copyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: Colors.infoBg, borderRadius: Radius.md },
  copyBtnText: { color: Colors.info, fontSize: 14, fontWeight: '800' },
  list: { padding: Spacing.xl, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  hwCard: { marginBottom: Spacing.md },
  hwRow: { flexDirection: 'row' },
  subBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  hwTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  hwSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  hwDesc: { fontSize: 13, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },
  hwMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  hwMetaText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressTrack: { flex: 1, height: 5, backgroundColor: Colors.surfaceMuted, borderRadius: 3 },
  progressFill: { height: 5, borderRadius: 3 },
  progressText: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: Colors.surfaceTint, borderRadius: Radius.sm },
  editBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  formInput: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
});

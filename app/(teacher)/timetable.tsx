// Teacher: Timetable — View + Edit for class teachers
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
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { fetchTimetable, saveTimetableSlot } from '@/services/schoolData';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SUBJECTS = ['English', 'Mathematics', 'Science', 'Social Science', 'Hindi', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'Economics', 'Work Education', 'Art Education', 'Physical Education', 'Library'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const todayName = (): string => {
  const d = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return d[new Date().getDay()] ?? 'Monday';
};

const subjectColor = (sub: string): string => {
  const map: Record<string, string> = {
    'Mathematics': '#2A6FDB', 'Science': '#1FA971', 'English': '#E0414C',
    'Hindi': '#E8A317', 'Social Science': '#6E55C2', 'Physics': '#0891b2',
    'Chemistry': '#d97706', 'Biology': '#059669', 'Computer Science': '#7c3aed',
    'Economics': '#db2777', 'Work Education': '#78350f', 'Art Education': '#92400e',
    'Physical Education': '#0284c7', 'Library': '#65a30d',
  };
  return map[sub] ?? Colors.primary;
};

export default function TeacherTimetable() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const section = user?.classTeacherOf ?? user?.section ?? '10A';
  const isClassTeacher = !!(user?.classTeacherOf);

  const [selectedDay, setSelectedDay] = useState(todayName() === 'Sunday' ? 'Monday' : todayName());
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editSlot, setEditSlot] = useState<any>(null);

  // Edit form
  const [editPeriod, setEditPeriod] = useState(1);
  const [editSubject, setEditSubject] = useState('English');
  const [editStart, setEditStart] = useState('8:00');
  const [editEnd, setEditEnd] = useState('8:45');
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTimetable(); }, [selectedDay, section]);

  const loadTimetable = async () => {
    setLoading(true);
    const data = await fetchTimetable(section, selectedDay);
    setTimetable(data);
    setLoading(false);
  };

  const openEdit = (slot?: any) => {
    if (slot) {
      setEditSlot(slot);
      setEditPeriod(slot.period);
      setEditSubject(slot.subject);
      setEditStart(slot.start_time);
      setEditEnd(slot.end_time);
    } else {
      setEditSlot(null);
      setEditPeriod(timetable.length + 1);
      setEditSubject('English');
      setEditStart('8:00');
      setEditEnd('8:45');
    }
    setShowEdit(true);
  };

  const saveSlot = async () => {
    if (!editSubject) { showAlert('Missing', 'Select a subject.'); return; }
    setSaving(true);
    const { error } = await saveTimetableSlot({
      section,
      day_of_week: selectedDay,
      period: editPeriod,
      subject: editSubject,
      start_time: editStart,
      end_time: editEnd,
    });
    setSaving(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Saved', `Period ${editPeriod} (${editSubject}) updated.`);
    setShowEdit(false);
    loadTimetable();
  };

  const today = todayName();
  const isToday = selectedDay === today || (today === 'Sunday' && selectedDay === 'Monday');

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader
          title="Timetable"
          subtitle={`Class ${section} · ${selectedDay}`}
          rightAction={
            isClassTeacher ? (
              <Pressable onPress={() => openEdit()} style={styles.addBtn}>
                <MaterialCommunityIcons name="plus" color="#fff" size={20} />
              </Pressable>
            ) : undefined
          }
        />
      </SafeAreaView>

      {/* Day selector */}
      <View style={styles.dayBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayBarContent}>
          {DAYS.map(day => (
            <Pressable key={day} onPress={() => setSelectedDay(day)}
              style={[styles.dayChip, selectedDay === day && styles.dayChipActive, day === today && styles.todayChip]}>
              <Text style={[styles.dayChipText, selectedDay === day && styles.dayChipTextActive]}>
                {day.slice(0, 3)}{day === today ? ' ·' : ''}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={timetable}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            isToday ? (
              <View style={styles.todayBanner}>
                <MaterialCommunityIcons name="calendar-today" color={Colors.primary} size={16} />
                <Text style={styles.todayBannerText}>Today · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="calendar-blank" color={Colors.textMuted} size={48} />
              <Text style={styles.emptyText}>No timetable for {selectedDay}</Text>
              {isClassTeacher && <Text style={styles.emptySubText}>Tap + to add periods</Text>}
            </View>
          }
          renderItem={({ item }) => {
            const color = subjectColor(item.subject);
            return (
              <Pressable onPress={() => isClassTeacher ? openEdit(item) : null}>
                <Card style={[styles.periodCard, { borderLeftWidth: 4, borderLeftColor: color }]}>
                  <View style={styles.row}>
                    <View style={[styles.periodBadge, { backgroundColor: color + '18' }]}>
                      <Text style={[styles.periodNum, { color }]}>P{item.period}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.subjectName}>{item.subject}</Text>
                      <Text style={styles.timeText}>{item.start_time} – {item.end_time}</Text>
                    </View>
                    {isClassTeacher && (
                      <MaterialCommunityIcons name="pencil" color={Colors.textMuted} size={16} />
                    )}
                  </View>
                </Card>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* Edit Period Modal */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editSlot ? 'Edit Period' : 'Add Period'}</Text>
              <Pressable onPress={() => setShowEdit(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Period Number</Text>
              <View style={styles.chips}>
                {PERIODS.map(p => (
                  <Pressable key={p} onPress={() => setEditPeriod(p)}
                    style={[styles.chip, editPeriod === p && styles.chipActive]}>
                    <Text style={[styles.chipText, editPeriod === p && styles.chipTextActive]}>P{p}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Subject</Text>
              <View style={styles.chips}>
                {SUBJECTS.map(s => (
                  <Pressable key={s} onPress={() => setEditSubject(s)}
                    style={[styles.chip, editSubject === s && styles.chipActive]}>
                    <Text style={[styles.chipText, editSubject === s && styles.chipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: Spacing.lg }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>Start Time</Text>
                  <TextInput value={editStart} onChangeText={setEditStart} placeholder="8:00" placeholderTextColor={Colors.textMuted} style={styles.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formLabel}>End Time</Text>
                  <TextInput value={editEnd} onChangeText={setEditEnd} placeholder="8:45" placeholderTextColor={Colors.textMuted} style={styles.input} />
                </View>
              </View>

              <PrimaryButton label={saving ? 'Saving…' : 'Save Period'} onPress={saveSlot} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  dayBar: { paddingVertical: Spacing.sm },
  dayBarContent: { gap: 8, paddingHorizontal: Spacing.xl },
  dayChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  dayChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  todayChip: { borderColor: Colors.primary },
  dayChipText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  dayChipTextActive: { color: '#fff' },
  list: { padding: Spacing.xl, paddingBottom: 40 },
  todayBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceTint, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  todayBannerText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  emptySubText: { fontSize: 13, color: Colors.textMuted },
  periodCard: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  periodBadge: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  periodNum: { fontSize: 16, fontWeight: '900' },
  subjectName: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  timeText: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  input: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
});

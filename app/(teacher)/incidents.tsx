// Teacher: Incidents — report and view section incidents
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
import { fetchIncidents, saveIncident, fetchStudents } from '@/services/schoolData';

const TYPES = ['Illness', 'Injury', 'Bullying', 'Behaviour', 'Emergency'];
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];

export default function TeacherIncidents() {
  const { showAlert } = useAlert();
  const { user } = useAuth();

  const section = user?.classTeacherOf ?? user?.section ?? '10A';

  const [incidents, setIncidents] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState('');
  const [type, setType] = useState(TYPES[0]);
  const [severity, setSeverity] = useState('Low');
  const [notes, setNotes] = useState('');

  useEffect(() => { loadData(); }, [section]);

  const loadData = async () => {
    setLoading(true);
    const [inc, stds] = await Promise.all([
      fetchIncidents(section),
      fetchStudents(section),
    ]);
    setIncidents(inc);
    setStudents(stds);
    setLoading(false);
  };

  const submit = async () => {
    const studentObj = students.find(s => s.id === selectedStudent);
    if (!studentObj) { showAlert('Select student', 'Please select a student.'); return; }
    setSaving(true);
    const { error } = await saveIncident({
      student_name: studentObj.name,
      student_id: studentObj.id,
      type, notes: notes.trim(), section, severity,
      reported_by: user?.id,
    });
    setSaving(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Incident reported', `${type} for ${studentObj.name} recorded.`);
    setShowForm(false);
    setSelectedStudent(''); setType(TYPES[0]); setSeverity('Low'); setNotes('');
    loadData();
  };

  const unresolved = incidents.filter(i => !i.resolved).length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Incidents" subtitle={`Class ${section} · ${unresolved} unresolved`} />
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="shield-check" color={Colors.success} size={48} />
              <Text style={styles.emptyText}>No incidents reported</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={[styles.incCard, item.resolved && { opacity: 0.7 }]}>
              <View style={styles.row}>
                <View style={[styles.incIcon, { backgroundColor: item.severity === 'Critical' || item.severity === 'High' ? Colors.dangerBg : Colors.warningBg }]}>
                  <MaterialCommunityIcons
                    name={item.type === 'Illness' ? 'medical-bag' : item.type === 'Emergency' ? 'ambulance' : 'alert-octagon'}
                    color={item.severity === 'Critical' || item.severity === 'High' ? Colors.danger : Colors.warning}
                    size={22}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.incName}>{item.student_name}</Text>
                  <Text style={styles.incNotes} numberOfLines={2}>{item.notes}</Text>
                  <Text style={styles.incTime}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <View style={{ gap: 4, alignItems: 'flex-end' }}>
                  <Pill label={item.type} tone={item.severity === 'Critical' || item.severity === 'High' ? 'danger' : 'warning'} />
                  {item.resolved && <Pill label="Resolved" tone="success" />}
                </View>
              </View>
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      <Pressable onPress={() => setShowForm(true)} style={styles.fab}>
        <MaterialCommunityIcons name="plus" color="#fff" size={28} />
      </Pressable>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report Incident</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Student</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {students.map(s => (
                    <Pressable key={s.id} onPress={() => setSelectedStudent(s.id)} style={[styles.chip, selectedStudent === s.id && styles.chipActive]}>
                      <Text style={[styles.chipText, selectedStudent === s.id && styles.chipTextActive]} numberOfLines={1}>{s.name.split(' ')[0]}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Type</Text>
              <View style={styles.chips}>
                {TYPES.map(t => (
                  <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipActive, t === 'Emergency' && styles.emergencyChip, t === 'Emergency' && type === t && styles.emergencyChipActive]}>
                    <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Severity</Text>
              <View style={styles.chips}>
                {SEVERITIES.map(s => (
                  <Pressable key={s} onPress={() => setSeverity(s)} style={[styles.chip, severity === s && styles.chipActive]}>
                    <Text style={[styles.chipText, severity === s && styles.chipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Notes</Text>
              <TextInput
                value={notes} onChangeText={setNotes}
                placeholder="Describe what happened..." placeholderTextColor={Colors.textMuted}
                style={[styles.formInput, { height: 100, textAlignVertical: 'top', paddingTop: 12 }]}
                multiline
              />

              <PrimaryButton label={saving ? 'Reporting…' : 'Report Incident'} onPress={submit} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.xl, paddingBottom: 100 },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.success },
  incCard: {},
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  incIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  incName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  incNotes: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  incTime: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  formInput: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  emergencyChip: { borderColor: Colors.danger },
  emergencyChipActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
});

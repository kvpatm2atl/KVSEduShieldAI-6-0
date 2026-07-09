// Conductor: Report bus incidents
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { fetchIncidents, saveIncident } from '@/services/schoolData';

const TYPES = ['Illness', 'Injury', 'Bullying', 'Behaviour', 'Emergency'] as const;
const SEVER = ['Low', 'Medium', 'High', 'Critical'] as const;

export default function ConductorIncidents() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [type, setType] = useState<typeof TYPES[number]>('Emergency');
  const [severity, setSeverity] = useState<typeof SEVER[number]>('High');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await fetchIncidents();
    // Show only bus-related
    setIncidents(data.filter(i => i.type === 'Emergency' || i.type === 'Injury' || i.type === 'Illness'));
    setLoading(false);
  };

  const submit = async () => {
    if (!studentName.trim()) { showAlert('Missing field', 'Enter student name.'); return; }
    setSaving(true);
    const { error } = await saveIncident({
      student_name: studentName.trim(), type, notes, section: 'BUS',
      severity, reported_by: user?.id,
    });
    setSaving(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Reported', 'Incident has been logged and admin notified.');
    setShowForm(false);
    setStudentName(''); setNotes('');
    load();
  };

  const severityColor = (s: string) => {
    if (s === 'Critical') return 'danger';
    if (s === 'High') return 'warning';
    if (s === 'Medium') return 'info';
    return 'neutral';
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Bus Incidents" subtitle="Report safety incidents on bus" />
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#F59E0B" />
        </View>
      ) : (
        <FlatList
          data={incidents}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <MaterialCommunityIcons name="shield-check" color={Colors.success} size={56} />
              <Text style={styles.emptyText}>No bus incidents reported</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.row}>
                <View style={styles.typeIcon}>
                  <MaterialCommunityIcons name="alert-octagon" color={Colors.danger} size={22} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.incName}>{item.student_name}</Text>
                  <Text style={styles.incMeta}>{item.type} · {new Date(item.created_at).toLocaleDateString('en-IN')}</Text>
                  {item.notes ? <Text style={styles.incNotes} numberOfLines={2}>{item.notes}</Text> : null}
                </View>
                <Pill label={item.severity} tone={severityColor(item.severity) as any} />
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
              <Text style={styles.formLabel}>Student Name</Text>
              <TextInput value={studentName} onChangeText={setStudentName} placeholder="Full name" placeholderTextColor={Colors.textMuted} style={styles.input} />

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Incident Type</Text>
              <View style={styles.chips}>
                {TYPES.map(t => (
                  <Pressable key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipActive]}>
                    <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Severity</Text>
              <View style={styles.chips}>
                {SEVER.map(s => (
                  <Pressable key={s} onPress={() => setSeverity(s)} style={[styles.chip, severity === s && styles.chipActive]}>
                    <Text style={[styles.chipText, severity === s && styles.chipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Notes</Text>
              <TextInput value={notes} onChangeText={setNotes} placeholder="Describe the incident…" placeholderTextColor={Colors.textMuted} multiline numberOfLines={4} style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]} />

              <PrimaryButton label={saving ? 'Saving…' : 'Submit Report'} onPress={submit} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.xl, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  typeIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  incName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  incMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  incNotes: { fontSize: 12, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textMuted, marginTop: 12 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
});

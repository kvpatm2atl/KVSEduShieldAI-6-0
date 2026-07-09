// Security Guard — can post early pickup when parent arrives at gate
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { fetchPickupRequests, createPickupRequest, updatePickupStatus } from '@/services/schoolData';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export default function SecurityPickup() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state for guard-initiated pickup
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [pickupTime, setPickupTime] = useState(
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
  const [reason, setReason] = useState('Parent at gate');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await fetchPickupRequests();
    setRequests(data);
    setLoading(false);
  };

  const searchStudents = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from('students')
      .select('id, name, section, admission_no, parent_user_id')
      .or(`name.ilike.%${q}%,admission_no.ilike.%${q}%`)
      .limit(8);
    setSearchResults(data ?? []);
  };

  const submitGatePickup = async () => {
    if (!selectedStudent) { showAlert('Select student', 'Search and select a student first.'); return; }
    if (!authorizedPerson.trim()) { showAlert('Missing field', 'Enter the name of the authorized person.'); return; }
    setSaving(true);
    const { error } = await createPickupRequest({
      student_id: selectedStudent.id,
      parent_user_id: selectedStudent.parent_user_id ?? null,
      pickup_time: pickupTime,
      reason: reason || 'Parent at main gate',
      authorized_person: authorizedPerson.trim(),
      status: 'Approved', // Guard approves on spot
    });
    setSaving(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Pickup Logged', `${selectedStudent.name} pickup registered. Inform class teacher.`);
    setShowForm(false);
    setSelectedStudent(null);
    setSearch('');
    setAuthorizedPerson('');
    setSearchResults([]);
    load();
  };

  const releaseStudent = async (id: string, studentName: string) => {
    await updatePickupStatus(id, 'Completed');
    setRequests(prev => prev.map(p => p.id === id ? { ...p, status: 'Completed' } : p));
    showAlert('Released', `${studentName} has been released to authorized person.`);
  };

  const statusColor = (s: string) => {
    if (s === 'Completed') return 'success';
    if (s === 'Approved') return 'info';
    if (s === 'Denied') return 'danger';
    return 'warning';
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Early Pickup" subtitle="Manage student pickup requests" />
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#EF4444" />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <MaterialCommunityIcons name="car-arrow-right" color={Colors.textMuted} size={56} />
              <Text style={styles.emptyText}>No pickup requests</Text>
              <Text style={styles.emptySubText}>Tap + to log a gate pickup</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <View style={styles.icon}>
                  <MaterialCommunityIcons name="account-arrow-right" color={Colors.warning} size={22} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.studentName}>{item.students?.name ?? 'Unknown'}</Text>
                  <Text style={styles.meta}>{item.students?.section} · {item.pickup_time}</Text>
                  <Text style={styles.meta}>Person: {item.authorized_person ?? 'Not specified'}</Text>
                  <Text style={styles.reason}>{item.reason}</Text>
                  <Text style={styles.time}>{new Date(item.created_at).toLocaleString('en-IN')}</Text>
                </View>
                <Pill label={item.status} tone={statusColor(item.status) as any} />
              </View>
              {item.status === 'Approved' && (
                <Pressable onPress={() => releaseStudent(item.id, item.students?.name ?? 'Student')} style={styles.releaseBtn}>
                  <MaterialCommunityIcons name="gate-open" color="#fff" size={18} />
                  <Text style={styles.releaseBtnText}>Mark as Released</Text>
                </Pressable>
              )}
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* FAB — Guard logs pickup when parent arrives */}
      <Pressable onPress={() => setShowForm(true)} style={styles.fab}>
        <MaterialCommunityIcons name="plus" color="#fff" size={28} />
      </Pressable>

      {/* Gate Pickup Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Gate Pickup</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <View style={styles.infoBox}>
                <MaterialCommunityIcons name="information" color={Colors.info} size={14} />
                <Text style={styles.infoText}>Use when a parent / authorized person arrives at gate for pickup without prior request</Text>
              </View>

              <Text style={styles.label}>Search Student</Text>
              <TextInput
                value={search}
                onChangeText={searchStudents}
                placeholder="Type name or admission no…"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />

              {searchResults.length > 0 && (
                <View style={styles.results}>
                  {searchResults.map(s => (
                    <Pressable key={s.id} onPress={() => { setSelectedStudent(s); setSearchResults([]); setSearch(s.name); }} style={styles.resultRow}>
                      <MaterialCommunityIcons name="account" color={Colors.primary} size={16} />
                      <Text style={styles.resultName}>{s.name}</Text>
                      <Text style={styles.resultSec}>{s.section}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {selectedStudent && (
                <View style={styles.selectedBox}>
                  <MaterialCommunityIcons name="check-circle" color={Colors.success} size={18} />
                  <Text style={styles.selectedText}>{selectedStudent.name} · {selectedStudent.section}</Text>
                </View>
              )}

              <Text style={[styles.label, { marginTop: Spacing.lg }]}>Pickup Time</Text>
              <TextInput
                value={pickupTime}
                onChangeText={setPickupTime}
                placeholder="e.g. 11:30 AM"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />

              <Text style={[styles.label, { marginTop: Spacing.lg }]}>Authorized Person</Text>
              <TextInput
                value={authorizedPerson}
                onChangeText={setAuthorizedPerson}
                placeholder="Full name of person picking up"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />

              <Text style={[styles.label, { marginTop: Spacing.lg }]}>Reason</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Reason for early pickup"
                placeholderTextColor={Colors.textMuted}
                style={styles.input}
              />

              <PrimaryButton
                label={saving ? 'Saving…' : 'Log Gate Pickup & Approve'}
                onPress={submitGatePickup}
                loading={saving}
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

const styles = StyleSheet.create({
  list: { padding: Spacing.xl, paddingBottom: 100 },
  card: {},
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.warningBg, alignItems: 'center', justifyContent: 'center' },
  studentName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  meta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  reason: { fontSize: 12, color: Colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  time: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  releaseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.success, borderRadius: Radius.md, paddingVertical: 10, marginTop: Spacing.md },
  releaseBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textMuted, marginTop: 12 },
  emptySubText: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  infoText: { flex: 1, color: Colors.info, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  results: { backgroundColor: '#fff', borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginTop: 4, overflow: 'hidden' },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  resultName: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  resultSec: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  selectedBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.successBg, borderRadius: Radius.md, padding: 12, marginTop: 8 },
  selectedText: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.success },
});

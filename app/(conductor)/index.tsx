// Conductor: Bus Boarding & Dropping Management
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/template';
import { fetchStudents, logBusEvent, fetchBusEvents } from '@/services/schoolData';

const supabase = getSupabaseClient();

interface Student {
  id: string; name: string; admission_no: string; section: string;
  boarded?: boolean; dropped?: boolean;
}

export default function ConductorIndex() {
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [boardedIds, setBoardedIds] = useState<Set<string>>(new Set());
  const [droppedIds, setDroppedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tripMode, setTripMode] = useState<'morning' | 'afternoon'>('morning');
  const [showIncident, setShowIncident] = useState(false);
  const [incidentStudent, setIncidentStudent] = useState<Student | null>(null);

  useEffect(() => { loadBuses(); }, []);

  const loadBuses = async () => {
    const { data } = await supabase.from('buses').select('*').order('number');
    setBuses(data ?? []);
    setLoading(false);
  };

  const selectBus = async (bus: any) => {
    setSelectedBus(bus);
    setLoading(true);
    const stds10C = await fetchStudents('10C');
    const stds11A = await fetchStudents('11A');
    const allStudents: Student[] = [...stds10C, ...stds11A];

    // Load today's boarding events
    const today = new Date().toISOString().split('T')[0];
    const events = await fetchBusEvents(bus.id);
    const todayEvents = events.filter(e => e.timestamp?.startsWith(today));
    const boarded = new Set(todayEvents.filter(e => e.event_type === 'boarded').map((e: any) => e.student_id));
    const dropped = new Set(todayEvents.filter(e => e.event_type === 'dropped').map((e: any) => e.student_id));
    setBoardedIds(boarded as Set<string>);
    setDroppedIds(dropped as Set<string>);
    setStudents(allStudents);
    setLoading(false);
  };

  const markBoarded = async (student: Student) => {
    if (!selectedBus) return;
    await logBusEvent({ bus_id: selectedBus.id, student_id: student.id, event_type: 'boarded', created_by: user?.id });
    setBoardedIds(prev => new Set([...prev, student.id]));
    // Update bus occupancy
    await supabase.from('buses').update({ occupancy: (selectedBus.occupancy ?? 0) + 1 }).eq('id', selectedBus.id);
    showAlert('Boarded', `${student.name} boarded ${selectedBus.number}`);
  };

  const markDropped = async (student: Student) => {
    if (!selectedBus) return;
    await logBusEvent({ bus_id: selectedBus.id, student_id: student.id, event_type: 'dropped', created_by: user?.id });
    setDroppedIds(prev => new Set([...prev, student.id]));
    showAlert('Dropped Safely', `${student.name} dropped safely`);
  };

  const reportMissedDrop = async (student: Student, notes: string) => {
    if (!selectedBus) return;
    await supabase.from('bus_events').insert({
      bus_id: selectedBus.id, student_id: student.id,
      event_type: 'dropped', created_by: user?.id,
      notes, incident_type: 'wrong_location',
    });
    setDroppedIds(prev => new Set([...prev, student.id]));
    // Create incident
    await supabase.from('incidents').insert({
      student_id: student.id, student_name: student.name,
      type: 'Emergency', notes: `Bus drop incident: ${notes}`,
      section: student.section, severity: 'High',
      reported_by: user?.id,
    });
    showAlert('Incident Reported', 'Admin has been notified.');
    setShowIncident(false);
  };

  const filtered = students.filter(s =>
    !search.trim() ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_no.toLowerCase().includes(search.toLowerCase())
  );

  const boardedCount = boardedIds.size;
  const droppedCount = droppedIds.size;

  if (!selectedBus) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <SafeAreaView edges={['top']}>
          <ScreenHeader title="Select Your Bus" subtitle="Tap to start managing boarding" />
        </SafeAreaView>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#F59E0B" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.md }}>
            {buses.map(bus => (
              <Pressable key={bus.id} onPress={() => selectBus(bus)}
                style={({ pressed }) => [styles.busCard, pressed && { opacity: 0.85 }]}>
                <View style={styles.busIconWrap}>
                  <MaterialCommunityIcons name="bus" color="#fff" size={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.busTitle}>{bus.number}</Text>
                  <Text style={styles.busSub}>{bus.route} · Driver: {bus.driver}</Text>
                  <Text style={styles.busCondutor}>Conductor: {bus.conductor_name || 'Not assigned'}</Text>
                </View>
                <View style={styles.busOcc}>
                  <Text style={styles.busOccNum}>{bus.occupancy}/{bus.capacity}</Text>
                  <Text style={styles.busOccLabel}>Onboard</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader
          title={selectedBus.number}
          subtitle={selectedBus.route}
          rightAction={
            <Pressable onPress={() => setSelectedBus(null)} style={styles.changeBusBtn}>
              <Text style={styles.changeBusText}>Change Bus</Text>
            </Pressable>
          }
        />
      </SafeAreaView>

      {/* Trip mode toggle */}
      <View style={styles.tripToggle}>
        <Pressable onPress={() => setTripMode('morning')}
          style={[styles.tripBtn, tripMode === 'morning' && styles.tripBtnActive]}>
          <MaterialCommunityIcons name="weather-sunny" color={tripMode === 'morning' ? '#fff' : Colors.textMuted} size={16} />
          <Text style={[styles.tripBtnText, tripMode === 'morning' && { color: '#fff' }]}>Morning Trip</Text>
        </Pressable>
        <Pressable onPress={() => setTripMode('afternoon')}
          style={[styles.tripBtn, tripMode === 'afternoon' && styles.tripBtnActive]}>
          <MaterialCommunityIcons name="weather-sunset" color={tripMode === 'afternoon' ? '#fff' : Colors.textMuted} size={16} />
          <Text style={[styles.tripBtnText, tripMode === 'afternoon' && { color: '#fff' }]}>Afternoon Return</Text>
        </Pressable>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="Boarded" value={`${boardedCount}`} color={Colors.success} />
        <StatBox label="Dropped" value={`${droppedCount}`} color={Colors.info} />
        <StatBox label="Total" value={`${students.length}`} color={Colors.primary} />
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" color={Colors.textMuted} size={18} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search student…"
          placeholderTextColor={Colors.textMuted} style={styles.searchInput} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#F59E0B" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => s.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const boarded = boardedIds.has(item.id);
            const dropped = droppedIds.has(item.id);
            return (
              <View style={[styles.studentRow, dropped && styles.droppedRow, boarded && !dropped && styles.boardedRow]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.studentMeta}>{item.section} · {item.admission_no}</Text>
                </View>
                {dropped ? (
                  <Pill label="Dropped" tone="success" />
                ) : boarded ? (
                  <View style={styles.actionBtns}>
                    <Pressable onPress={() => markDropped(item)} style={styles.dropBtn}>
                      <MaterialCommunityIcons name="map-marker-check" color="#fff" size={14} />
                      <Text style={styles.dropBtnText}>Dropped Safely</Text>
                    </Pressable>
                    <Pressable onPress={() => { setIncidentStudent(item); setShowIncident(true); }} style={styles.incidentBtn}>
                      <MaterialCommunityIcons name="alert" color={Colors.danger} size={14} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => markBoarded(item)} style={styles.boardBtn}>
                    <MaterialCommunityIcons name="account-arrow-right" color="#fff" size={14} />
                    <Text style={styles.boardBtnText}>Boarded</Text>
                  </Pressable>
                )}
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        />
      )}

      {/* Incident modal */}
      <Modal visible={showIncident} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowIncident(false)}>
        <IncidentModal
          student={incidentStudent}
          onClose={() => setShowIncident(false)}
          onReport={reportMissedDrop}
        />
      </Modal>
    </View>
  );
}

function IncidentModal({ student, onClose, onReport }: {
  student: Student | null;
  onClose: () => void;
  onReport: (student: Student, notes: string) => void;
}) {
  const [notes, setNotes] = useState('');
  const [incType, setIncType] = useState('wrong_location');

  const incTypes = [
    { id: 'wrong_location', label: 'Dropped at wrong location', icon: 'map-marker-alert' },
    { id: 'parent_request', label: "Parent's special request", icon: 'account-arrow-right' },
    { id: 'child_request', label: "Child's own request", icon: 'account-alert' },
    { id: 'emergency', label: 'Emergency stop', icon: 'alert-octagon' },
  ];

  if (!student) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
      <View style={incStyles.header}>
        <Text style={incStyles.title}>Report Drop Incident</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={incStyles.content}>
        <View style={incStyles.studentBox}>
          <MaterialCommunityIcons name="account" color={Colors.primary} size={20} />
          <Text style={incStyles.studentName}>{student.name}</Text>
          <Text style={incStyles.studentSec}>{student.section}</Text>
        </View>

        <Text style={incStyles.sectionLabel}>Incident Type</Text>
        {incTypes.map(t => (
          <Pressable key={t.id} onPress={() => setIncType(t.id)}
            style={[incStyles.typeRow, incType === t.id && incStyles.typeRowActive]}>
            <MaterialCommunityIcons name={t.icon as any} color={incType === t.id ? Colors.primary : Colors.textMuted} size={20} />
            <Text style={[incStyles.typeLabel, incType === t.id && { color: Colors.primary, fontWeight: '700' }]}>{t.label}</Text>
            {incType === t.id && <MaterialCommunityIcons name="check-circle" color={Colors.primary} size={18} />}
          </Pressable>
        ))}

        <Text style={[incStyles.sectionLabel, { marginTop: Spacing.lg }]}>Notes / Details</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Describe the situation (location, reason, etc.)"
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
          style={incStyles.notesInput}
        />

        <PrimaryButton
          label="Submit Incident Report"
          onPress={() => onReport(student, `${incTypes.find(t => t.id === incType)?.label}: ${notes}`)}
          style={{ marginTop: Spacing.xl }}
          size="lg"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statBox, Shadows.card]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  busCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 12, ...Shadows.card },
  busIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
  busTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  busSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  busCondutor: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  busOcc: { alignItems: 'center' },
  busOccNum: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  busOccLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700' },
  changeBusBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.pill },
  changeBusText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  tripToggle: { flexDirection: 'row', margin: Spacing.xl, gap: 8 },
  tripBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  tripBtnActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
  tripBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.md },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', marginTop: 2, letterSpacing: 0.4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: '#fff', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  studentRow: { backgroundColor: '#fff', borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, ...Shadows.card },
  boardedRow: { borderLeftWidth: 3, borderLeftColor: Colors.info },
  droppedRow: { borderLeftWidth: 3, borderLeftColor: Colors.success, opacity: 0.7 },
  studentName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  studentMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  actionBtns: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  boardBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: Colors.info, borderRadius: Radius.sm },
  boardBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  dropBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: Colors.success, borderRadius: Radius.sm },
  dropBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  incidentBtn: { padding: 8, backgroundColor: Colors.dangerBg, borderRadius: Radius.sm },
});

const incStyles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  content: { padding: Spacing.xl },
  studentBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceTint, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.xl },
  studentName: { flex: 1, fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  studentSec: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: Spacing.sm },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.lg, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, marginBottom: 8, borderWidth: 1.5, borderColor: Colors.border },
  typeRowActive: { backgroundColor: Colors.surfaceTint, borderColor: Colors.primary },
  typeLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  notesInput: { backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, padding: 14, fontSize: 15, color: Colors.textPrimary, minHeight: 100, borderWidth: 1, borderColor: Colors.border, textAlignVertical: 'top' },
});

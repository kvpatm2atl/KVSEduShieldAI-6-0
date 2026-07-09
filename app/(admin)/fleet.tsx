// Admin: Fleet — bus status + simulated boarding/dropping without hardware
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { getSupabaseClient } from '@/template';
import { buses as mockBuses } from '@/services/mockData';
import { useAlert } from '@/template';
import { fetchBusEvents, logBusEvent, fetchStudents } from '@/services/schoolData';

const supabase = getSupabaseClient();

type BusStatus = 'On Route' | 'At School' | 'Idle' | 'Returning';

interface BusRow {
  id: string; number: string; driver: string; route: string;
  status: BusStatus; eta: string; speed: number; occupancy: number;
  capacity: number; latitude: number | null; longitude: number | null; updated_at: string;
}

const TRIP_ACTIVE: BusStatus[] = ['On Route', 'Returning'];

const toneFor = (s: string): 'success' | 'info' | 'warning' | 'neutral' => {
  if (s === 'At School') return 'success';
  if (s === 'On Route' || s === 'Returning') return 'info';
  return 'neutral';
};

const STATUSES: BusStatus[] = ['On Route', 'At School', 'Idle', 'Returning'];

async function clearTripLocation(busId: string) {
  await supabase.from('buses').update({ latitude: null, longitude: null, speed: 0, eta: '—' }).eq('id', busId);
}

export default function AdminFleet() {
  const { showAlert } = useAlert();
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState<BusRow | null>(null);
  const [busEvents, setBusEvents] = useState<any[]>([]);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [boardingBus, setBoardingBus] = useState<BusRow | null>(null);
  const [busStudents, setBusStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const prevStatuses = useRef<Record<string, BusStatus>>({});
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadBuses();
    pollRef.current = setInterval(loadBuses, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadBuses = async () => {
    const { data } = await supabase.from('buses').select('*').order('number');
    if (data && data.length > 0) {
      const rows = data as BusRow[];
      for (const bus of rows) {
        const prevStatus = prevStatuses.current[bus.id];
        if (prevStatus && TRIP_ACTIVE.includes(prevStatus) && !TRIP_ACTIVE.includes(bus.status) && (bus.latitude || bus.longitude)) {
          await clearTripLocation(bus.id);
          bus.latitude = null; bus.longitude = null; bus.speed = 0; bus.eta = '—';
        }
        prevStatuses.current[bus.id] = bus.status;
      }
      setBuses(rows);
    } else {
      setBuses(mockBuses.map(b => ({ ...b, latitude: null, longitude: null, updated_at: new Date().toISOString() })) as any);
    }
    setLoading(false);
  };

  const updateStatus = async (busId: string, newStatus: BusStatus) => {
    const bus = buses.find(b => b.id === busId);
    if (!bus) return;
    const tripEnding = TRIP_ACTIVE.includes(bus.status) && !TRIP_ACTIVE.includes(newStatus);
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (tripEnding) { updates.latitude = null; updates.longitude = null; updates.speed = 0; updates.eta = '—'; }
    await supabase.from('buses').update(updates).eq('id', busId);
    setBuses(prev => prev.map(b => b.id === busId ? { ...b, ...updates } : b));
    if (tripEnding) showAlert('Trip completed', `${bus.number} GPS cleared.`);
  };

  const openBoarding = async (bus: BusRow) => {
    setBoardingBus(bus);
    setShowBoardModal(true);
    setLoadingStudents(true);
    // Load students — simulate by loading all sections
    const stds10C = await fetchStudents('10C');
    const stds11A = await fetchStudents('11A');
    setBusStudents([...stds10C.slice(0, 10), ...stds11A.slice(0, 10)]);
    setLoadingStudents(false);
  };

  const simulateBoard = async (studentId: string, studentName: string) => {
    if (!boardingBus) return;
    await logBusEvent({ bus_id: boardingBus.id, student_id: studentId, event_type: 'boarded' });
    showAlert('Boarded', `${studentName} boarded ${boardingBus.number}`);
  };

  const simulateDrop = async (studentId: string, studentName: string) => {
    if (!boardingBus) return;
    await logBusEvent({ bus_id: boardingBus.id, student_id: studentId, event_type: 'dropped' });
    showAlert('Dropped', `${studentName} dropped at stop`);
  };

  const openEvents = async (bus: BusRow) => {
    setSelectedBus(bus);
    const events = await fetchBusEvents(bus.id);
    setBusEvents(events);
  };

  const onBuses = buses.filter(b => b.status === 'On Route').length;
  const atSchool = buses.filter(b => b.status === 'At School').length;
  const returning = buses.filter(b => b.status === 'Returning').length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Fleet Management" subtitle={`${buses.length} buses · 30s refresh`} />
      </SafeAreaView>

      <View style={styles.kpiRow}>
        <KPI label="On Route" value={`${onBuses}`} tone={Colors.info} />
        <KPI label="At School" value={`${atSchool}`} tone={Colors.success} />
        <KPI label="Returning" value={`${returning}`} tone={Colors.warning} />
        <KPI label="Total" value={`${buses.length}`} tone={Colors.primary} />
      </View>

      <View style={styles.simBanner}>
        <MaterialCommunityIcons name="gesture-tap" color={Colors.saffron} size={14} />
        <Text style={styles.simBannerText}>No hardware: Tap "Simulate Boarding" to log boarding events manually.</Text>
        {loading && <ActivityIndicator color={Colors.primary} size="small" style={{ marginLeft: 'auto' }} />}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ gap: Spacing.md }}>
          {buses.map(b => (
            <Card key={b.id}>
              <View style={styles.row}>
                <View style={[styles.busIcon, { backgroundColor: TRIP_ACTIVE.includes(b.status) ? Colors.primary : Colors.textMuted }]}>
                  <MaterialCommunityIcons name="bus" color="#fff" size={22} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.title}>{b.number}</Text>
                  <Text style={styles.sub}>{b.route} · Driver: {b.driver}</Text>
                </View>
                <Pill label={b.status} tone={toneFor(b.status)} />
              </View>

              <View style={styles.grid}>
                <Cell label="ETA" value={b.eta} icon="clock-outline" />
                <Cell label="Speed" value={`${b.speed} km/h`} icon="speedometer" />
                <Cell label="Onboard" value={`${b.occupancy}/${b.capacity}`} icon="account-group" />
                <Cell label="GPS" value={b.latitude ? 'Active' : 'Cleared'} icon={b.latitude ? 'crosshairs-gps' : 'crosshairs-off'} />
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                {STATUSES.filter(s => s !== b.status).map(s => (
                  <Pressable key={s} onPress={() => updateStatus(b.id, s)} style={styles.statusBtn}>
                    <Text style={styles.statusBtnText}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.boardRow}>
                <Pressable onPress={() => openBoarding(b)} style={styles.boardBtn}>
                  <MaterialCommunityIcons name="account-arrow-right" color={Colors.success} size={16} />
                  <Text style={styles.boardBtnText}>Simulate Boarding</Text>
                </Pressable>
                <Pressable onPress={() => openEvents(b)} style={styles.eventsBtn}>
                  <MaterialCommunityIcons name="history" color={Colors.info} size={16} />
                  <Text style={styles.eventsBtnText}>Events</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>

      {/* Boarding simulation modal */}
      <Modal visible={showBoardModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBoardModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Simulate Boarding</Text>
              <Text style={styles.modalSub}>{boardingBus?.number} · {boardingBus?.route}</Text>
            </View>
            <Pressable onPress={() => setShowBoardModal(false)} hitSlop={12}>
              <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
            </Pressable>
          </View>
          <View style={styles.simNote}>
            <MaterialCommunityIcons name="information" color={Colors.info} size={14} />
            <Text style={styles.simNoteText}>Tap Board or Drop to log events. Real hardware (ESP32-CAM barcode) replaces this when installed.</Text>
          </View>
          {loadingStudents ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : (
            <FlatList
              data={busStudents}
              keyExtractor={s => s.id}
              contentContainerStyle={{ padding: Spacing.xl }}
              renderItem={({ item }) => (
                <View style={styles.boardStudentRow}>
                  <Text style={styles.boardStudentName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.boardBtns}>
                    <Pressable onPress={() => simulateBoard(item.id, item.name)} style={styles.boardBtnSmall}>
                      <Text style={styles.boardBtnSmallText}>Board</Text>
                    </Pressable>
                    <Pressable onPress={() => simulateDrop(item.id, item.name)} style={[styles.boardBtnSmall, { backgroundColor: Colors.dangerBg }]}>
                      <Text style={[styles.boardBtnSmallText, { color: Colors.danger }]}>Drop</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Events modal */}
      <Modal visible={!!selectedBus && busEvents !== undefined} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedBus(null)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{selectedBus?.number} Events</Text>
              <Text style={styles.modalSub}>Boarding & drop log</Text>
            </View>
            <Pressable onPress={() => setSelectedBus(null)} hitSlop={12}>
              <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
            </Pressable>
          </View>
          <FlatList
            data={busEvents}
            keyExtractor={e => e.id}
            contentContainerStyle={{ padding: Spacing.xl }}
            ListEmptyComponent={<View style={{ alignItems: 'center', paddingTop: 60 }}><Text style={{ color: Colors.textMuted, fontWeight: '600' }}>No events yet</Text></View>}
            renderItem={({ item }) => (
              <View style={styles.eventRow}>
                <View style={[styles.eventDot, { backgroundColor: item.event_type === 'boarded' ? Colors.success : Colors.warning }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eventName}>{item.students?.name ?? 'Unknown'}</Text>
                  <Text style={styles.eventMeta}>{item.event_type} · {new Date(item.timestamp).toLocaleTimeString()}</Text>
                </View>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function Cell({ label, value, icon }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }) {
  return (
    <View style={styles.cell}>
      <MaterialCommunityIcons name={icon} color={Colors.textMuted} size={14} />
      <View>
        <Text style={styles.cellLabel}>{label}</Text>
        <Text style={styles.cellValue}>{value}</Text>
      </View>
    </View>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={[styles.kpi, Shadows.card]}>
      <Text style={[styles.kpiValue, { color: tone }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: 'row', gap: 8, marginHorizontal: Spacing.xl, marginTop: Spacing.md },
  kpi: { flex: 1, backgroundColor: '#fff', borderRadius: Radius.md, paddingVertical: 12, alignItems: 'center' },
  kpiValue: { fontSize: 18, fontWeight: '900' },
  kpiLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', marginTop: 2, letterSpacing: 0.4 },
  simBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: Spacing.xl, marginTop: Spacing.sm, backgroundColor: '#FFF6E1', borderRadius: Radius.sm, padding: 8 },
  simBannerText: { flex: 1, color: '#B87A00', fontSize: 11, fontWeight: '600' },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  row: { flexDirection: 'row', alignItems: 'center' },
  busIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.lg, gap: 12 },
  cell: { width: '47%', flexDirection: 'row', alignItems: 'center', gap: 8 },
  cellLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cellValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  statusLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  statusBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.surfaceMuted, borderRadius: 999, borderWidth: 1, borderColor: Colors.border },
  statusBtnText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  boardRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  boardBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, backgroundColor: Colors.successBg, borderRadius: Radius.sm },
  boardBtnText: { color: Colors.success, fontSize: 12, fontWeight: '800' },
  eventsBtn: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: Colors.infoBg, borderRadius: Radius.sm, flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventsBtnText: { color: Colors.info, fontSize: 12, fontWeight: '800' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#fff' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  modalSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  simNote: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', margin: Spacing.lg, backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: 10 },
  simNoteText: { flex: 1, fontSize: 12, color: Colors.info, fontWeight: '600', lineHeight: 18 },
  boardStudentRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  boardStudentName: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  boardBtns: { flexDirection: 'row', gap: 8 },
  boardBtnSmall: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.successBg, borderRadius: Radius.sm },
  boardBtnSmallText: { fontSize: 12, fontWeight: '800', color: Colors.success },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: Radius.md, padding: 12 },
  eventDot: { width: 10, height: 10, borderRadius: 5 },
  eventName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  eventMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});

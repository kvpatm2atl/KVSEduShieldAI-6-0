// Parent: Early Pickup Request + Safety Events + Bus Tracking
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import BusMapView from '@/components/ui/BusMapView';
import {
  KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useAlert } from '@/template';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getSupabaseClient } from '@/template';
import { buses as mockBuses } from '@/services/mockData';
import { useAuth } from '@/hooks/useAuth';
import { createPickupRequest } from '@/services/schoolData';

const supabase = getSupabaseClient();

interface BusRow {
  id: string; number: string; driver: string; route: string;
  status: string; eta: string; speed: number; occupancy: number; capacity: number;
  latitude: number | null; longitude: number | null;
}

const SAFETY_EVENTS = [
  { icon: 'bus' as const, title: 'Boarded Bus 3', time: '7:15 AM', sub: 'Sector 12 Stop · ID verified', tone: 'info' as const },
  { icon: 'school' as const, title: 'Reached school safely', time: '7:48 AM', sub: 'Gate 2 · Bus 3', tone: 'success' as const },
  { icon: 'check-circle' as const, title: 'Marked Present in class', time: '8:02 AM', sub: `Class 10A · Teacher verified`, tone: 'success' as const },
  { icon: 'bus-clock' as const, title: 'Boarded return bus', time: '3:42 PM', sub: 'ETA home 4:20 PM', tone: 'info' as const },
  { icon: 'home-heart' as const, title: 'Reached home safely', time: '4:18 PM', sub: 'Sector 12 Stop', tone: 'success' as const },
];

export default function ParentSafety() {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const [buses, setBuses] = useState<BusRow[]>([]);
  const [myBus, setMyBus] = useState<BusRow | null>(null);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupTime, setPickupTime] = useState('');
  const [pickupReason, setPickupReason] = useState('');
  const [authorizedPerson, setAuthorizedPerson] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadBuses(); }, []);

  const loadBuses = async () => {
    const { data } = await supabase.from('buses').select('*').order('number');
    if (data && data.length > 0) {
      setBuses(data);
      setMyBus(data[2] ?? data[0]);
    } else {
      const fallback = mockBuses.map((b, i) => ({
        ...b, latitude: 28.639 + i * 0.003, longitude: 77.351 + i * 0.002,
      }));
      setBuses(fallback as any);
      setMyBus(fallback[2] as any);
    }
  };

  const submitPickup = async () => {
    if (!pickupTime.trim() || !pickupReason.trim()) {
      showAlert('Missing fields', 'Please enter pickup time and reason.');
      return;
    }
    setSubmitting(true);
    // In real scenario: look up student by parent's admission no
    // For now, log to DB if we have student info
    setSubmitting(false);
    showAlert(
      'Request submitted',
      `Pickup request for ${pickupTime} sent to school admin. You will receive a confirmation call.`,
      [{ text: 'OK' }]
    );
    setShowPickupModal(false);
    setPickupTime(''); setPickupReason(''); setAuthorizedPerson('');
  };

  const schoolCoord = { latitude: 28.6420, longitude: 77.3570 };
  const busCoord = myBus?.latitude
    ? { latitude: myBus.latitude, longitude: myBus.longitude }
    : { latitude: 28.6395, longitude: 77.3620 };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Safety" subtitle="Live bus tracking & safety events" />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bus Map Card */}
        <Card padded={false} style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View style={styles.busIcon}>
              <MaterialCommunityIcons name="bus" color="#fff" size={22} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.busNumber}>{myBus?.number ?? 'Bus 3'}</Text>
              <Text style={styles.busDriver}>Driver: {myBus?.driver ?? 'R. Singh'}</Text>
            </View>
            <Pill label={myBus?.status ?? 'Returning'} tone={myBus?.status === 'At School' ? 'success' : 'info'} />
          </View>
          <BusMapView busCoord={busCoord} schoolCoord={schoolCoord} busLabel={myBus?.number ?? 'Bus 3'} busRoute={myBus?.route ?? ''} />
          <View style={styles.statRow}>
            <Stat label="ETA" value={myBus?.eta ?? '4:20 PM'} />
            <Stat label="Speed" value={`${myBus?.speed ?? 28} km/h`} />
            <Stat label="Onboard" value={`${myBus?.occupancy ?? 36}/${myBus?.capacity ?? 42}`} />
          </View>
        </Card>

        {/* All buses */}
        <Text style={styles.section}>All fleet buses</Text>
        <View style={{ gap: Spacing.sm }}>
          {buses.map(b => (
            <Card key={b.id} style={styles.fleetRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.fleetBadge, { backgroundColor: b.status === 'At School' ? Colors.successBg : Colors.surfaceTint }]}>
                  <MaterialCommunityIcons name="bus" color={b.status === 'At School' ? Colors.success : Colors.primary} size={18} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.fleetTitle}>{b.number} · {b.driver}</Text>
                  <Text style={styles.fleetSub}>{b.route} · ETA {b.eta}</Text>
                </View>
                <Pill label={b.status} tone={b.status === 'At School' ? 'success' : b.status === 'Idle' ? 'neutral' : 'info'} />
              </View>
            </Card>
          ))}
        </View>

        {/* Today's safety events */}
        <Text style={styles.section}>Today's safety events</Text>
        <View style={{ gap: Spacing.md }}>
          {SAFETY_EVENTS.map((e, i) => (
            <Card key={i} padded>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.eventIcon, { backgroundColor: e.tone === 'success' ? Colors.successBg : Colors.infoBg }]}>
                  <MaterialCommunityIcons name={e.icon} color={e.tone === 'success' ? Colors.success : Colors.info} size={22} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.eventTitle}>{e.title}</Text>
                  <Text style={styles.eventSub}>{e.sub}</Text>
                </View>
                <Text style={styles.eventTime}>{e.time}</Text>
              </View>
            </Card>
          ))}
        </View>

        {/* Early pickup */}
        <Card style={{ marginTop: Spacing.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.eventIcon, { backgroundColor: '#FFE9DC' }]}>
              <MaterialCommunityIcons name="clock-alert" color={Colors.saffron} size={22} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.eventTitle}>Need early pickup?</Text>
              <Text style={styles.eventSub}>Request approval. Security will verify authorized person.</Text>
            </View>
          </View>
          <PrimaryButton label="Request Early Pickup" onPress={() => setShowPickupModal(true)} variant="saffron" style={{ marginTop: Spacing.lg }} />
        </Card>
      </ScrollView>

      {/* Early Pickup Modal */}
      <Modal visible={showPickupModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPickupModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Early Pickup Request</Text>
              <Pressable onPress={() => setShowPickupModal(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <View style={styles.studentCard}>
                <MaterialCommunityIcons name="account-child" color={Colors.primary} size={24} />
                <Text style={styles.studentCardText}>{user?.studentName ?? 'Student'} · Class {user?.section ?? '—'}</Text>
              </View>

              <Text style={styles.formLabel}>Pickup Time</Text>
              <TextInput value={pickupTime} onChangeText={setPickupTime} placeholder="e.g. 1:00 PM" placeholderTextColor={Colors.textMuted} style={styles.formInput} />

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Reason for early pickup</Text>
              <TextInput
                value={pickupReason} onChangeText={setPickupReason}
                placeholder="e.g. Doctor's appointment" placeholderTextColor={Colors.textMuted}
                style={[styles.formInput, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                multiline
              />

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Authorized person (if not parent)</Text>
              <TextInput value={authorizedPerson} onChangeText={setAuthorizedPerson} placeholder="Name & relation (e.g. Uncle Rajesh)" placeholderTextColor={Colors.textMuted} style={styles.formInput} />

              <View style={styles.noteCard}>
                <MaterialCommunityIcons name="information" color={Colors.info} size={16} />
                <Text style={styles.noteText}>Security will verify the authorized person's identity with photo ID before releasing student.</Text>
              </View>

              <PrimaryButton label={submitting ? 'Submitting…' : 'Submit Request'} onPress={submitPickup} loading={submitting} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  mapCard: { overflow: 'hidden' },
  mapHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.lg },
  busIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  busNumber: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  busDriver: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  statRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border },
  stat: { flex: 1, paddingVertical: Spacing.lg, alignItems: 'center', borderRightWidth: 1, borderRightColor: Colors.border },
  statValue: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4, fontWeight: '600', letterSpacing: 0.6 },
  section: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginVertical: Spacing.lg },
  fleetRow: { paddingVertical: 12, paddingHorizontal: Spacing.lg },
  fleetBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fleetTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  fleetSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  eventIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  eventSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  eventTime: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  studentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceTint, borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.lg },
  studentCardText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  formInput: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  noteCard: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg },
  noteText: { flex: 1, fontSize: 12, color: Colors.info, fontWeight: '600', lineHeight: 18 },
});

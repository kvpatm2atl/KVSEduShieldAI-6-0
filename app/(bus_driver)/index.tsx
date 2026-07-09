// Bus Driver: My Route & Trip Management
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

const STATUS_MAP: Record<string, { next: string; label: string; color: string }> = {
  'Idle':      { next: 'On Route',  label: 'Start Morning Trip',  color: Colors.info },
  'On Route':  { next: 'At School', label: 'Arrived at School',   color: Colors.success },
  'At School': { next: 'Returning', label: 'Start Return Trip',   color: Colors.warning },
  'Returning': { next: 'Idle',      label: 'Trip Completed',      color: Colors.primary },
};

export default function BusDriverIndex() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { loadBuses(); }, []);

  const loadBuses = async () => {
    const { data } = await supabase.from('buses').select('*').order('number');
    setBuses(data ?? []);
    setLoading(false);
  };

  const updateStatus = async (busId: string, newStatus: string) => {
    setUpdating(true);
    const updates: any = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'On Route') updates.speed = 30;
    if (newStatus === 'At School' || newStatus === 'Idle') { updates.speed = 0; updates.latitude = null; updates.longitude = null; updates.eta = '—'; }
    if (newStatus === 'Returning') updates.speed = 25;
    await supabase.from('buses').update(updates).eq('id', busId);
    setBuses(prev => prev.map(b => b.id === busId ? { ...b, ...updates } : b));
    if (selectedBus?.id === busId) setSelectedBus((prev: any) => ({ ...prev, ...updates }));
    setUpdating(false);
    showAlert('Status Updated', `Bus status changed to ${newStatus}`);
  };

  if (!selectedBus) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <SafeAreaView edges={['top']}>
          <ScreenHeader title="Select Your Bus" subtitle="Manage your route & trip" />
        </SafeAreaView>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#10B981" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: Spacing.xl, gap: Spacing.md }}>
            {buses.map(bus => (
              <Pressable key={bus.id} onPress={() => setSelectedBus(bus)}
                style={({ pressed }) => [styles.busCard, pressed && { opacity: 0.85 }]}>
                <View style={[styles.busIcon, { backgroundColor: '#10B981' }]}>
                  <MaterialCommunityIcons name="steering" color="#fff" size={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.busTitle}>{bus.number}</Text>
                  <Text style={styles.busSub}>{bus.route}</Text>
                  <Text style={styles.busDriver}>Driver: {bus.driver}</Text>
                </View>
                <Pill label={bus.status} tone={bus.status === 'At School' ? 'success' : bus.status === 'Idle' ? 'neutral' : 'info'} />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  const nextAction = STATUS_MAP[selectedBus.status] ?? STATUS_MAP['Idle'];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader
          title={selectedBus.number}
          subtitle={selectedBus.route}
          rightAction={
            <Pressable onPress={() => setSelectedBus(null)} style={styles.changeBusBtn}>
              <Text style={styles.changeBusText}>Change</Text>
            </Pressable>
          }
        />
      </SafeAreaView>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status card */}
        <Card>
          <View style={styles.statusRow}>
            <View style={[styles.statusIcon, { backgroundColor: '#10B981' + '20' }]}>
              <MaterialCommunityIcons name="steering" color="#10B981" size={26} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.busLabel}>{selectedBus.number} · {selectedBus.driver}</Text>
              <Pill label={selectedBus.status} tone={selectedBus.status === 'At School' ? 'success' : selectedBus.status === 'Idle' ? 'neutral' : 'info'} />
            </View>
          </View>
          <View style={styles.statsGrid}>
            <StatCell label="Speed" value={`${selectedBus.speed ?? 0} km/h`} icon="speedometer" />
            <StatCell label="Onboard" value={`${selectedBus.occupancy ?? 0}/${selectedBus.capacity ?? 42}`} icon="account-group" />
            <StatCell label="ETA" value={selectedBus.eta ?? '—'} icon="clock-outline" />
            <StatCell label="GPS" value={selectedBus.latitude ? 'Active' : 'Off'} icon="crosshairs-gps" />
          </View>
        </Card>

        {/* Big action button */}
        <Pressable
          onPress={() => updateStatus(selectedBus.id, nextAction.next)}
          style={[styles.bigActionBtn, { backgroundColor: nextAction.color }]}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="bus-clock" color="#fff" size={28} />
              <Text style={styles.bigActionText}>{nextAction.label}</Text>
              <Text style={styles.bigActionSub}>Tap to update status</Text>
            </>
          )}
        </Pressable>

        {/* Route stops */}
        <Text style={styles.sectionTitle}>Route Information</Text>
        <Card>
          <View style={styles.routeRow}>
            <MaterialCommunityIcons name="map-marker" color={Colors.success} size={20} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.routeLabel}>Pickup Route</Text>
              <Text style={styles.routeValue}>{selectedBus.route}</Text>
            </View>
          </View>
          <View style={[styles.routeRow, { marginTop: 12 }]}>
            <MaterialCommunityIcons name="school" color={Colors.primary} size={20} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.routeLabel}>Destination</Text>
              <Text style={styles.routeValue}>KVS School · Main Gate</Text>
            </View>
          </View>
        </Card>

        {/* Emergency */}
        <Text style={styles.sectionTitle}>Emergency</Text>
        <Pressable onPress={() => showAlert('Emergency Alert', 'SOS sent to admin and school management.', [{ text: 'OK' }])}
          style={styles.emergencyBtn}>
          <MaterialCommunityIcons name="alert-octagon" color="#fff" size={22} />
          <Text style={styles.emergencyText}>Send SOS / Emergency Alert</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StatCell({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.statCell}>
      <MaterialCommunityIcons name={icon as any} color={Colors.textMuted} size={16} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  busCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 12, ...Shadows.card },
  busIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  busTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  busSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  busDriver: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  changeBusBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.pill },
  changeBusText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, gap: Spacing.md },
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  busLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.lg, gap: 12 },
  statCell: { width: '47%', gap: 2 },
  statLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 14, color: Colors.textPrimary, fontWeight: '700' },
  bigActionBtn: { borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: 8, ...Shadows.raised },
  bigActionText: { color: '#fff', fontSize: 22, fontWeight: '900' },
  bigActionSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.sm },
  routeRow: { flexDirection: 'row', alignItems: 'center' },
  routeLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  routeValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  emergencyBtn: { backgroundColor: Colors.danger, borderRadius: Radius.lg, padding: Spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  emergencyText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});

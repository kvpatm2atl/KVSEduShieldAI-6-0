// Security Guard: Gate dashboard — real data, gate pickup posting
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { fetchPickupRequests, updatePickupStatus } from '@/services/schoolData';
import { getSupabaseClient } from '@/template';
import { useRouter } from 'expo-router';

const supabase = getSupabaseClient();

export default function SecurityIndex() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const router = useRouter();
  const [pickups, setPickups] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-IN'));

  useEffect(() => {
    loadData();
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString('en-IN')), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    const [pickupData, busData] = await Promise.all([
      fetchPickupRequests({ status: 'Approved' }),
      supabase.from('buses').select('*').order('number'),
    ]);
    setPickups(pickupData);
    setBuses(busData.data ?? []);
    setLoading(false);
    setRefreshing(false);
  };

  const releaseStudent = async (id: string, studentName: string) => {
    await updatePickupStatus(id, 'Completed');
    setPickups(prev => prev.filter(p => p.id !== id));
    showAlert('Released', `${studentName} has been released to authorized person.`);
  };

  const onBuses = buses.filter(b => b.status === 'On Route' || b.status === 'Returning').length;
  const atSchool = buses.filter(b => b.status === 'At School').length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Gate Management" subtitle={`Main Gate · ${time}`} />
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#EF4444" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        >
          {/* KPI */}
          <View style={styles.kpiRow}>
            <KPI label="Buses Active" value={`${onBuses}`} color={Colors.info} icon="bus" />
            <KPI label="At School" value={`${atSchool}`} color={Colors.success} icon="school" />
            <KPI label="Pending Pickups" value={`${pickups.length}`} color={Colors.warning} icon="car-arrow-right" />
          </View>

          {/* Quick action — log gate pickup */}
          <Pressable onPress={() => router.push('/(security)/pickup')} style={styles.quickAction}>
            <View style={styles.qaIcon}>
              <MaterialCommunityIcons name="account-arrow-right" color="#fff" size={24} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.qaTitle}>Log Gate Pickup</Text>
              <Text style={styles.qaSub}>Parent arrived at gate for early pickup</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" color="rgba(255,255,255,0.8)" size={22} />
          </Pressable>

          {/* Approved pickups */}
          <Text style={styles.section}>Approved Early Pickups</Text>
          {pickups.length === 0 ? (
            <Card>
              <View style={{ alignItems: 'center', paddingVertical: Spacing.xl }}>
                <MaterialCommunityIcons name="check-circle" color={Colors.success} size={40} />
                <Text style={{ color: Colors.textMuted, fontWeight: '600', marginTop: 8 }}>No pending pickups</Text>
              </View>
            </Card>
          ) : (
            pickups.map(p => (
              <Card key={p.id} style={styles.pickupCard}>
                <View style={styles.row}>
                  <View style={styles.pickupIcon}>
                    <MaterialCommunityIcons name="account-arrow-right" color={Colors.warning} size={22} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.studentName}>{p.students?.name ?? 'Unknown'}</Text>
                    <Text style={styles.pickupMeta}>{p.students?.section} · {p.pickup_time}</Text>
                    <Text style={styles.pickupMeta}>Person: {p.authorized_person ?? 'Parent'}</Text>
                    <Text style={styles.pickupReason}>{p.reason}</Text>
                  </View>
                </View>
                <Pressable onPress={() => releaseStudent(p.id, p.students?.name ?? 'Student')} style={styles.releaseBtn}>
                  <MaterialCommunityIcons name="gate-open" color="#fff" size={18} />
                  <Text style={styles.releaseBtnText}>Mark as Released</Text>
                </Pressable>
              </Card>
            ))
          )}

          {/* Bus status */}
          <Text style={styles.section}>Bus Status</Text>
          {buses.map(bus => (
            <Card key={bus.id} style={styles.busCard}>
              <View style={styles.row}>
                <View style={[styles.busIcon, { backgroundColor: bus.status === 'At School' ? Colors.success : bus.status === 'Idle' ? Colors.textMuted : Colors.info }]}>
                  <MaterialCommunityIcons name="bus" color="#fff" size={20} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.busTitle}>{bus.number}</Text>
                  <Text style={styles.busSub}>{bus.route} · ETA: {bus.eta}</Text>
                </View>
                <Pill label={bus.status} tone={bus.status === 'At School' ? 'success' : bus.status === 'Idle' ? 'neutral' : 'info'} />
              </View>
            </Card>
          ))}

          <Text style={styles.footer}>Made by team NovaThink</Text>
        </ScrollView>
      )}
    </View>
  );
}

function KPI({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={[styles.kpi, Shadows.card]}>
      <MaterialCommunityIcons name={icon as any} color={color} size={22} />
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.xl },
  kpi: { flex: 1, backgroundColor: '#fff', borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', gap: 4 },
  kpiValue: { fontSize: 22, fontWeight: '900' },
  kpiLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', letterSpacing: 0.4, textAlign: 'center' },
  quickAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.xl, ...Shadows.raised },
  qaIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  qaTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  qaSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },
  section: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.md },
  pickupCard: { marginBottom: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  pickupIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.warningBg, alignItems: 'center', justifyContent: 'center' },
  studentName: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  pickupMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  pickupReason: { fontSize: 12, color: Colors.textMuted, marginTop: 2, fontStyle: 'italic' },
  releaseBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.success, borderRadius: Radius.md, paddingVertical: 12, marginTop: Spacing.md },
  releaseBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  busCard: { marginBottom: 8 },
  busIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  busTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  busSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  footer: { textAlign: 'center', color: Colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: Spacing.xl },
});

// Admin: Early Pickup Request Management — approve, deny, view history
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useAlert } from '@/template';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { fetchPickupRequests, updatePickupStatus } from '@/services/schoolData';

const FILTERS = ['All', 'Pending', 'Approved', 'Denied', 'Completed'];

const statusTone = (s: string): 'warning' | 'success' | 'danger' | 'neutral' => {
  if (s === 'Pending') return 'warning';
  if (s === 'Approved') return 'success';
  if (s === 'Denied') return 'danger';
  return 'neutral';
};

export default function AdminPickup() {
  const { showAlert } = useAlert();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    setLoading(true);
    const data = await fetchPickupRequests();
    setRequests(data);
    setLoading(false);
  };

  const approve = (id: string, studentName: string) => {
    showAlert('Approve pickup?', `Confirm early pickup for ${studentName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', style: 'default', onPress: async () => {
          await updatePickupStatus(id, 'Approved');
          setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
          showAlert('Approved', `Pickup for ${studentName} approved. Security notified.`);
        }
      },
    ]);
  };

  const deny = (id: string, studentName: string) => {
    showAlert('Deny pickup?', `Deny early pickup request for ${studentName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deny', style: 'destructive', onPress: async () => {
          await updatePickupStatus(id, 'Denied');
          setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Denied' } : r));
        }
      },
    ]);
  };

  const markCompleted = async (id: string, studentName: string) => {
    await updatePickupStatus(id, 'Completed');
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Completed' } : r));
    showAlert('Completed', `${studentName} has been picked up.`);
  };

  const filtered = filter === 'All' ? requests : requests.filter(r => r.status === filter);
  const pending = requests.filter(r => r.status === 'Pending').length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Early Pickup" subtitle={`${pending} pending requests`} />
      </SafeAreaView>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {FILTERS.map(f => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, filter === f && styles.chipActive]}>
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
            {f === 'Pending' && pending > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pending}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="account-child" color={Colors.textMuted} size={48} />
              <Text style={styles.emptyText}>No {filter.toLowerCase()} requests</Text>
            </View>
          }
          renderItem={({ item }) => {
            const studentName = item.students?.name ?? 'Student';
            const section = item.students?.section ?? '—';
            const admNo = item.students?.admission_no ?? '—';
            return (
              <Card style={styles.requestCard}>
                {/* Header */}
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: item.status === 'Pending' ? Colors.warningBg : item.status === 'Approved' ? Colors.successBg : Colors.dangerBg }]}>
                    <MaterialCommunityIcons
                      name="account-child"
                      color={item.status === 'Pending' ? Colors.warning : item.status === 'Approved' ? Colors.success : Colors.danger}
                      size={22}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.studentName}>{studentName}</Text>
                    <Text style={styles.studentMeta}>{section} · Adm: {admNo.slice(-6)}</Text>
                  </View>
                  <Pill label={item.status} tone={statusTone(item.status)} />
                </View>

                {/* Details */}
                <View style={styles.detailGrid}>
                  <DetailItem icon="clock-outline" label="Pickup time" value={item.pickup_time} />
                  <DetailItem icon="text-box" label="Reason" value={item.reason} />
                  {item.authorized_person ? (
                    <DetailItem icon="account-check" label="Authorized person" value={item.authorized_person} />
                  ) : null}
                  <DetailItem icon="calendar" label="Requested" value={new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} />
                </View>

                {/* Actions */}
                {item.status === 'Pending' && (
                  <View style={styles.actionRow}>
                    <Pressable onPress={() => approve(item.id, studentName)} style={styles.approveBtn}>
                      <MaterialCommunityIcons name="check-circle" color={Colors.success} size={16} />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </Pressable>
                    <Pressable onPress={() => deny(item.id, studentName)} style={styles.denyBtn}>
                      <MaterialCommunityIcons name="close-circle" color={Colors.danger} size={16} />
                      <Text style={styles.denyBtnText}>Deny</Text>
                    </Pressable>
                  </View>
                )}
                {item.status === 'Approved' && (
                  <Pressable onPress={() => markCompleted(item.id, studentName)} style={styles.completedBtn}>
                    <MaterialCommunityIcons name="account-arrow-right" color={Colors.primary} size={16} />
                    <Text style={styles.completedBtnText}>Mark as Completed (Student Picked Up)</Text>
                  </Pressable>
                )}
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

function DetailItem({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.detailItem}>
      <MaterialCommunityIcons name={icon} color={Colors.textMuted} size={14} />
      <View style={{ flex: 1, marginLeft: 6 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterBar: { paddingVertical: Spacing.sm },
  filterContent: { gap: 8, paddingHorizontal: Spacing.xl },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  badge: { backgroundColor: Colors.danger, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  list: { padding: Spacing.xl, paddingBottom: 100 },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  requestCard: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  studentName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  studentMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  detailGrid: { gap: 8, marginTop: Spacing.md },
  detailItem: { flexDirection: 'row', alignItems: 'flex-start' },
  detailLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.lg },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: Colors.successBg, borderRadius: Radius.md },
  approveBtnText: { color: Colors.success, fontSize: 14, fontWeight: '800' },
  denyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: Colors.dangerBg, borderRadius: Radius.md },
  denyBtnText: { color: Colors.danger, fontSize: 14, fontWeight: '800' },
  completedBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: Colors.surfaceTint, borderRadius: Radius.md },
  completedBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
});

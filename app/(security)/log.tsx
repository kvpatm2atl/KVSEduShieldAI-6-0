// Security Guard: Activity Log
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Spacing } from '@/constants/theme';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export default function SecurityLog() {
  const [pickups, setPickups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('early_pickup_requests')
        .select('*, students(name,section)')
        .order('created_at', { ascending: false })
        .limit(50);
      setPickups(data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Activity Log" subtitle="All pickup and gate events" />
      </SafeAreaView>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#EF4444" />
        </View>
      ) : (
        <FlatList
          data={pickups}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <MaterialCommunityIcons name="clipboard-list" color={Colors.textMuted} size={56} />
              <Text style={{ color: Colors.textMuted, fontWeight: '600', marginTop: 12 }}>No activity logged</Text>
            </View>
          }
          renderItem={({ item }) => {
            const color = item.status === 'Completed' ? Colors.success :
              item.status === 'Approved' ? Colors.info :
              item.status === 'Denied' ? Colors.danger : Colors.warning;
            return (
              <Card style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.name}>{item.students?.name ?? 'Unknown'}</Text>
                    <Text style={styles.meta}>{item.students?.section} · {item.pickup_time}</Text>
                    <Text style={styles.meta}>{item.reason}</Text>
                    <Text style={styles.time}>{new Date(item.created_at).toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.statusText, { color }]}>{item.status}</Text>
                  </View>
                </View>
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.xl, paddingBottom: 40 },
  card: { padding: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  meta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  time: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800' },
});

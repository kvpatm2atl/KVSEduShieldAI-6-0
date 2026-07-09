// Bus Driver: Trips log
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Spacing } from '@/constants/theme';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export default function BusDriverTrips() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('bus_events')
        .select('*, buses(number,route), students(name,section)')
        .order('timestamp', { ascending: false })
        .limit(50);
      setEvents(data ?? []);
      setLoading(false);
    })();
  }, []);

  const eventColor = (type: string) => {
    if (type === 'boarded') return 'info';
    if (type === 'dropped') return 'success';
    if (type === 'arrived_school') return 'success';
    return 'neutral';
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Trip Log" subtitle="All boarding and drop events" />
      </SafeAreaView>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#10B981" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={e => e.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80 }}>
              <MaterialCommunityIcons name="bus-clock" color={Colors.textMuted} size={56} />
              <Text style={styles.emptyText}>No trip events yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.eventCard}>
              <View style={styles.row}>
                <View style={styles.eventDot}>
                  <MaterialCommunityIcons
                    name={item.event_type === 'boarded' ? 'account-arrow-right' : 'map-marker-check'}
                    color={item.event_type === 'boarded' ? Colors.info : Colors.success}
                    size={18}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.studentName}>{item.students?.name ?? 'Unknown'}</Text>
                  <Text style={styles.eventMeta}>{item.buses?.number} · {item.buses?.route}</Text>
                  <Text style={styles.eventTime}>{new Date(item.timestamp).toLocaleString('en-IN')}</Text>
                  {item.notes ? <Text style={styles.eventNotes}>{item.notes}</Text> : null}
                </View>
                <Pill label={item.event_type} tone={eventColor(item.event_type)} />
              </View>
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.xl, paddingBottom: 40 },
  eventCard: {},
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  eventDot: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  studentName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  eventMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  eventTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  eventNotes: { fontSize: 11, color: Colors.warning, marginTop: 4, fontStyle: 'italic' },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textMuted, marginTop: 12 },
});

// Admin: Incidents — view all, resolve, section filter
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
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

const SECTIONS = ['All', '10A', '10B', '10C', '10D', '11A'];
const TYPES = ['All', 'Illness', 'Injury', 'Bullying', 'Behaviour', 'Emergency'];

interface Incident {
  id: string; student_name: string; type: string; notes: string;
  section: string; severity: string; resolved: boolean; created_at: string;
}

const severityTone = (s: string): 'danger' | 'warning' | 'info' | 'neutral' => {
  if (s === 'Critical') return 'danger';
  if (s === 'High') return 'danger';
  if (s === 'Medium') return 'warning';
  return 'neutral';
};

export default function AdminIncidents() {
  const { showAlert } = useAlert();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSection, setFilterSection] = useState('All');
  const [filterType, setFilterType] = useState('All');

  useEffect(() => { loadIncidents(); }, []);

  const loadIncidents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setIncidents((data as Incident[]) ?? []);
    setLoading(false);
  };

  const resolve = async (id: string, name: string) => {
    showAlert('Resolve incident?', `Mark ${name}'s incident as resolved?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Resolve', style: 'default', onPress: async () => {
          await supabase.from('incidents').update({ resolved: true }).eq('id', id);
          setIncidents(prev => prev.map(i => i.id === id ? { ...i, resolved: true } : i));
        }
      },
    ]);
  };

  const filtered = incidents.filter(i => {
    const matchSec = filterSection === 'All' || i.section === filterSection;
    const matchType = filterType === 'All' || i.type === filterType;
    return matchSec && matchType;
  });

  const unresolved = incidents.filter(i => !i.resolved).length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Incidents" subtitle={`${unresolved} unresolved · ${incidents.length} total`} />
      </SafeAreaView>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: Spacing.xl }}>
        {SECTIONS.map(s => (
          <Pressable key={s} onPress={() => setFilterSection(s)} style={[styles.chip, filterSection === s && styles.chipActive]}>
            <Text style={[styles.chipText, filterSection === s && styles.chipTextActive]}>{s}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: Spacing.xl }}>
        {TYPES.map(t => (
          <Pressable key={t} onPress={() => setFilterType(t)} style={[styles.chip, filterType === t && styles.chipActive]}>
            <Text style={[styles.chipText, filterType === t && styles.chipTextActive]}>{t}</Text>
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
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, gap: 8 }}>
              <MaterialCommunityIcons name="shield-check" color={Colors.success} size={48} />
              <Text style={{ color: Colors.success, fontSize: 16, fontWeight: '700' }}>No incidents found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={[styles.incCard, item.resolved && styles.resolvedCard]}>
              <View style={styles.incRow}>
                <View style={[styles.incIcon, { backgroundColor: item.severity === 'Critical' || item.severity === 'High' ? Colors.dangerBg : Colors.warningBg }]}>
                  <MaterialCommunityIcons
                    name={item.type === 'Illness' ? 'medical-bag' : item.type === 'Emergency' ? 'ambulance' : item.type === 'Bullying' ? 'account-alert' : 'alert-octagon'}
                    color={item.severity === 'Critical' || item.severity === 'High' ? Colors.danger : Colors.warning}
                    size={22}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.incName}>{item.student_name}</Text>
                  <Text style={styles.incNotes} numberOfLines={2}>{item.notes}</Text>
                  <View style={styles.incMeta}>
                    <Text style={styles.incTime}>{new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                    <Text style={styles.incSection}>· {item.section}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Pill label={item.type} tone={severityTone(item.severity)} />
                  <Pill label={item.severity} tone={severityTone(item.severity)} />
                </View>
              </View>
              {!item.resolved && (
                <Pressable onPress={() => resolve(item.id, item.student_name)} style={styles.resolveBtn}>
                  <MaterialCommunityIcons name="check-circle" color={Colors.success} size={16} />
                  <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                </Pressable>
              )}
              {item.resolved && (
                <View style={styles.resolvedBadge}>
                  <MaterialCommunityIcons name="check-circle" color={Colors.success} size={14} />
                  <Text style={styles.resolvedBadgeText}>Resolved</Text>
                </View>
              )}
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { paddingVertical: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  list: { padding: Spacing.xl, paddingBottom: 100 },
  incCard: {},
  resolvedCard: { opacity: 0.75 },
  incRow: { flexDirection: 'row', alignItems: 'flex-start' },
  incIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  incName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  incNotes: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  incMeta: { flexDirection: 'row', gap: 4, marginTop: 4 },
  incTime: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  incSection: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: Colors.successBg, borderRadius: Radius.sm, alignSelf: 'flex-start' },
  resolveBtnText: { color: Colors.success, fontSize: 13, fontWeight: '800' },
  resolvedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  resolvedBadgeText: { color: Colors.success, fontSize: 12, fontWeight: '700' },
});

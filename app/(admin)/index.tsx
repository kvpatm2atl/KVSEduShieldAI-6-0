// Admin overview — connected to real DB stats
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/template';
import { fetchNotices } from '@/services/schoolData';

const supabase = getSupabaseClient();

export default function AdminOverview() {
  const { user } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    totalStudents: 0, totalTeachers: 0, totalBuses: 0,
    presentToday: 0, pendingPickups: 0, openIncidents: 0,
    homework: 0, notices: 0,
  });
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [recentNotices, setRecentNotices] = useState<any[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    const [studRes, teachRes, busRes, attRes, pickupRes, incRes, hwRes, alertRes] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('buses').select('id', { count: 'exact', head: true }),
      supabase.from('attendance').select('present', { count: 'exact' }).eq('date', today).eq('present', true),
      supabase.from('early_pickup_requests').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
      supabase.from('incidents').select('id,student_name,type,notes,section,severity,created_at,resolved').eq('resolved', false).order('created_at', { ascending: false }).limit(4),
      supabase.from('homework').select('id', { count: 'exact', head: true }),
      supabase.from('emergency_alerts').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    ]);
    setActiveAlerts(alertRes.data ?? []);

    const ns = await fetchNotices();

    setStats({
      totalStudents: studRes.count ?? 0,
      totalTeachers: teachRes.count ?? 0,
      totalBuses: busRes.count ?? 0,
      presentToday: attRes.count ?? 0,
      pendingPickups: pickupRes.count ?? 0,
      openIncidents: incRes.data?.length ?? 0,
      homework: hwRes.count ?? 0,
      notices: ns.length,
    });
    setRecentIncidents(incRes.data ?? []);
    setRecentNotices(ns.slice(0, 3));
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Emergency Alert Banner */}
      {activeAlerts.length > 0 && (
        <View style={{ zIndex: 100 }}>
          <LinearGradient colors={['#7F1D1D', '#DC2626']} style={styles.emergencyBanner}>
            <MaterialCommunityIcons name="alert-circle" color="#fff" size={20} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.emergencyTitle}>ACTIVE ALERT · {activeAlerts[0].alert_type?.toUpperCase()}</Text>
              <Text style={styles.emergencyMsg} numberOfLines={1}>{activeAlerts[0].title}</Text>
            </View>
            <Pressable onPress={() => router.push('/(admin)/emergency')} style={styles.emergencyBtn}>
              <Text style={styles.emergencyBtnText}>Manage</Text>
            </Pressable>
          </LinearGradient>
        </View>
      )}
      <SafeAreaView edges={activeAlerts.length > 0 ? [] : ['top']} style={{ backgroundColor: '#3D2A6B' }}>
        <LinearGradient colors={['#3D2A6B', '#6B3FA0', '#A36BD6']} style={styles.hero}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.hello}>Principal Dashboard</Text>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.sub}>{user?.subtitle ?? 'School Administrator'}</Text>
            </View>
            <Pressable onPress={loadData} style={styles.bellBadge}>
              <MaterialCommunityIcons name="refresh" color="#fff" size={20} />
            </Pressable>
          </View>

          <View style={styles.bigStats}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Big value={`${stats.presentToday}/${stats.totalStudents}`} label="Present today" />
                <View style={styles.bigSep} />
                <Big value={`${stats.totalBuses}`} label="Buses" />
                <View style={styles.bigSep} />
                <Big value={`${stats.openIncidents}`} label="Open incidents" />
                <View style={styles.bigSep} />
                <Big value={`${stats.pendingPickups}`} label="Pickup pending" />
              </>
            )}
          </View>
        </LinearGradient>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Live operations grid */}
        <Text style={styles.section}>Live operations</Text>
        <View style={styles.opGrid}>
          <Pressable onPress={() => router.push('/(admin)/students')}>
            <Op icon="account-group" label="Students" value={`${stats.totalStudents}`} tone={Colors.primary} bg={Colors.surfaceTint} />
          </Pressable>
          <Pressable onPress={() => router.push('/(admin)/teachers')}>
            <Op icon="account-tie" label="Teachers" value={`${stats.totalTeachers}`} tone={Colors.info} bg={Colors.infoBg} />
          </Pressable>
          <Pressable onPress={() => router.push('/(admin)/fleet')}>
            <Op icon="bus" label="Fleet" value={`${stats.totalBuses}`} tone={Colors.saffron} bg="#FFE9DC" />
          </Pressable>
          <Pressable onPress={() => router.push('/(admin)/pickup')}>
            <Op icon="account-arrow-right" label="Pickup due" value={`${stats.pendingPickups}`} tone={Colors.warning} bg={Colors.warningBg} />
          </Pressable>
          <Pressable onPress={() => router.push('/(admin)/incidents')}>
            <Op icon="alert-circle" label="Open incidents" value={`${stats.openIncidents}`} tone={Colors.danger} bg={Colors.dangerBg} />
          </Pressable>
          <Pressable onPress={() => router.push('/(admin)/notices')}>
            <Op icon="bullhorn" label="Notices" value={`${stats.notices}`} tone={Colors.success} bg={Colors.successBg} />
          </Pressable>
        </View>

        {/* Quick navigation */}
        <Text style={styles.section}>Quick access</Text>
        <Card padded={false}>
          <NavRow icon="alert-circle" label="Emergency Alerts" tint={Colors.danger} bg={Colors.dangerBg} onPress={() => router.push('/(admin)/emergency')} badge={activeAlerts.length > 0 ? `${activeAlerts.length} LIVE` : undefined} />
          <Divider />
          <NavRow icon="chart-bar" label="Analytics & Reports" tint={Colors.success} bg={Colors.successBg} onPress={() => router.push('/(admin)/analytics')} />
          <Divider />
          <NavRow icon="brain" label="AI Insights" tint="#6E55C2" bg="#F0ECFD" onPress={() => router.push('/(admin)/ai')} />
          <Divider />
          <NavRow icon="account-arrow-right" label="Early Pickup Requests" tint={Colors.warning} bg={Colors.warningBg} onPress={() => router.push('/(admin)/pickup')} badge={stats.pendingPickups > 0 ? `${stats.pendingPickups}` : undefined} />
          <Divider />
          <NavRow icon="bus-multiple" label="Fleet Management" tint={Colors.saffron} bg="#FFE9DC" onPress={() => router.push('/(admin)/fleet')} />
        </Card>

        {/* Recent incidents */}
        {recentIncidents.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>Open incidents</Text>
              <Pressable onPress={() => router.push('/(admin)/incidents')}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>
            <View style={{ gap: Spacing.md }}>
              {recentIncidents.map(i => (
                <Card key={i.id}>
                  <View style={styles.row}>
                    <View style={[styles.incIcon, { backgroundColor: i.severity === 'Critical' || i.severity === 'High' ? Colors.dangerBg : Colors.warningBg }]}>
                      <MaterialCommunityIcons
                        name={i.type === 'Illness' ? 'medical-bag' : i.type === 'Emergency' ? 'ambulance' : 'alert-octagon'}
                        color={i.severity === 'Critical' || i.severity === 'High' ? Colors.danger : Colors.warning}
                        size={22}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cardTitle}>{i.student_name}</Text>
                      <Text style={styles.cardSub} numberOfLines={2}>{i.notes}</Text>
                      <Text style={styles.time}>{i.section}</Text>
                    </View>
                    <View style={{ gap: 4, alignItems: 'flex-end' }}>
                      <Pill label={i.type} tone="danger" />
                      <Pill label={i.severity} tone={i.severity === 'Critical' || i.severity === 'High' ? 'danger' : 'warning'} />
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}

        {/* Recent notices */}
        {recentNotices.length > 0 && (
          <>
            <View style={styles.sectionRow}>
              <Text style={styles.section}>Recent notices</Text>
              <Pressable onPress={() => router.push('/(admin)/notices')}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>
            <View style={{ gap: Spacing.md }}>
              {recentNotices.map(n => (
                <Card key={n.id}>
                  <View style={styles.row}>
                    <View style={[styles.incIcon, { backgroundColor: '#FFE9DC' }]}>
                      <MaterialCommunityIcons name="bullhorn" color={Colors.saffron} size={22} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.cardTitle}>{n.title}</Text>
                      <Text style={styles.cardSub} numberOfLines={2}>{n.body}</Text>
                    </View>
                    <Pill label={n.category ?? 'General'} tone="neutral" />
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Big({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.bigValue}>{value}</Text>
      <Text style={styles.bigLabel}>{label}</Text>
    </View>
  );
}

function Op({ icon, label, value, tone, bg }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; value: string; tone: string; bg: string }) {
  return (
    <View style={[styles.opCard, Shadows.card]}>
      <View style={[styles.opIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} color={tone} size={22} />
      </View>
      <Text style={styles.opValue}>{value}</Text>
      <Text style={styles.opLabel}>{label}</Text>
    </View>
  );
}

function NavRow({ icon, label, tint, bg, onPress, badge }: { icon: any; label: string; tint: string; bg: string; onPress: () => void; badge?: string }) {
  return (
    <Pressable style={styles.navRow} onPress={onPress}>
      <View style={[styles.navIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} color={tint} size={20} />
      </View>
      <Text style={styles.navLabel}>{label}</Text>
      {badge ? (
        <View style={[styles.navBadge, { backgroundColor: Colors.danger }]}>
          <Text style={styles.navBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <MaterialCommunityIcons name="chevron-right" color={Colors.textMuted} size={20} />
    </Pressable>
  );
}

function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl,
    borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
  },
  emergencyTitle: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  emergencyMsg: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emergencyBtn: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 5 },
  emergencyBtnText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hello: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '800', letterSpacing: 0.9, textTransform: 'uppercase' },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6 },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  bellBadge: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  bigStats: {
    marginTop: Spacing.xl, backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row',
    minHeight: 60, alignItems: 'center', justifyContent: 'center',
  },
  bigSep: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  bigValue: { color: '#fff', fontSize: 18, fontWeight: '900' },
  bigLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 10, fontWeight: '700', marginTop: 4, letterSpacing: 0.4, textAlign: 'center' },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  section: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.md },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.lg, marginBottom: Spacing.md },
  viewAll: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  opGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  opCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, width: '31%' },
  opIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  opValue: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary, marginTop: 8 },
  opLabel: { fontSize: 10, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },
  incIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  time: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', marginTop: 4 },
  navRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 14, gap: 12 },
  navIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  navBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginRight: 4 },
  navBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
});

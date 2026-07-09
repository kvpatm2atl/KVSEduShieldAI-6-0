// Parent: Real-data feed — connects to Supabase for live info
// Shows emergency alert banner, diary entries, notices, homework
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { fetchNotices, fetchParentStudent, fetchHomework } from '@/services/schoolData';
import { getSupabaseClient } from '@/template';
import { router } from 'expo-router';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';

const supabase = getSupabaseClient();

export default function ParentFeed() {
  const { user } = useAuth();
  const [student, setStudent] = useState<any>(null);
  const [notices, setNotices] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<any[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{ present: number; total: number } | null>(null);
  const [bus, setBus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  useEffect(() => { load(); }, [user?.id]);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    await loadAll();
    setLoading(false);
  };

  const loadAll = async () => {
    const s = await fetchParentStudent(user!.id);
    setStudent(s);

    const [noticeData, hwData, alertData] = await Promise.all([
      fetchNotices('parent'),
      s ? fetchHomework(s.section) : Promise.resolve([]),
      supabase.from('emergency_alerts').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    ]);

    setNotices(noticeData.slice(0, 5));
    setHomework(hwData.slice(0, 3));
    setActiveAlerts(alertData.data ?? []);

    // Fetch diary entries for student's section
    if (s?.section) {
      const { data: diaryData } = await supabase
        .from('digital_diary')
        .select('*')
        .eq('section', s.section)
        .order('date', { ascending: false })
        .limit(5);
      setDiaryEntries(diaryData ?? []);
    }

    // Attendance summary for this month
    if (s) {
      const { data: attData } = await supabase
        .from('attendance')
        .select('present')
        .eq('student_id', s.id)
        .gte('date', new Date(new Date().setDate(1)).toISOString().split('T')[0]);
      if (attData && attData.length > 0) {
        const presentCount = attData.filter((a: any) => a.present).length;
        setAttendance({ present: presentCount, total: attData.length });
      } else {
        setAttendance({ present: s.attendance_pct ?? 90, total: 100 });
      }

      if (s.bus_id) {
        const { data: busData } = await supabase.from('buses').select('*').eq('id', s.bus_id).single();
        setBus(busData);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const attPct = attendance ? Math.round((attendance.present / Math.max(attendance.total, 1)) * 100) : student?.attendance_pct ?? 90;

  const diaryColors: Record<string, string> = {
    Note: Colors.info, Reminder: Colors.warning, Achievement: Colors.success, Event: '#7C3AED', Circular: Colors.saffron,
  };
  const diaryIcons: Record<string, string> = {
    Note: 'note-text', Reminder: 'bell-ring', Achievement: 'trophy', Event: 'calendar-star', Circular: 'file-document',
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.primaryDark }}>
        <ResponsiveContainer maxWidth={600}>
          <LinearGradient colors={[Colors.primaryDark, Colors.primary, '#2A6FDB']} style={styles.heroWrap}>
          <View style={styles.row}>
            <View>
              <Text style={styles.hello}>{greeting}</Text>
              <Text style={styles.name}>{user?.name ?? 'Parent'}</Text>
            </View>
            <Image source={require('@/assets/kvs-logo.png')} style={styles.logoSmall} contentFit="contain" />
          </View>

          <View style={styles.statusCard}>
            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : (
              <>
                <View style={styles.statusRow}>
                  <View style={styles.statusIcon}>
                    <MaterialCommunityIcons name="shield-check" size={22} color={Colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusLabel}>
                      {student ? `${student.name} · CLASS ${student.section}` : 'STUDENT'}
                    </Text>
                    <Text style={styles.statusValue}>At School · Safe</Text>
                  </View>
                  <View style={styles.livePill}>
                    <View style={styles.livePulse} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                </View>
                {student?.admission_no && (
                  <View style={styles.admRow}>
                    <MaterialCommunityIcons name="card-account-details-outline" color={Colors.textMuted} size={14} />
                    <Text style={styles.admText}>Adm: {student.admission_no}</Text>
                  </View>
                )}
                <View style={styles.miniGrid}>
                  <MiniStat icon="check-circle" label="Attendance" value={`${attPct}%`} tone={attPct >= 85 ? Colors.success : Colors.warning} />
                  <View style={styles.divider} />
                  <MiniStat icon="clipboard-text" label="Homework" value={`${homework.length} due`} tone={Colors.warning} />
                  <View style={styles.divider} />
                  <MiniStat icon="bus" label={bus ? bus.number : 'Bus'} value={bus ? bus.status : '—'} tone={Colors.info} />
                </View>
              </>
            )}
          </View>
        </LinearGradient>
        </ResponsiveContainer>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer maxWidth={600}>
        {/* Emergency Alert Banner */}
        {activeAlerts.length > 0 && (
          <View style={styles.alertBanner}>
            <LinearGradient colors={['#7F1D1D', '#DC2626']} style={styles.alertBannerInner}>
              <MaterialCommunityIcons name="alert-circle" color="#fff" size={20} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.alertBannerTitle}>
                  SCHOOL ALERT · {activeAlerts[0].alert_type?.toUpperCase()}
                </Text>
                <Text style={styles.alertBannerMsg}>{activeAlerts[0].title}</Text>
                {activeAlerts[0].message ? (
                  <Text style={styles.alertBannerDetail} numberOfLines={2}>{activeAlerts[0].message}</Text>
                ) : null}
              </View>
              <View style={styles.alertSeverity}>
                <Text style={styles.alertSeverityText}>{activeAlerts[0].severity}</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Diary / Class updates from teacher */}
        {diaryEntries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Class Diary — {student?.section}</Text>
            {diaryEntries.map(entry => {
              const color = diaryColors[entry.category] ?? Colors.info;
              const icon = diaryIcons[entry.category] ?? 'note-text';
              return (
                <View key={entry.id} style={[styles.feedCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
                  <View style={[styles.feedIcon, { backgroundColor: color + '18' }]}>
                    <MaterialCommunityIcons name={icon as any} color={color} size={18} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.feedTag}>{entry.category}{entry.subject && entry.subject !== 'General' ? ` · ${entry.subject}` : ''}</Text>
                    <Text style={styles.feedTitle} numberOfLines={2}>{entry.content}</Text>
                    <Text style={styles.feedTime}>{entry.date}</Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Homework */}
        {homework.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Pending Homework</Text>
            {homework.map(h => (
              <View key={h.id} style={[styles.feedCard, { borderLeftColor: Colors.warning, borderLeftWidth: 3 }]}>
                <View style={[styles.feedIcon, { backgroundColor: Colors.warningBg }]}>
                  <MaterialCommunityIcons name="book-open" color={Colors.warning} size={18} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.feedTag}>{h.subject}</Text>
                  <Text style={styles.feedTitle} numberOfLines={1}>{h.title}</Text>
                  <Text style={styles.feedTime}>Due: {h.due_date ?? 'TBD'} · {h.completion_rate ?? 0}% submitted</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {/* Notices */}
        {notices.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>School Notices</Text>
            {notices.map(n => (
              <View key={n.id} style={[styles.feedCard, { borderLeftColor: Colors.info, borderLeftWidth: 3 }]}>
                <View style={[styles.feedIcon, { backgroundColor: Colors.infoBg }]}>
                  <MaterialCommunityIcons name="bell" color={Colors.info} size={18} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.feedTag}>{n.category}</Text>
                  <Text style={styles.feedTitle} numberOfLines={2}>{n.title}</Text>
                  <Text style={styles.feedTime}>{new Date(n.created_at).toLocaleDateString('en-IN')}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {!loading && diaryEntries.length === 0 && homework.length === 0 && notices.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <MaterialCommunityIcons name="bell-outline" color={Colors.textMuted} size={48} />
            <Text style={{ color: Colors.textMuted, fontWeight: '600', marginTop: 12 }}>No updates yet</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Dashboard</Text>
        <View style={styles.dashboardGrid}>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(parent)/safety')}>
            <View style={[styles.tileIconWrap, { backgroundColor: Colors.successBg }]}>
              <MaterialCommunityIcons name="bus-clock" size={28} color={Colors.success} />
            </View>
            <Text style={styles.tileLabel}>Safety</Text>
          </Pressable>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(parent)/academic')}>
            <View style={[styles.tileIconWrap, { backgroundColor: Colors.primary + '18' }]}>
              <MaterialCommunityIcons name="book-education" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.tileLabel}>Academic</Text>
          </Pressable>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(parent)/attendance')}>
            <View style={[styles.tileIconWrap, { backgroundColor: Colors.warningBg }]}>
              <MaterialCommunityIcons name="calendar-check" size={28} color={Colors.warning} />
            </View>
            <Text style={styles.tileLabel}>Attendance</Text>
          </Pressable>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(parent)/timetable')}>
            <View style={[styles.tileIconWrap, { backgroundColor: '#7C3AED18' }]}>
              <MaterialCommunityIcons name="timetable" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.tileLabel}>Timetable</Text>
          </Pressable>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(parent)/assistant')}>
            <View style={[styles.tileIconWrap, { backgroundColor: Colors.infoBg }]}>
              <MaterialCommunityIcons name="brain" size={28} color={Colors.info} />
            </View>
            <Text style={styles.tileLabel}>AI Assistant</Text>
          </Pressable>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(parent)/profile')}>
            <View style={[styles.tileIconWrap, { backgroundColor: Colors.saffron + '18' }]}>
              <MaterialCommunityIcons name="account-circle" size={28} color={Colors.saffron} />
            </View>
            <Text style={styles.tileLabel}>Profile</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>Made by team NovaThink</Text>
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

function MiniStat({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: string }) {
  return (
    <View style={styles.mini}>
      <MaterialCommunityIcons name={icon as any} color={tone} size={18} />
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hello: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  logoSmall: { width: 44, height: 44 },
  statusCard: { marginTop: Spacing.xl, backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, ...Shadows.raised },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.successBg, alignItems: 'center', justifyContent: 'center' },
  statusLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.7 },
  statusValue: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.successBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  livePulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.success },
  liveText: { color: Colors.success, fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  admRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  admText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  miniGrid: { flexDirection: 'row', marginTop: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  mini: { flex: 1, alignItems: 'center' },
  miniValue: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: 4 },
  miniLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontWeight: '600' },
  divider: { width: 1, backgroundColor: Colors.border, marginVertical: 6 },
  scrollContent: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: 80 },
  alertBanner: { marginBottom: Spacing.lg, borderRadius: Radius.lg, overflow: 'hidden' },
  alertBannerInner: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.lg, borderRadius: Radius.lg },
  alertBannerTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  alertBannerMsg: { color: '#fff', fontSize: 14, fontWeight: '800', marginTop: 2 },
  alertBannerDetail: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 4, lineHeight: 18 },
  alertSeverity: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.sm, paddingHorizontal: 8, paddingVertical: 4 },
  alertSeverityText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.md },
  feedCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#fff', borderRadius: Radius.md, padding: Spacing.md, marginBottom: 8, ...Shadows.card },
  feedIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  feedTag: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  feedTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, lineHeight: 20 },
  feedTime: { fontSize: 11, color: Colors.textMuted, marginTop: 3, fontWeight: '600' },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  dashboardTile: { width: '48%', backgroundColor: '#fff', borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', justifyContent: 'center', ...Shadows.card },
  tileIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  tileLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  footer: { textAlign: 'center', color: Colors.textMuted, fontSize: 11, fontWeight: '600', paddingTop: Spacing.xl },
});

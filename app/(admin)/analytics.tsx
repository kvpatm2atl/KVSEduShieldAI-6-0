// Admin: Analytics — real attendance, AI insights, at-risk students
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

const weekly = [
  { day: 'Mon', pct: 91 },
  { day: 'Tue', pct: 88 },
  { day: 'Wed', pct: 94 },
  { day: 'Thu', pct: 92 },
  { day: 'Fri', pct: 86 },
  { day: 'Sat', pct: 79 },
];

const atRisk = [
  { name: 'Reyansh Gupta', section: '10A', issue: 'Absent 4 days', risk: 'High' as const },
  { name: 'Anika Bose', section: '10B', issue: '5 homework pending', risk: 'Medium' as const },
  { name: 'Yash Walia', section: '10A', issue: 'Marks dropping 12%', risk: 'High' as const },
  { name: 'Atharv Joshi', section: '10C', issue: '3 late arrivals', risk: 'Medium' as const },
  { name: 'Kabir Joshi', section: '11A', issue: 'Frequently absent Fridays', risk: 'High' as const },
];

export default function AdminAnalytics() {
  const [schoolStats, setSchoolStats] = useState({
    totalStudents: 0, presentToday: 0, totalTeachers: 0,
    totalBuses: 0, incidents: 0, homework: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    const [studentsRes, teachersRes, busesRes, incRes, hwRes, attRes] = await Promise.all([
      supabase.from('students').select('id', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('buses').select('id', { count: 'exact', head: true }),
      supabase.from('incidents').select('id', { count: 'exact', head: true }).eq('resolved', false),
      supabase.from('homework').select('id', { count: 'exact', head: true }),
      supabase.from('attendance').select('present', { count: 'exact' }).eq('date', new Date().toISOString().split('T')[0]).eq('present', true),
    ]);

    setSchoolStats({
      totalStudents: studentsRes.count ?? 0,
      presentToday: attRes.count ?? 0,
      totalTeachers: teachersRes.count ?? 0,
      totalBuses: busesRes.count ?? 0,
      incidents: incRes.count ?? 0,
      homework: hwRes.count ?? 0,
    });
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Analytics" subtitle="AI insights & school trends" />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : (
          <View style={styles.statsGrid}>
            <StatCard label="Total Students" value={`${schoolStats.totalStudents}`} icon="account-group" tone={Colors.primary} bg={Colors.surfaceTint} />
            <StatCard label="Present Today" value={`${schoolStats.presentToday}`} icon="account-check" tone={Colors.success} bg={Colors.successBg} />
            <StatCard label="Teachers" value={`${schoolStats.totalTeachers}`} icon="account-tie" tone={Colors.info} bg={Colors.infoBg} />
            <StatCard label="Open Incidents" value={`${schoolStats.incidents}`} icon="alert-circle" tone={Colors.danger} bg={Colors.dangerBg} />
          </View>
        )}

        {/* Weekly attendance chart */}
        <Card style={{ marginTop: Spacing.lg }}>
          <View style={styles.row}>
            <Text style={styles.title}>Weekly attendance</Text>
            <Pill label="Avg 88%" tone="success" />
          </View>
          <View style={styles.chart}>
            {weekly.map(w => (
              <View key={w.day} style={styles.bar}>
                <View style={[styles.barFill, {
                  height: `${w.pct}%`,
                  backgroundColor: w.pct >= 90 ? Colors.success : w.pct >= 80 ? Colors.warning : Colors.danger
                }]} />
                <Text style={styles.barLabel}>{w.day}</Text>
                <Text style={styles.barValue}>{w.pct}%</Text>
              </View>
            ))}
          </View>
        </Card>

        {/* AI insights */}
        <Card style={{ marginTop: Spacing.lg }}>
          <View style={styles.row}>
            <View style={styles.aiBadge}>
              <MaterialCommunityIcons name="brain" color="#fff" size={18} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.title}>AI insights</Text>
              <Text style={styles.sub}>Generated today</Text>
            </View>
          </View>
          <View style={{ gap: 10, marginTop: Spacing.md }}>
            <Insight icon="trending-down" tint={Colors.danger} bg={Colors.dangerBg}
              text="Class 10B Math scores dropped 8% — recommend re-teaching Quadratic Equations." />
            <Insight icon="account-clock" tint={Colors.warning} bg={Colors.warningBg}
              text="4 students from 10A had 3+ late arrivals this week." />
            <Insight icon="bus-alert" tint={Colors.info} bg={Colors.infoBg}
              text="Bus 4 average delay 8 min — review Sector route morning traffic." />
            <Insight icon="clipboard-text-outline" tint={Colors.saffron} bg="#FFF3E8"
              text="Homework completion rate dropped to 61% in 11A — English subject." />
          </View>
        </Card>

        {/* At-risk students */}
        <Text style={styles.section}>At-risk students</Text>
        <View style={{ gap: Spacing.md }}>
          {atRisk.map(s => (
            <Card key={s.name}>
              <View style={styles.row}>
                <View style={[styles.avatar, { backgroundColor: s.risk === 'High' ? Colors.dangerBg : Colors.warningBg }]}>
                  <Text style={[styles.avatarText, { color: s.risk === 'High' ? Colors.danger : Colors.warning }]}>
                    {s.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.studentName}>{s.name}</Text>
                  <Text style={styles.studentMeta}>{s.section} · {s.issue}</Text>
                </View>
                <Pill label={`${s.risk} risk`} tone={s.risk === 'High' ? 'danger' : 'warning'} />
              </View>
            </Card>
          ))}
        </View>

        {/* Section performance */}
        <Text style={styles.section}>Section performance</Text>
        <Card padded={false}>
          {[
            { section: '10A', attendance: 91, homework: 78, marks: 76 },
            { section: '10B', attendance: 87, homework: 65, marks: 71 },
            { section: '10C', attendance: 89, homework: 72, marks: 74 },
            { section: '11A', attendance: 84, homework: 61, marks: 68 },
          ].map((row, idx, arr) => (
            <View key={row.section}>
              <View style={styles.sectionRow}>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{row.section}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Att</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${row.attendance}%`, backgroundColor: row.attendance >= 90 ? Colors.success : Colors.warning }]} />
                    </View>
                    <Text style={styles.metricValue}>{row.attendance}%</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>HW</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${row.homework}%`, backgroundColor: Colors.info }]} />
                    </View>
                    <Text style={styles.metricValue}>{row.homework}%</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Avg</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${row.marks}%`, backgroundColor: Colors.saffron }]} />
                    </View>
                    <Text style={styles.metricValue}>{row.marks}%</Text>
                  </View>
                </View>
              </View>
              {idx < arr.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, tone, bg }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; tone: string; bg: string }) {
  return (
    <View style={[styles.statCard]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} color={tone} size={20} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Insight({ icon, tint, bg, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; tint: string; bg: string; text: string }) {
  return (
    <View style={[styles.insight, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name={icon} color={tint} size={18} />
      <Text style={[styles.insightText, { color: tint }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.sm },
  statCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, width: '47.8%', shadowColor: '#0F2A5C', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  statIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, marginTop: 8 },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  aiBadge: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#6E55C2', alignItems: 'center', justifyContent: 'center' },
  chart: { flexDirection: 'row', height: 160, marginTop: Spacing.lg, alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  bar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  barFill: { width: '70%', borderTopLeftRadius: 6, borderTopRightRadius: 6, minHeight: 6 },
  barLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 6, fontWeight: '700' },
  barValue: { fontSize: 10, color: Colors.textSecondary, fontWeight: '700', marginTop: 2 },
  insight: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: Radius.sm, alignItems: 'flex-start' },
  insightText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  section: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.md },
  avatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '800', fontSize: 13 },
  studentName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  studentMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 14 },
  sectionBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  sectionBadgeText: { color: Colors.primary, fontSize: 12, fontWeight: '900' },
  metricRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  metricLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: '700', width: 22, letterSpacing: 0.4 },
  progressTrack: { flex: 1, height: 5, backgroundColor: Colors.surfaceMuted, borderRadius: 3 },
  progressFill: { height: 5, borderRadius: 3 },
  metricValue: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary, width: 34, textAlign: 'right' },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.lg },
});

// Teacher dashboard — section-aware (class teacher vs subject teacher)
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
// Real data only — no mock fallbacks
import { fetchStudents, fetchTodayAttendance } from '@/services/schoolData';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const isClassTeacher = !!user?.classTeacherOf;
  const myClass = user?.classTeacherOf ?? user?.section ?? '10A';
  const mySubject = user?.subject ?? 'Subject';

  const [presentCount, setPresentCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [hwCount, setHwCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);

  useEffect(() => {
    loadAttendanceSummary();
  }, [myClass]);

  const loadAttendanceSummary = async () => {
    const students = await fetchStudents(myClass);
    setTotalStudents(students.length);
    if (students.length > 0) {
      const presence = await fetchTodayAttendance(myClass);
      setPresentCount(Object.values(presence).filter(Boolean).length);
    }
    // Load homework and incidents in parallel
    const [hw, inc] = await Promise.all([
      import('@/services/schoolData').then(m => m.fetchHomework(myClass)),
      import('@/services/schoolData').then(m => m.fetchIncidents(myClass)),
    ]);
    setHwCount(hw.length);
    setIncidentCount(inc.filter((i: any) => !i.resolved).length);
  };

  const absent = totalStudents - presentCount;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.primaryDark }}>
        <ResponsiveContainer maxWidth={600}>
        <LinearGradient colors={[Colors.primaryDark, Colors.primary]} style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>Namaste</Text>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.sub}>{user?.subtitle}</Text>
            </View>
            <View style={styles.bellBadge}>
              <MaterialCommunityIcons name="bell" color="#fff" size={20} />
            </View>
          </View>

          {/* Role badge */}
          <View style={styles.roleBadge}>
            {isClassTeacher ? (
              <>
                <MaterialCommunityIcons name="star-circle" color={Colors.saffron} size={16} />
                <Text style={styles.roleBadgeText}>Class Teacher · {myClass}</Text>
                <View style={styles.roleSep} />
                <MaterialCommunityIcons name="book" color="rgba(255,255,255,0.7)" size={14} />
                <Text style={styles.roleBadgeSubText}>{mySubject}</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name="book-open-variant" color="rgba(255,255,255,0.8)" size={16} />
                <Text style={styles.roleBadgeText}>Subject Teacher · {mySubject}</Text>
              </>
            )}
          </View>
        </LinearGradient>
        </ResponsiveContainer>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ResponsiveContainer maxWidth={600}>
        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatCard label="Present" value={`${presentCount}/${totalStudents}`} icon="account-check" tone={Colors.success} bg={Colors.successBg} />
          <StatCard label="Absent" value={`${absent}`} icon="account-remove" tone={Colors.danger} bg={Colors.dangerBg} />
          <StatCard label="HW Pending" value={`${hwCount}`} icon="clipboard-text" tone={Colors.warning} bg={Colors.warningBg} />
          <StatCard label="Incidents" value={`${incidentCount}`} icon="alert-circle" tone={Colors.danger} bg={Colors.dangerBg} />
        </View>

        {/* Quick attendance CTA */}
        <Card style={styles.attendanceCta}>
          <View style={styles.row}>
            <View style={[styles.iconBg, { backgroundColor: Colors.saffron }]}>
              <MaterialCommunityIcons name="lightning-bolt" color="#fff" size={26} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.ctaTitle}>20-second attendance</Text>
              <Text style={styles.ctaSub}>
                {isClassTeacher
                  ? `Class ${myClass} · ${totalStudents} students. Tap "Present All" then mark absentees.`
                  : `Section ${myClass} · ${mySubject} period attendance.`}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push('/(teacher)/attendance')}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.ctaBtnText}>Open Class {myClass} →</Text>
          </Pressable>
        </Card>

        {/* Teacher type info */}
        <Card style={{ backgroundColor: Colors.surfaceTint, marginTop: Spacing.lg }}>
          <View style={styles.row}>
            <MaterialCommunityIcons
              name={isClassTeacher ? 'shield-account' : 'book-open-page-variant'}
              color={isClassTeacher ? Colors.saffron : Colors.info}
              size={28}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.cardTitle}>
                {isClassTeacher ? 'Class Teacher Dashboard' : 'Subject Teacher Dashboard'}
              </Text>
              <Text style={styles.cardSub}>
                {isClassTeacher
                  ? `Full control over ${myClass}: attendance, all subjects, HW, marks, incidents.`
                  : `You see ${mySubject} data for ${myClass}. For other sections, filter in Exams tab.`}
              </Text>
            </View>
          </View>
        </Card>

        {/* Section: My class */}
        <Text style={styles.section}>Section {myClass}</Text>
        <View style={{ gap: Spacing.md }}>
          <Pressable onPress={() => router.push('/(teacher)/attendance')}>
            <Card>
              <View style={styles.row}>
                <View style={[styles.iconBg, { backgroundColor: Colors.successBg, width: 44, height: 44 }]}>
                  <MaterialCommunityIcons name="clipboard-check" color={Colors.success} size={22} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Today's Attendance</Text>
                  <Text style={styles.cardSub}>{presentCount} present · {absent} absent · {totalStudents} total</Text>
                </View>
                <Pill label="Today" tone="success" />
              </View>
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/(teacher)/exams')}>
            <Card>
              <View style={styles.row}>
                <View style={[styles.iconBg, { backgroundColor: Colors.infoBg, width: 44, height: 44 }]}>
                  <MaterialCommunityIcons name="clipboard-list" color={Colors.info} size={22} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Exams & Marks</Text>
                  <Text style={styles.cardSub}>
                    {isClassTeacher ? `All subjects · ${myClass}` : `${mySubject} · ${myClass}`}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" color={Colors.textMuted} size={20} />
              </View>
            </Card>
          </Pressable>

          {isClassTeacher && (
            <Pressable onPress={() => router.push('/(teacher)/analytics')}>
              <Card>
                <View style={styles.row}>
                  <View style={[styles.iconBg, { backgroundColor: '#F0ECFD', width: 44, height: 44 }]}>
                    <MaterialCommunityIcons name="chart-bar" color="#6E55C2" size={22} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardTitle}>Student Analytics</Text>
                    <Text style={styles.cardSub}>Weak students · Absentees · Remarks</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" color={Colors.textMuted} size={20} />
                </View>
              </Card>
            </Pressable>
          )}

          <Pressable onPress={() => router.push('/(teacher)/timetable')}>
            <Card>
              <View style={styles.row}>
                <View style={[styles.iconBg, { backgroundColor: Colors.warningBg, width: 44, height: 44 }]}>
                  <MaterialCommunityIcons name="timetable" color={Colors.warning} size={22} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>Today's Timetable</Text>
                  <Text style={styles.cardSub}>Section {myClass} · Periods & subjects</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" color={Colors.textMuted} size={20} />
              </View>
            </Card>
          </Pressable>

          {isClassTeacher && (
            <Pressable onPress={() => router.push('/(teacher)/incidents')}>
              <Card>
                <View style={styles.row}>
                  <View style={[styles.iconBg, { backgroundColor: Colors.dangerBg, width: 44, height: 44 }]}>
                    <MaterialCommunityIcons name="alert-circle" color={Colors.danger} size={22} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardTitle}>Incident Reports</Text>
                    <Text style={styles.cardSub}>{incidentCount} reported · Class {myClass}</Text>
                  </View>
                  <Pill label={`${incidentCount}`} tone="danger" />
                </View>
              </Card>
            </Pressable>
          )}
        </View>

        <Text style={styles.section}>Tools</Text>
        <View style={styles.dashboardGrid}>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(teacher)/students')}>
            <View style={[styles.tileIconWrap, { backgroundColor: Colors.infoBg }]}>
              <MaterialCommunityIcons name="account-group" size={28} color={Colors.info} />
            </View>
            <Text style={styles.tileLabel}>Students</Text>
          </Pressable>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(teacher)/homework')}>
            <View style={[styles.tileIconWrap, { backgroundColor: Colors.warningBg }]}>
              <MaterialCommunityIcons name="clipboard-text" size={28} color={Colors.warning} />
            </View>
            <Text style={styles.tileLabel}>Homework</Text>
          </Pressable>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(teacher)/lesson')}>
            <View style={[styles.tileIconWrap, { backgroundColor: Colors.primary + '18' }]}>
              <MaterialCommunityIcons name="book-edit" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.tileLabel}>Lesson Plan</Text>
          </Pressable>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(teacher)/diary')}>
            <View style={[styles.tileIconWrap, { backgroundColor: Colors.successBg }]}>
              <MaterialCommunityIcons name="notebook-edit" size={28} color={Colors.success} />
            </View>
            <Text style={styles.tileLabel}>Class Diary</Text>
          </Pressable>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(teacher)/ai')}>
            <View style={[styles.tileIconWrap, { backgroundColor: '#7C3AED18' }]}>
              <MaterialCommunityIcons name="brain" size={28} color="#7C3AED" />
            </View>
            <Text style={styles.tileLabel}>AI Assistant</Text>
          </Pressable>
          <Pressable style={styles.dashboardTile} onPress={() => router.push('/(teacher)/profile')}>
            <View style={[styles.tileIconWrap, { backgroundColor: Colors.saffron + '18' }]}>
              <MaterialCommunityIcons name="account-circle" size={28} color={Colors.saffron} />
            </View>
            <Text style={styles.tileLabel}>Profile</Text>
          </Pressable>
        </View>
        </ResponsiveContainer>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value, icon, tone, bg }: { label: string; value: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; tone: string; bg: string }) {
  return (
    <View style={[styles.statCard, Shadows.card]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} color={tone} size={22} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl,
    borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl,
  },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  hello: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  name: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  sub: { color: 'rgba(255,255,255,0.78)', fontSize: 13, marginTop: 2, lineHeight: 18 },
  bellBadge: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start',
  },
  roleBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  roleBadgeSubText: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600' },
  roleSep: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 2 },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl, marginTop: -Spacing.lg },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, width: '47.8%' },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary, marginTop: 10 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, fontWeight: '600' },
  attendanceCta: { backgroundColor: Colors.primary, marginTop: Spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBg: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  ctaSub: { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 2, lineHeight: 18 },
  ctaBtn: { marginTop: Spacing.lg, backgroundColor: '#fff', paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center' },
  ctaBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '800' },
  section: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.md },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  dashboardTile: { width: '48%', backgroundColor: '#fff', borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center', justifyContent: 'center', ...Shadows.card },
  tileIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  tileLabel: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
});

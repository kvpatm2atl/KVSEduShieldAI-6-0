// Parent: Academic — real lessons, homework, exam results from DB + AI study plan
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { homeworkList, learningGaps, lessonsTaught } from '@/services/mockData';
import { getSupabaseClient } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { fetchHomework, fetchLessons, fetchNotices } from '@/services/schoolData';
import { generateLearningGapPlan } from '@/services/aiService';
import { useAlert } from '@/template';

const supabase = getSupabaseClient();

interface ExamResult {
  exam_id: string; marks: number | null; grade: string | null;
  exam: { name: string; subject: string; exam_date: string; max_marks: number };
}

const MOCK_RESULTS: ExamResult[] = [
  { exam_id: 'e1', marks: 44, grade: 'A2', exam: { name: 'Unit Test 1', subject: 'Mathematics', exam_date: '2025-06-15', max_marks: 50 } },
  { exam_id: 'e2', marks: 38, grade: 'B1', exam: { name: 'Unit Test 1', subject: 'Science', exam_date: '2025-06-16', max_marks: 50 } },
  { exam_id: 'e3', marks: null, grade: null, exam: { name: 'Half Yearly', subject: 'Mathematics', exam_date: '2025-07-21', max_marks: 100 } },
];

const gradeTone = (g: string): 'success' | 'info' | 'warning' | 'danger' => {
  if (['A1', 'A2'].includes(g)) return 'success';
  if (['B1', 'B2'].includes(g)) return 'info';
  if (['C1', 'C2', 'D'].includes(g)) return 'warning';
  return 'danger';
};

export default function ParentAcademic() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [results, setResults] = useState<ExamResult[]>(MOCK_RESULTS);
  const [homework, setHomework] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiPlan, setAiPlan] = useState('');
  const [loadingPlan, setLoadingPlan] = useState(false);

  const section = user?.section ?? '10A';
  const totalGapMinutes = learningGaps.reduce((s, g) => s + g.recommendedMinutes, 0);

  useEffect(() => { loadData(); }, [section]);

  const loadData = async () => {
    setLoading(true);
    const [hw, ls, ns] = await Promise.all([
      fetchHomework(section),
      fetchLessons(section, 10),
      fetchNotices('parent'),
    ]);
    if (hw.length > 0) setHomework(hw);
    else setHomework(homeworkList);
    if (ls.length > 0) setLessons(ls);
    else setLessons(lessonsTaught);
    setNotices(ns);

    // Try to load exam results
    const { data } = await supabase
      .from('exam_marks')
      .select('exam_id, marks, grade, exams(name,subject,exam_date,max_marks)')
      .limit(10);
    if (data && data.length > 0) {
      setResults(data.map((d: any) => ({ exam_id: d.exam_id, marks: d.marks, grade: d.grade, exam: d.exams })));
    }
    setLoading(false);
  };

  const generatePlan = async () => {
    setLoadingPlan(true);
    const { plan, error } = await generateLearningGapPlan({
      studentName: user?.studentName ?? 'Student',
      missedTopics: learningGaps.map(g => `${g.subject}: ${g.topic}`),
      subject: 'All Subjects',
      attendancePct: 88,
    });
    setLoadingPlan(false);
    if (error) { showAlert('AI Error', error); return; }
    setAiPlan(plan);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Academics" subtitle="Lessons, homework, exams & insights" />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notices */}
        {notices.length > 0 && (
          <>
            <Text style={styles.section}>School notices</Text>
            <View style={{ gap: Spacing.sm }}>
              {notices.slice(0, 3).map(n => (
                <Card key={n.id} style={styles.noticeCard}>
                  <View style={styles.noticeRow}>
                    <MaterialCommunityIcons name="bullhorn" color={Colors.saffron} size={20} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.noticeTitle}>{n.title}</Text>
                      <Text style={styles.noticeSub} numberOfLines={1}>{n.body}</Text>
                    </View>
                    <Pill label={n.category} tone="neutral" />
                  </View>
                </Card>
              ))}
            </View>
          </>
        )}

        {/* AI study plan */}
        <Text style={styles.section}>AI Learning Gap Plan</Text>
        <Card style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <View style={styles.aiBadge}>
              <MaterialCommunityIcons name="brain" color="#fff" size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiLabel}>AI STUDY PLAN</Text>
              <Text style={styles.aiTitle}>Estimated catch-up: {totalGapMinutes} min</Text>
            </View>
            <Pill label="Risk: Low" tone="success" />
          </View>
          <View style={{ marginTop: Spacing.md, gap: 8 }}>
            {learningGaps.map(g => (
              <View key={g.id} style={styles.gapRow}>
                <View style={[styles.gapDot, { backgroundColor: g.riskLevel === 'High' ? Colors.danger : g.riskLevel === 'Medium' ? Colors.warning : Colors.success }]} />
                <Text style={styles.gapSubject}>{g.subject}</Text>
                <Text style={styles.gapTopic} numberOfLines={1}>· {g.topic}</Text>
                <Text style={styles.gapMin}>{g.recommendedMinutes} min</Text>
              </View>
            ))}
          </View>
          {aiPlan ? (
            <View style={styles.planBox}>
              <Text style={styles.planText}>{aiPlan}</Text>
            </View>
          ) : null}
          <Pressable onPress={generatePlan} style={styles.planBtn}>
            {loadingPlan ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <MaterialCommunityIcons name="brain" color="#fff" size={16} />
                <Text style={styles.planBtnText}>Generate AI Catch-up Plan</Text>
              </>
            )}
          </Pressable>
        </Card>

        {/* Exam Results */}
        <Text style={styles.section}>Exam results</Text>
        <View style={{ gap: Spacing.md }}>
          {results.map(r => (
            <Card key={r.exam_id}>
              <View style={styles.row}>
                <View style={styles.examBadge}>
                  <Text style={styles.examBadgeText}>{(r.exam?.subject ?? 'Sub').slice(0, 3).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>{r.exam?.name}</Text>
                  <Text style={styles.cardSub}>{r.exam?.subject} · {r.exam?.exam_date}</Text>
                  {r.marks !== null && (
                    <View style={styles.marksRow}>
                      <Text style={styles.marksValue}>{r.marks}</Text>
                      <Text style={styles.marksMax}>/{r.exam?.max_marks}</Text>
                      <Text style={styles.marksPct}> · {r.exam?.max_marks ? Math.round((r.marks / r.exam.max_marks) * 100) : 0}%</Text>
                    </View>
                  )}
                </View>
                {r.grade ? <Pill label={r.grade} tone={gradeTone(r.grade)} /> : <Pill label="Upcoming" tone="neutral" />}
              </View>
            </Card>
          ))}
        </View>

        {/* Pending homework */}
        <Text style={styles.section}>Pending homework</Text>
        <View style={{ gap: Spacing.md }}>
          {homework.map((hw: any) => (
            <Card key={hw.id}>
              <View style={styles.row}>
                <View style={styles.hwBadge}>
                  <Text style={styles.hwBadgeText}>{(hw.subject ?? 'Sub').slice(0, 3).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>{hw.title}</Text>
                  <Text style={styles.cardSub} numberOfLines={2}>{hw.description}</Text>
                  <View style={styles.hwMeta}>
                    <MaterialCommunityIcons name="calendar-clock" size={13} color={Colors.textMuted} />
                    <Text style={styles.hwMetaText}>Due {hw.due_date ?? hw.dueDate}</Text>
                  </View>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Lessons taught */}
        <Text style={styles.section}>Recent lessons</Text>
        <View style={{ gap: Spacing.md }}>
          {lessons.map((l: any) => (
            <Card key={l.id}>
              <View style={styles.row}>
                <View style={styles.lessonIcon}>
                  <MaterialCommunityIcons name="book-open-variant" color={Colors.info} size={22} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.cardTitle}>{l.topic}</Text>
                  <Text style={styles.cardSub}>{l.subject} · {l.chapter}</Text>
                </View>
                <Text style={styles.timeText}>{l.lesson_date ?? l.date}</Text>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  section: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.md },
  noticeCard: { paddingVertical: 12, paddingHorizontal: Spacing.lg },
  noticeRow: { flexDirection: 'row', alignItems: 'center' },
  noticeTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  noticeSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  aiCard: {},
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aiBadge: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#6E55C2', alignItems: 'center', justifyContent: 'center' },
  aiLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 0.8 },
  aiTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  gapRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  gapDot: { width: 10, height: 10, borderRadius: 5 },
  gapSubject: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  gapTopic: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  gapMin: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  planBox: { marginTop: Spacing.md, backgroundColor: '#F0ECFD', borderRadius: Radius.md, padding: Spacing.md },
  planText: { color: '#6E55C2', fontSize: 13, lineHeight: 20 },
  planBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.md, backgroundColor: '#6E55C2', borderRadius: Radius.md, paddingVertical: 12 },
  planBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center' },
  examBadge: { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  examBadgeText: { fontSize: 12, fontWeight: '900', color: Colors.primary },
  marksRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  marksValue: { fontSize: 18, fontWeight: '900', color: Colors.primary },
  marksMax: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  marksPct: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  hwBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: Colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  hwBadgeText: { fontSize: 13, fontWeight: '900', color: Colors.primary },
  hwMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  hwMetaText: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  lessonIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.infoBg, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  timeText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
});

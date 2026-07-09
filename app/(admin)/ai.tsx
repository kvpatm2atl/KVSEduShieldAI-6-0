// Admin: AI Insights — substitute teacher, at-risk prediction, analytics
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { suggestSubstitute, predictAtRiskStudents } from '@/services/aiService';
import { TEACHERS } from '@/services/mockData';
import { useAlert } from '@/template';

const AT_RISK_MOCK = [
  { name: 'Reyansh Gupta', section: '10A', attendancePct: 61, pendingHW: 4 },
  { name: 'Anika Bose', section: '10B', attendancePct: 72, pendingHW: 5 },
  { name: 'Yash Walia', section: '10A', attendancePct: 68, pendingHW: 3 },
  { name: 'Atharv Joshi', section: '10C', attendancePct: 74, pendingHW: 2 },
  { name: 'Kabir Joshi', section: '11A', attendancePct: 65, pendingHW: 6 },
];

const ABSENT_TEACHERS = TEACHERS.slice(0, 4).map(t => t.name);
const AVAILABLE_TEACHERS = TEACHERS.slice(4, 12).map(t => t.name);

export default function AdminAI() {
  const { showAlert } = useAlert();
  const [subsLoading, setSubsLoading] = useState(false);
  const [substituteResult, setSubstituteResult] = useState('');
  const [absentTeacher, setAbsentTeacher] = useState(ABSENT_TEACHERS[0]);

  const [riskLoading, setRiskLoading] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState('');

  const runSubstitute = async () => {
    setSubsLoading(true);
    const { suggestion, error } = await suggestSubstitute({
      absentTeacher,
      subject: TEACHERS.find(t => t.name === absentTeacher)?.subject ?? 'Unknown',
      section: '10C',
      period: 3,
      availableTeachers: AVAILABLE_TEACHERS,
    });
    setSubsLoading(false);
    if (error) { showAlert('AI Error', error); return; }
    setSubstituteResult(suggestion);
  };

  const runRiskPrediction = async () => {
    setRiskLoading(true);
    const { analysis, error } = await predictAtRiskStudents(AT_RISK_MOCK);
    setRiskLoading(false);
    if (error) { showAlert('AI Error', error); return; }
    setRiskAnalysis(analysis);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="AI Insights" subtitle="Powered by KVS EduShield AI" />
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Substitute teacher */}
        <Card>
          <View style={styles.aiHeader}>
            <View style={styles.aiBadge}>
              <MaterialCommunityIcons name="account-switch" color="#fff" size={22} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.aiTitle}>AI Substitute Teacher</Text>
              <Text style={styles.aiSub}>Auto-suggest substitute based on subject & workload</Text>
            </View>
          </View>

          <Text style={styles.label}>Absent teacher</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ABSENT_TEACHERS.map(t => (
                <Pressable key={t} onPress={() => setAbsentTeacher(t)} style={[styles.chip, absentTeacher === t && styles.chipActive]}>
                  <Text style={[styles.chipText, absentTeacher === t && styles.chipTextActive]} numberOfLines={1}>{t.split(' ')[0]}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Pressable onPress={runSubstitute} style={styles.runBtn}>
            {subsLoading ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <MaterialCommunityIcons name="brain" color="#fff" size={18} />
                <Text style={styles.runBtnText}>Suggest Substitute</Text>
              </>
            )}
          </Pressable>

          {substituteResult ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{substituteResult}</Text>
            </View>
          ) : null}
        </Card>

        {/* At-risk prediction */}
        <Card style={{ marginTop: Spacing.xl }}>
          <View style={styles.aiHeader}>
            <View style={[styles.aiBadge, { backgroundColor: Colors.danger }]}>
              <MaterialCommunityIcons name="chart-timeline-variant-shimmer" color="#fff" size={22} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.aiTitle}>AI Risk Prediction</Text>
              <Text style={styles.aiSub}>Identify at-risk students before issues escalate</Text>
            </View>
          </View>

          <Text style={styles.label}>Flagged students</Text>
          <View style={{ gap: 6, marginTop: 8 }}>
            {AT_RISK_MOCK.map(s => (
              <View key={s.name} style={styles.studentRisk}>
                <View style={[styles.riskDot, { backgroundColor: s.attendancePct < 70 ? Colors.danger : Colors.warning }]} />
                <Text style={styles.studentRiskName}>{s.name}</Text>
                <Text style={styles.studentRiskMeta}>{s.section} · {s.attendancePct}% att · {s.pendingHW} HW</Text>
              </View>
            ))}
          </View>

          <Pressable onPress={runRiskPrediction} style={[styles.runBtn, { backgroundColor: Colors.danger }]}>
            {riskLoading ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <MaterialCommunityIcons name="brain" color="#fff" size={18} />
                <Text style={styles.runBtnText}>Run AI Analysis</Text>
              </>
            )}
          </Pressable>

          {riskAnalysis ? (
            <View style={[styles.resultBox, { backgroundColor: Colors.dangerBg }]}>
              <Text style={[styles.resultText, { color: Colors.danger }]}>{riskAnalysis}</Text>
            </View>
          ) : null}
        </Card>

        {/* AI capabilities summary */}
        <Text style={styles.section}>AI capabilities</Text>
        <View style={{ gap: Spacing.sm }}>
          {[
            { icon: 'brain', title: 'Learning Gap Detection', sub: 'Auto-detects missed lessons and generates catch-up plans', color: '#6E55C2' },
            { icon: 'account-switch', title: 'Substitute Suggestion', sub: 'AI picks best available teacher by subject and workload', color: Colors.primary },
            { icon: 'chart-timeline-variant-shimmer', title: 'Risk Prediction', sub: 'Predicts academic decline before it happens', color: Colors.danger },
            { icon: 'message-text', title: 'Parent AI Assistant', sub: 'Answers parent questions about their child', color: Colors.success },
            { icon: 'book-education', title: 'Teacher AI Assistant', sub: 'Helps generate homework, lesson plans, exam questions', color: Colors.info },
          ].map(item => (
            <Card key={item.title} style={styles.capabilityCard}>
              <View style={styles.capabilityRow}>
                <View style={[styles.capabilityIcon, { backgroundColor: item.color + '18' }]}>
                  <MaterialCommunityIcons name={item.icon as any} color={item.color} size={22} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.capabilityTitle}>{item.title}</Text>
                  <Text style={styles.capabilitySub}>{item.sub}</Text>
                </View>
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
  aiHeader: { flexDirection: 'row', alignItems: 'center' },
  aiBadge: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#6E55C2', alignItems: 'center', justifyContent: 'center' },
  aiTitle: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  aiSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase', marginTop: Spacing.lg },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6E55C2', borderRadius: Radius.md, paddingVertical: 14, marginTop: Spacing.lg },
  runBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  resultBox: { marginTop: Spacing.md, backgroundColor: '#F0ECFD', borderRadius: Radius.md, padding: Spacing.md },
  resultText: { color: '#6E55C2', fontSize: 14, lineHeight: 21, fontWeight: '500' },
  section: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.md },
  studentRisk: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  riskDot: { width: 10, height: 10, borderRadius: 5 },
  studentRiskName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, width: 140 },
  studentRiskMeta: { flex: 1, fontSize: 12, color: Colors.textSecondary },
  capabilityCard: { paddingVertical: 12, paddingHorizontal: Spacing.lg },
  capabilityRow: { flexDirection: 'row', alignItems: 'center' },
  capabilityIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  capabilityTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  capabilitySub: { fontSize: 13, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
});

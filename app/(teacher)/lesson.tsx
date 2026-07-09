// Teacher: Lesson Tracker — voice command + AI parsing + real DB
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import {
  Animated, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useAlert } from '@/template';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { fetchLessons, saveLesson } from '@/services/schoolData';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

const ALL_SUBJECTS = ['Mathematics', 'Science', 'English', 'Hindi', 'Social Science',
  'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Economics', 'Work Education', 'Art Education'];

// ─── AI-powered voice parsing via edge function ──────────────────────────────
async function parseVoiceWithAI(text: string): Promise<{ subject: string; chapter: string; topic: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('onspace-ai-chat', {
      body: { mode: 'parse_lesson', voiceText: text },
    });
    if (error || !data?.parsed) throw new Error('AI parse failed');
    return data.parsed;
  } catch {
    // Fallback: basic regex parsing
    return parseVoiceFallback(text);
  }
}

function parseVoiceFallback(text: string): { subject: string; chapter: string; topic: string } {
  const lower = text.toLowerCase();
  let foundSubject = '';
  for (const s of ALL_SUBJECTS) {
    if (lower.includes(s.toLowerCase())) { foundSubject = s; break; }
  }
  const chapterMatch = text.match(/chapter\s+(\w[\w\s]*?)(?:\s+topic|\s+on|\s+about|,|$)/i);
  const chapter = chapterMatch ? chapterMatch[1].trim() : '';
  const topicMatch = text.match(/(?:topic|about|on|covered?|taught?)\s+([\w\s,]+)/i);
  const topic = topicMatch ? topicMatch[1].trim() : chapter ? text.replace(/chapter\s+\w[\w\s]*/i, '').trim() : text.trim();
  return {
    subject: foundSubject,
    chapter: chapter || topic.split(' ').slice(0, 3).join(' '),
    topic: topic || text.trim(),
  };
}

const VOICE_EXAMPLES = [
  'Chapter Triangles topic Similarity Theorem Mathematics',
  'Acids and Bases pH Scale and indicators Science',
  'Laws of Motion Newton Second Law Physics',
  'Chapter First Flight topic A Letter to God English',
  'Python lists and dictionaries Computer Science',
];

const subjectColor = (sub: string): string => {
  const map: Record<string, string> = {
    'Mathematics': '#2A6FDB', 'Science': '#1FA971', 'English': '#E0414C',
    'Hindi': '#E8A317', 'Social Science': '#6E55C2', 'Physics': '#0891b2',
    'Chemistry': '#d97706', 'Biology': '#059669', 'Computer Science': '#7c3aed',
  };
  return map[sub] ?? Colors.primary;
};

export default function TeacherLesson() {
  const { showAlert } = useAlert();
  const { user } = useAuth();

  // Support multi-section: pick from teacher's teaching sections
  const allSections = user?.teachingSections?.length
    ? user.teachingSections
    : (user?.classTeacherOf ? [user.classTeacherOf] : ['10A']);

  const [selectedSection, setSelectedSection] = useState(allSections[0]);
  const mySubject = user?.subject ?? ALL_SUBJECTS[0];

  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [subject, setSubject] = useState(mySubject);
  const [chapter, setChapter] = useState('');
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => { loadLessons(); }, [selectedSection]);
  useEffect(() => {
    Audio.requestPermissionsAsync().then(({ status }) => setHasMicPermission(status === 'granted'));
    return () => { stopListening(); };
  }, []);

  const loadLessons = async () => {
    setLoading(true);
    const data = await fetchLessons(selectedSection, 30);
    setLessons(data);
    setLoading(false);
  };

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  const startListening = async () => {
    if (!hasMicPermission) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Microphone needed', 'Allow microphone access to use voice input.');
        return;
      }
      setHasMicPermission(true);
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsListening(true);
      setVoiceText('');
      startPulse();
    } catch {
      showAlert('Error', 'Could not start recording.');
    }
  };

  const stopListening = async () => {
    stopPulse();
    setIsListening(false);
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch { }
    recordingRef.current = null;
  };

  const handleVoiceToggle = async () => {
    if (isListening) {
      await stopListening();
      setShowVoiceModal(true);
      setVoiceText('');
    } else {
      await startListening();
    }
  };

  // Apply AI-parsed voice to form
  const applyVoiceWithAI = async () => {
    if (!voiceText.trim()) { setShowVoiceModal(false); return; }
    setAiParsing(true);
    const parsed = await parseVoiceWithAI(voiceText);
    setAiParsing(false);
    if (parsed.subject) setSubject(parsed.subject);
    if (parsed.chapter) setChapter(parsed.chapter);
    if (parsed.topic) setTopic(parsed.topic);
    setShowVoiceModal(false);
    setShowForm(true);
  };

  const copyPrevious = () => {
    if (!lessons.length) { showAlert('No previous', 'Add your first lesson manually.'); return; }
    const prev = lessons[0];
    setSubject(prev.subject);
    setChapter(prev.chapter);
    setTopic(prev.topic);
    setShowForm(true);
    showAlert('Copied', 'Previous lesson copied. Edit as needed.');
  };

  const submit = async () => {
    if (!chapter.trim() || !topic.trim()) { showAlert('Missing', 'Enter chapter and topic.'); return; }
    setSaving(true);
    const { error } = await saveLesson({
      subject, chapter: chapter.trim(), topic: topic.trim(),
      section: selectedSection, lesson_date: date, taught_by: user?.id,
    });
    setSaving(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Lesson saved', `${subject} · ${topic}`);
    setChapter(''); setTopic('');
    setShowForm(false);
    loadLessons();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Lesson Tracker" subtitle={`${mySubject} · AI-powered voice input`} />
      </SafeAreaView>

      {/* Section selector (multi-section teacher support) */}
      {allSections.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionBar}>
          {allSections.map(sec => (
            <Pressable key={sec} onPress={() => setSelectedSection(sec)}
              style={[styles.sectionChip, selectedSection === sec && styles.sectionChipActive]}>
              <Text style={[styles.sectionChipText, selectedSection === sec && { color: '#fff' }]}>{sec}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Quick actions */}
      <View style={styles.actionRow}>
        <Pressable onPress={() => setShowForm(true)} style={styles.addBtn}>
          <MaterialCommunityIcons name="plus-circle" color={Colors.primary} size={20} />
          <Text style={styles.addBtnText}>Record Lesson</Text>
        </Pressable>
        <Pressable onPress={copyPrevious} style={styles.copyBtn}>
          <MaterialCommunityIcons name="content-copy" color={Colors.info} size={18} />
          <Text style={styles.copyBtnText}>Copy Prev</Text>
        </Pressable>
        <Pressable onPress={handleVoiceToggle} style={[styles.voiceBtn, isListening && styles.voiceBtnActive]}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <MaterialCommunityIcons name={isListening ? 'microphone' : 'microphone-outline'} color={isListening ? '#fff' : Colors.danger} size={20} />
          </Animated.View>
          <Text style={[styles.voiceBtnText, isListening && { color: '#fff' }]}>
            {isListening ? 'Listening…' : 'Voice + AI'}
          </Text>
        </Pressable>
      </View>

      {/* AI badge */}
      <View style={styles.aiBadge}>
        <MaterialCommunityIcons name="brain" color="#7C3AED" size={14} />
        <Text style={styles.aiBadgeText}>Voice → AI → Auto-fill form · OnSpace AI powered</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={lessons}
          keyExtractor={l => l.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={lessons.length > 0 ? <Text style={styles.listHeader}>{lessons.length} lessons · {selectedSection}</Text> : null}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="book-open-variant" color={Colors.textMuted} size={48} />
              <Text style={styles.emptyText}>No lessons yet</Text>
              <Text style={styles.emptySubText}>Tap "Voice + AI" to record naturally</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.lessonCard}>
              <View style={styles.lessonRow}>
                <View style={[styles.subjectBadge, { backgroundColor: subjectColor(item.subject) + '20' }]}>
                  <Text style={[styles.subjectBadgeText, { color: subjectColor(item.subject) }]}>
                    {item.subject.slice(0, 3).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.topicTitle}>{item.topic}</Text>
                  <Text style={styles.chapterText}>{item.chapter} · {item.subject}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.dateText}>{item.lesson_date}</Text>
                  <Pill label={item.section} tone="info" />
                </View>
              </View>
            </Card>
          )}
        />
      )}

      {/* ─── Add Lesson Modal ─── */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Lesson · {selectedSection}</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Pressable onPress={handleVoiceToggle} style={[styles.micInline, isListening && styles.micInlineActive]} hitSlop={8}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <MaterialCommunityIcons name={isListening ? 'microphone' : 'microphone-outline'} color={isListening ? '#fff' : Colors.danger} size={18} />
                  </Animated.View>
                </Pressable>
                <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
                  <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
                </Pressable>
              </View>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <View style={styles.voiceHint}>
                <MaterialCommunityIcons name="brain" color="#7C3AED" size={14} />
                <Text style={styles.voiceHintText}>
                  Tap mic → say "Chapter Triangles topic Similarity Theorem Mathematics" → AI fills form automatically
                </Text>
              </View>

              <Text style={styles.formLabel}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {ALL_SUBJECTS.map(s => (
                    <Pressable key={s} onPress={() => setSubject(s)} style={[styles.chip, subject === s && styles.chipActive]}>
                      <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Chapter</Text>
              <TextInput value={chapter} onChangeText={setChapter} placeholder="e.g. Triangles" placeholderTextColor={Colors.textMuted} style={styles.formInput} />

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Topic covered</Text>
              <TextInput value={topic} onChangeText={setTopic} placeholder="e.g. Similarity Theorem" placeholderTextColor={Colors.textMuted} style={styles.formInput} />

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Date</Text>
              <TextInput value={date} onChangeText={setDate} placeholder={new Date().toISOString().split('T')[0]} placeholderTextColor={Colors.textMuted} style={styles.formInput} />

              <PrimaryButton label="Save Lesson" onPress={submit} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Voice Input Modal ─── */}
      <Modal visible={showVoiceModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowVoiceModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Voice + AI Input</Text>
            <Pressable onPress={() => setShowVoiceModal(false)} hitSlop={12}>
              <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <View style={styles.voiceBanner}>
              <View style={styles.aiIconWrap}>
                <MaterialCommunityIcons name="brain" color="#fff" size={28} />
              </View>
              <Text style={styles.voiceBannerTitle}>AI Lesson Parser</Text>
              <Text style={styles.voiceBannerSub}>
                Type what you said (or will say) — OnSpace AI extracts subject, chapter, and topic automatically.
              </Text>
            </View>

            <Text style={styles.formLabel}>Your lesson description</Text>
            <TextInput
              value={voiceText} onChangeText={setVoiceText}
              placeholder="e.g. Chapter Triangles Similarity Theorem Mathematics"
              placeholderTextColor={Colors.textMuted}
              multiline numberOfLines={3}
              style={[styles.formInput, { minHeight: 90, textAlignVertical: 'top' }]}
              autoFocus
            />

            <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Quick examples</Text>
            <View style={{ gap: 8, marginTop: 8 }}>
              {VOICE_EXAMPLES.map((ex, i) => (
                <Pressable key={i} onPress={() => setVoiceText(ex)} style={styles.exampleChip}>
                  <MaterialCommunityIcons name="lightning-bolt" color={Colors.warning} size={14} />
                  <Text style={styles.exampleText} numberOfLines={2}>{ex}</Text>
                </Pressable>
              ))}
            </View>

            {aiParsing && (
              <View style={styles.parsingBox}>
                <ActivityIndicator color="#7C3AED" size="small" />
                <Text style={styles.parsingText}>AI parsing your lesson details…</Text>
              </View>
            )}

            <PrimaryButton
              label={aiParsing ? 'AI Processing…' : 'Parse with AI & Fill Form'}
              onPress={applyVoiceWithAI}
              loading={aiParsing}
              size="lg"
              style={{ marginTop: Spacing.xl, backgroundColor: '#7C3AED' }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBar: { gap: 8, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  sectionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  sectionChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sectionChipText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.sm, flexWrap: 'wrap' },
  addBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, backgroundColor: Colors.surfaceTint, borderRadius: Radius.md },
  addBtnText: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
  copyBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, backgroundColor: Colors.infoBg, borderRadius: Radius.md },
  copyBtnText: { color: Colors.info, fontSize: 13, fontWeight: '800' },
  voiceBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: 14, backgroundColor: Colors.dangerBg, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.danger + '40' },
  voiceBtnActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  voiceBtnText: { color: Colors.danger, fontSize: 12, fontWeight: '800' },
  micInline: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.danger + '40' },
  micInlineActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: Spacing.xl, marginBottom: Spacing.sm, backgroundColor: '#F5F0FF', borderRadius: Radius.sm, paddingHorizontal: 10, paddingVertical: 6 },
  aiBadgeText: { fontSize: 11, fontWeight: '600', color: '#7C3AED' },
  listHeader: { fontSize: 13, fontWeight: '700', color: Colors.textMuted, marginBottom: Spacing.md },
  list: { padding: Spacing.xl, paddingBottom: 40 },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: Colors.textSecondary },
  emptySubText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  lessonCard: { marginBottom: Spacing.md },
  lessonRow: { flexDirection: 'row', alignItems: 'center' },
  subjectBadge: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subjectBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  topicTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  chapterText: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  dateText: { fontSize: 11, color: Colors.textMuted, fontWeight: '700', marginBottom: 4 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  formInput: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  voiceHint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F5F0FF', borderRadius: Radius.md, padding: 10, marginBottom: Spacing.lg },
  voiceHintText: { flex: 1, fontSize: 12, color: '#7C3AED', fontWeight: '500', lineHeight: 18 },
  voiceBanner: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 10 },
  aiIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' },
  voiceBannerTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  voiceBannerSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 },
  exampleChip: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warningBg, borderRadius: Radius.md, padding: 10 },
  exampleText: { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
  parsingBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F0FF', borderRadius: Radius.md, padding: 12, marginTop: Spacing.lg },
  parsingText: { fontSize: 13, color: '#7C3AED', fontWeight: '600' },
});

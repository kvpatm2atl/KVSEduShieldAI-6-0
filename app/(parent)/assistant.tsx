// Parent AI Assistant — ask questions about child's academics
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { askParentAssistant } from '@/services/aiService';

const QUICK_QUESTIONS = [
  { q: 'Why did my child\'s attendance drop?', icon: 'account-clock' },
  { q: 'Which subject needs most attention?', icon: 'book-alert' },
  { q: 'What homework is pending?', icon: 'clipboard-text-outline' },
  { q: 'How can my child improve performance?', icon: 'chart-line-variant' },
  { q: 'Which chapters were missed?', icon: 'book-remove' },
  { q: 'What is the exam schedule?', icon: 'calendar-check' },
];

interface Message { role: 'user' | 'assistant'; text: string; }

export default function ParentAIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const context = {
    name: user?.studentName ?? 'Student',
    section: user?.section ?? '10A',
    attendancePct: 88,
    pendingHomework: 3,
    recentMarks: 'Mathematics: 82%, Science: 76%',
  };

  const send = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    const { answer, error } = await askParentAssistant(text, context);
    setLoading(false);
    if (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Sorry, I could not process that: ${error}` }]);
      return;
    }
    setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="AI Assistant" subtitle={`About ${user?.studentName ?? 'your child'}`} />
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {messages.length === 0 && (
            <>
              <View style={styles.hero}>
                <View style={styles.badge}>
                  <MaterialCommunityIcons name="brain" color="#fff" size={28} />
                </View>
                <Text style={styles.heroTitle}>KVS AI Parent Assistant</Text>
                <Text style={styles.heroSub}>
                  Ask anything about {user?.studentName ?? "your child"}'s academics, attendance, homework, or performance.
                </Text>
              </View>
              <View style={styles.grid}>
                {QUICK_QUESTIONS.map(q => (
                  <Pressable key={q.q} onPress={() => send(q.q)} style={styles.qCard}>
                    <MaterialCommunityIcons name={q.icon as any} color={Colors.primary} size={22} />
                    <Text style={styles.qText}>{q.q}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {messages.map((msg, idx) => (
            <View key={idx} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubbleCont]}>
              {msg.role === 'assistant' && (
                <View style={styles.aiAvatar}>
                  <MaterialCommunityIcons name="brain" color="#fff" size={14} />
                </View>
              )}
              <View style={[styles.bubbleContent, msg.role === 'user' ? styles.userContent : styles.aiContent]}>
                <Text style={[styles.bubbleText, msg.role === 'user' ? styles.userText : styles.aiText]}>
                  {msg.text}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={[styles.bubble, styles.aiBubbleCont]}>
              <View style={styles.aiAvatar}>
                <MaterialCommunityIcons name="brain" color="#fff" size={14} />
              </View>
              <View style={[styles.bubbleContent, styles.aiContent]}>
                <ActivityIndicator color={Colors.primary} size="small" />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputRow}>
          <TextInput
            value={input} onChangeText={setInput}
            placeholder="Ask about your child…"
            placeholderTextColor={Colors.textMuted}
            style={styles.textInput}
            onSubmitEditing={() => send()}
          />
          <Pressable onPress={() => send()} style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]} disabled={!input.trim() || loading}>
            <MaterialCommunityIcons name="send" color="#fff" size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, paddingBottom: 100, gap: Spacing.sm },
  hero: { alignItems: 'center', paddingVertical: Spacing.xl },
  badge: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#6E55C2', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  heroTitle: { fontSize: 20, fontWeight: '900', color: Colors.textPrimary },
  heroSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 8, maxWidth: 300 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  qCard: { width: '47%', backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, gap: 8, borderWidth: 1, borderColor: Colors.border },
  qText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18 },
  bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userBubble: { justifyContent: 'flex-end' },
  aiBubbleCont: { justifyContent: 'flex-start' },
  aiAvatar: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#6E55C2', alignItems: 'center', justifyContent: 'center' },
  bubbleContent: { maxWidth: '80%', borderRadius: Radius.lg, padding: Spacing.md },
  userContent: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  aiContent: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff', fontWeight: '500' },
  aiText: { color: Colors.textPrimary },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: Spacing.lg, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  textInput: {
    flex: 1, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary,
    borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});

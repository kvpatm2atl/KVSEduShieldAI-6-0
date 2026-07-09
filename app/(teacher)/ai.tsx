// Teacher AI Assistant — Homework generation, lesson planning, student analysis
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { askTeacherAssistant } from '@/services/aiService';

const QUICK_PROMPTS = [
  { icon: 'clipboard-text', label: 'Generate homework', prompt: 'Generate 5 homework questions for the current topic.' },
  { icon: 'book-education', label: 'Lesson plan', prompt: 'Create a 45-minute lesson plan for the current topic.' },
  { icon: 'chart-line', label: 'Weak student tips', prompt: 'How to help weak students catch up in this subject?' },
  { icon: 'help-circle', label: 'Exam questions', prompt: 'Generate 10 objective exam questions with answers.' },
  { icon: 'lightbulb', label: 'Creative activity', prompt: 'Suggest a creative classroom activity for this topic.' },
  { icon: 'account-group', label: 'Group activity', prompt: 'Design a group learning activity for 48 students.' },
];

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

export default function TeacherAIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const mySubject = user?.subject ?? 'Subject';
  const mySection = user?.classTeacherOf ?? user?.section ?? '10A';

  const send = async (prompt?: string) => {
    const text = (prompt ?? input).trim();
    if (!text) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);
    const { result, error } = await askTeacherAssistant(text, {
      subject: mySubject, section: mySection,
    });
    setLoading(false);
    if (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Sorry, I could not process that: ${error}` }]);
      return;
    }
    setMessages(prev => [...prev, { role: 'assistant', text: result }]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="AI Teacher Assistant" subtitle={`${mySubject} · Class ${mySection}`} />
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 && (
            <>
              <View style={styles.aiHero}>
                <View style={styles.aiBadge}>
                  <MaterialCommunityIcons name="brain" color="#fff" size={28} />
                </View>
                <Text style={styles.aiTitle}>KVS EduShield AI</Text>
                <Text style={styles.aiSub}>Your intelligent teaching assistant. Ask anything about {mySubject} or use quick prompts below.</Text>
              </View>
              <Text style={styles.section}>Quick prompts</Text>
              <View style={styles.promptGrid}>
                {QUICK_PROMPTS.map(p => (
                  <Pressable key={p.label} onPress={() => send(p.prompt)} style={styles.promptCard}>
                    <MaterialCommunityIcons name={p.icon as any} color={Colors.primary} size={22} />
                    <Text style={styles.promptLabel}>{p.label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {messages.map((msg, idx) => (
            <View key={idx} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubbleCont]}>
              {msg.role === 'assistant' && (
                <View style={styles.aiAvatarSmall}>
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
              <View style={styles.aiAvatarSmall}>
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
            value={input}
            onChangeText={setInput}
            placeholder="Ask anything about your class…"
            placeholderTextColor={Colors.textMuted}
            style={styles.textInput}
            multiline
            onSubmitEditing={() => send()}
          />
          <Pressable onPress={() => send()} style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]} disabled={!input.trim() || loading}>
            <MaterialCommunityIcons name="send" color="#fff" size={20} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, paddingBottom: 100, gap: Spacing.sm },
  aiHero: { alignItems: 'center', paddingVertical: Spacing.xl },
  aiBadge: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#6E55C2', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  aiTitle: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  aiSub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: 8, maxWidth: 280 },
  section: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm },
  promptGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  promptCard: { width: '47%', backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg, gap: 8, borderWidth: 1, borderColor: Colors.border },
  promptLabel: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  bubble: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userBubble: { justifyContent: 'flex-end' },
  aiBubbleCont: { justifyContent: 'flex-start' },
  aiAvatarSmall: { width: 28, height: 28, borderRadius: 9, backgroundColor: '#6E55C2', alignItems: 'center', justifyContent: 'center' },
  bubbleContent: { maxWidth: '80%', borderRadius: Radius.lg, padding: Spacing.md },
  userContent: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  aiContent: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.border },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userText: { color: '#fff', fontWeight: '500' },
  aiText: { color: Colors.textPrimary, fontWeight: '400' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    padding: Spacing.lg, backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  textInput: {
    flex: 1, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary,
    maxHeight: 100, borderWidth: 1, borderColor: Colors.border,
  },
  sendBtn: { width: 46, height: 46, borderRadius: 14, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});

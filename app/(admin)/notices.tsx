// Admin: Notice Management — Create & broadcast school notices
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useAlert } from '@/template';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { getSupabaseClient } from '@/template';
import { useAuth } from '@/hooks/useAuth';

const supabase = getSupabaseClient();

const CATEGORIES = ['General', 'PTM', 'Exam', 'Safety', 'Circular', 'Emergency'];
const TARGETS = [
  { value: 'all', label: 'All' },
  { value: 'parent', label: 'Parents' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'admin', label: 'Admins' },
];

const categoryTone = (c: string): 'success' | 'info' | 'warning' | 'danger' | 'neutral' => {
  if (c === 'Emergency') return 'danger';
  if (c === 'Exam') return 'warning';
  if (c === 'PTM') return 'info';
  if (c === 'Safety') return 'warning';
  return 'neutral';
};

export default function AdminNotices() {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('General');
  const [targetRole, setTargetRole] = useState('all');

  useEffect(() => { loadNotices(); }, []);

  const loadNotices = async () => {
    setLoading(true);
    const { data } = await supabase.from('notices').select('*').order('created_at', { ascending: false }).limit(30);
    setNotices(data ?? []);
    setLoading(false);
  };

  const submit = async () => {
    if (!title.trim() || !body.trim()) { showAlert('Missing fields', 'Enter title and body.'); return; }
    setSaving(true);
    const { error } = await supabase.from('notices').insert({
      title: title.trim(), body: body.trim(),
      category, target_role: targetRole, created_by: user?.id,
    });
    setSaving(false);
    if (error) { showAlert('Error', error.message); return; }
    showAlert('Notice published', `"${title}" sent to ${targetRole === 'all' ? 'everyone' : targetRole + 's'}`);
    setShowForm(false);
    setTitle(''); setBody(''); setCategory('General'); setTargetRole('all');
    loadNotices();
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Notice Management" subtitle="Broadcast to students, parents, teachers" />
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={n => n.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 80, gap: 8 }}>
              <MaterialCommunityIcons name="bullhorn" color={Colors.textMuted} size={48} />
              <Text style={{ color: Colors.textSecondary, fontSize: 16, fontWeight: '700' }}>No notices yet</Text>
              <Text style={{ color: Colors.textMuted, fontSize: 13 }}>Tap + to broadcast one</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.noticeCard}>
              <View style={styles.noticeRow}>
                <View style={[styles.noticeIcon, { backgroundColor: item.category === 'Emergency' ? Colors.dangerBg : Colors.warningBg }]}>
                  <MaterialCommunityIcons
                    name={item.category === 'Emergency' ? 'alert-octagon' : item.category === 'PTM' ? 'account-group' : 'bullhorn'}
                    color={item.category === 'Emergency' ? Colors.danger : Colors.saffron}
                    size={22}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.noticeTitle}>{item.title}</Text>
                  <Text style={styles.noticeBody} numberOfLines={2}>{item.body}</Text>
                  <View style={styles.noticeMeta}>
                    <Pill label={item.category} tone={categoryTone(item.category)} />
                    <Text style={styles.noticeTime}>
                      {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      <Pressable onPress={() => setShowForm(true)} style={styles.fab}>
        <MaterialCommunityIcons name="plus" color="#fff" size={28} />
      </Pressable>

      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Broadcast Notice</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.chips}>
                {CATEGORIES.map(c => (
                  <Pressable key={c} onPress={() => setCategory(c)} style={[styles.chip, category === c && styles.chipActive, c === 'Emergency' && styles.emergencyChip, c === 'Emergency' && category === c && styles.emergencyChipActive]}>
                    <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Target Audience</Text>
              <View style={styles.chips}>
                {TARGETS.map(t => (
                  <Pressable key={t.value} onPress={() => setTargetRole(t.value)} style={[styles.chip, targetRole === t.value && styles.chipActive]}>
                    <Text style={[styles.chipText, targetRole === t.value && styles.chipTextActive]}>{t.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Title</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder="Notice title" placeholderTextColor={Colors.textMuted} style={styles.formInput} />

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Body</Text>
              <TextInput
                value={body} onChangeText={setBody}
                placeholder="Full notice content…" placeholderTextColor={Colors.textMuted}
                style={[styles.formInput, { height: 120, textAlignVertical: 'top', paddingTop: 12 }]}
                multiline
              />

              <PrimaryButton label={saving ? 'Publishing…' : 'Publish Notice'} onPress={submit} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: Spacing.xl, paddingBottom: 100 },
  noticeCard: {},
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  noticeIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  noticeBody: { fontSize: 13, color: Colors.textSecondary, marginTop: 4, lineHeight: 18 },
  noticeMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  noticeTime: { fontSize: 11, color: Colors.textMuted, fontWeight: '700' },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  formInput: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  emergencyChip: { borderColor: Colors.danger },
  emergencyChipActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
});

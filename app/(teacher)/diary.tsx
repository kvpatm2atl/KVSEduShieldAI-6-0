// Teacher: Digital Class Diary — daily notes, reminders, achievements per section
// Parents see these entries on their dashboard
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { useAlert } from '@/template';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

const CATEGORIES = ['Note', 'Reminder', 'Achievement', 'Event', 'Circular'] as const;
type Category = typeof CATEGORIES[number];

const SUBJECTS = ['General', 'Mathematics', 'Science', 'English', 'Hindi', 'Social Science',
  'Physics', 'Chemistry', 'Biology', 'Computer Science'];

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; icon: string }> = {
  Note:        { bg: Colors.infoBg,     text: Colors.info,    icon: 'note-text' },
  Reminder:    { bg: Colors.warningBg,  text: Colors.warning, icon: 'bell-ring' },
  Achievement: { bg: Colors.successBg,  text: Colors.success, icon: 'trophy' },
  Event:       { bg: '#F5F0FF',         text: '#7C3AED',      icon: 'calendar-star' },
  Circular:    { bg: '#FFE9DC',         text: Colors.saffron, icon: 'file-document' },
};

export default function TeacherDiary() {
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const allSections = user?.teachingSections?.length
    ? user.teachingSections
    : (user?.classTeacherOf ? [user.classTeacherOf] : ['10A']);
  const [selectedSection, setSelectedSection] = useState(allSections[0]);

  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editEntry, setEditEntry] = useState<any>(null);

  // Form state
  const [category, setCategory] = useState<Category>('Note');
  const [subject, setSubject] = useState('General');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { loadEntries(); }, [selectedSection]);

  const loadEntries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('digital_diary')
      .select('*')
      .eq('section', selectedSection)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);
    setEntries(data ?? []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditEntry(null);
    setCategory('Note');
    setSubject('General');
    setContent('');
    setDate(new Date().toISOString().split('T')[0]);
    setShowForm(true);
  };

  const openEdit = (entry: any) => {
    setEditEntry(entry);
    setCategory(entry.category ?? 'Note');
    setSubject(entry.subject ?? 'General');
    setContent(entry.content ?? '');
    setDate(entry.date ?? new Date().toISOString().split('T')[0]);
    setShowForm(true);
  };

  const save = async () => {
    if (!content.trim()) { showAlert('Required', 'Enter diary content.'); return; }
    setSaving(true);
    const payload = {
      section: selectedSection,
      date,
      subject,
      content: content.trim(),
      category,
      created_by: user?.id ?? null,
    };

    if (editEntry) {
      const { error } = await supabase.from('digital_diary').update(payload).eq('id', editEntry.id);
      if (error) { showAlert('Error', error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('digital_diary').insert(payload);
      if (error) { showAlert('Error', error.message); setSaving(false); return; }
    }

    setSaving(false);
    showAlert('Saved', `Diary entry added for class ${selectedSection}. Parents will see this.`);
    setShowForm(false);
    setContent('');
    loadEntries();
  };

  const deleteEntry = (entry: any) => {
    showAlert('Delete entry?', 'This diary entry will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('digital_diary').delete().eq('id', entry.id);
        loadEntries();
      }},
    ]);
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const grouped = entries.reduce((acc: Record<string, any[]>, entry: any) => {
    const key = entry.date ?? 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const groupedList: { date: string; items: any[] }[] = Object.entries(grouped).map(([date, items]) => ({ date, items }));

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Class Diary" subtitle={`Section ${selectedSection} · Shared with parents`} />
      </SafeAreaView>

      {/* Section selector */}
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

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <MaterialCommunityIcons name="information" color={Colors.info} size={14} />
        <Text style={styles.infoBannerText}>
          All entries are visible to parents of {selectedSection} students. Use for homework reminders, achievements, and important notes.
        </Text>
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catBar}>
        {CATEGORIES.map(cat => {
          const c = CATEGORY_COLORS[cat];
          return (
            <Pressable key={cat} style={[styles.catChip, { backgroundColor: c.bg, borderColor: c.text + '40' }]}>
              <MaterialCommunityIcons name={c.icon as any} color={c.text} size={13} />
              <Text style={[styles.catChipText, { color: c.text }]}>{cat}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groupedList}
          keyExtractor={g => g.date}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="notebook-edit" color={Colors.textMuted} size={52} />
              <Text style={styles.emptyTitle}>No diary entries yet</Text>
              <Text style={styles.emptySubtitle}>Add notes, reminders, and achievements{'\n'}that parents can see on their dashboard.</Text>
              <Pressable onPress={openAdd} style={styles.emptyAddBtn}>
                <MaterialCommunityIcons name="plus" color="#fff" size={18} />
                <Text style={styles.emptyAddText}>Add First Entry</Text>
              </Pressable>
            </View>
          }
          renderItem={({ item: group }) => (
            <View>
              <View style={styles.dateHeader}>
                <View style={styles.dateLine} />
                <Text style={styles.dateLabel}>{formatDate(group.date)}</Text>
                <View style={styles.dateLine} />
              </View>
              {group.items.map((entry: any) => {
                const c = CATEGORY_COLORS[entry.category as Category] ?? CATEGORY_COLORS.Note;
                return (
                  <Card key={entry.id} style={[styles.entryCard, { borderLeftColor: c.text, borderLeftWidth: 4 }]}>
                    <View style={styles.entryHeader}>
                      <View style={[styles.catBadge, { backgroundColor: c.bg }]}>
                        <MaterialCommunityIcons name={c.icon as any} color={c.text} size={14} />
                        <Text style={[styles.catBadgeText, { color: c.text }]}>{entry.category}</Text>
                      </View>
                      {entry.subject && entry.subject !== 'General' ? (
                        <Pill label={entry.subject} tone="info" />
                      ) : null}
                      <View style={{ flex: 1 }} />
                      <Pressable onPress={() => openEdit(entry)} hitSlop={10} style={styles.editBtn}>
                        <MaterialCommunityIcons name="pencil" color={Colors.textMuted} size={16} />
                      </Pressable>
                      <Pressable onPress={() => deleteEntry(entry)} hitSlop={10} style={styles.deleteBtn}>
                        <MaterialCommunityIcons name="delete-outline" color={Colors.danger} size={16} />
                      </Pressable>
                    </View>
                    <Text style={styles.entryContent}>{entry.content}</Text>
                  </Card>
                );
              })}
            </View>
          )}
        />
      )}

      {/* FAB */}
      <Pressable onPress={openAdd} style={styles.fab}>
        <MaterialCommunityIcons name="plus" color="#fff" size={28} />
      </Pressable>

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editEntry ? 'Edit Entry' : `Diary · ${selectedSection}`}</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.chips}>
                {CATEGORIES.map(cat => {
                  const c = CATEGORY_COLORS[cat];
                  return (
                    <Pressable key={cat} onPress={() => setCategory(cat)}
                      style={[styles.chip, category === cat && { backgroundColor: c.text, borderColor: c.text }]}>
                      <MaterialCommunityIcons name={c.icon as any} color={category === cat ? '#fff' : c.text} size={14} />
                      <Text style={[styles.chipText, category === cat && { color: '#fff' }]}>{cat}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Subject (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {SUBJECTS.map(s => (
                    <Pressable key={s} onPress={() => setSubject(s)}
                      style={[styles.chip, subject === s && styles.chipActive]}>
                      <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Date</Text>
              <TextInput value={date} onChangeText={setDate}
                placeholder={new Date().toISOString().split('T')[0]}
                placeholderTextColor={Colors.textMuted}
                style={styles.formInput} />

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Content *</Text>
              <TextInput
                value={content}
                onChangeText={setContent}
                placeholder={
                  category === 'Note' ? "e.g. Today we covered Chapter Triangles. Tomorrow - bring protractor." :
                  category === 'Reminder' ? "e.g. PTM on Saturday 10 AM. All parents must attend." :
                  category === 'Achievement' ? "e.g. ARCHANA S topped in Unit Test with 49/50!" :
                  category === 'Event' ? "e.g. Science exhibition next Friday. Prepare project." :
                  "e.g. School circular: Half-yearly exam schedule enclosed."
                }
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={5}
                style={[styles.formInput, { minHeight: 120, textAlignVertical: 'top' }]}
                autoFocus
              />

              <View style={styles.previewBox}>
                <MaterialCommunityIcons name="eye-outline" color={Colors.textMuted} size={14} />
                <Text style={styles.previewText}>
                  Parents will see: "{category} · {subject !== 'General' ? subject + ' · ' : ''}{formatDate(date)}"
                </Text>
              </View>

              <PrimaryButton
                label={saving ? 'Saving…' : editEntry ? 'Update Entry' : 'Add to Diary'}
                onPress={save}
                loading={saving}
                size="lg"
                style={{ marginTop: Spacing.xl }}
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionBar: { gap: 8, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm },
  sectionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  sectionChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sectionChipText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.infoBg, marginHorizontal: Spacing.xl, borderRadius: Radius.md, padding: 10, marginBottom: 4 },
  infoBannerText: { flex: 1, color: Colors.info, fontSize: 12, fontWeight: '500', lineHeight: 17 },
  catBar: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1.5 },
  catChipText: { fontSize: 12, fontWeight: '700' },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 100, paddingTop: Spacing.sm },
  dateHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: Spacing.md },
  dateLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dateLabel: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, paddingHorizontal: 8 },
  entryCard: { marginBottom: Spacing.sm, padding: 0, overflow: 'hidden' },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingBottom: 8 },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
  editBtn: { padding: 4 },
  deleteBtn: { padding: 4 },
  entryContent: { fontSize: 14, color: Colors.textPrimary, lineHeight: 21, fontWeight: '500', paddingHorizontal: 12, paddingBottom: 12 },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: Colors.textSecondary },
  emptySubtitle: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  emptyAddText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  formInput: { marginTop: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  previewBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.sm, padding: 10, marginTop: Spacing.lg },
  previewText: { flex: 1, fontSize: 12, color: Colors.textMuted, fontWeight: '500', fontStyle: 'italic' },
});

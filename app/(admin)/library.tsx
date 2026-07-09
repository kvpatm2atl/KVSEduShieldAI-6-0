// Admin: Library Management — Books, Issues, Returns, Fines
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
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAlert } from '@/template';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export default function AdminLibrary() {
  const { showAlert } = useAlert();
  const [activeTab, setActiveTab] = useState<'books' | 'issues'>('books');
  const [books, setBooks] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showBookForm, setShowBookForm] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Book form
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookIsbn, setBookIsbn] = useState('');
  const [bookCopies, setBookCopies] = useState('1');
  const [bookCategory, setBookCategory] = useState('General');

  // Issue form
  const [issueBookId, setIssueBookId] = useState('');
  const [issueStudentSearch, setIssueStudentSearch] = useState('');
  const [foundStudents, setFoundStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [searchingStudent, setSearchingStudent] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const [booksRes, issuesRes] = await Promise.all([
      supabase.from('library_books').select('*').order('title'),
      supabase.from('library_issues')
        .select('*, library_books(title, author), students(name, section, admission_no)')
        .order('issued_date', { ascending: false })
        .limit(50),
    ]);
    setBooks(booksRes.data ?? []);
    setIssues(issuesRes.data ?? []);
    setLoading(false);
  };

  const addBook = async () => {
    if (!bookTitle.trim()) { showAlert('Missing', 'Enter book title.'); return; }
    setSaving(true);
    const copies = parseInt(bookCopies) || 1;
    const { error } = await supabase.from('library_books').insert({
      title: bookTitle.trim(), author: bookAuthor.trim(),
      isbn: bookIsbn.trim() || undefined,
      category: bookCategory, total_copies: copies, available_copies: copies,
    });
    setSaving(false);
    if (error) { showAlert('Error', error.message); return; }
    showAlert('Added', `${bookTitle} added to library.`);
    setShowBookForm(false);
    setBookTitle(''); setBookAuthor(''); setBookIsbn(''); setBookCopies('1');
    loadAll();
  };

  const searchStudents = async (q: string) => {
    setIssueStudentSearch(q);
    setSelectedStudent(null);
    if (q.trim().length < 2) { setFoundStudents([]); return; }
    setSearchingStudent(true);
    const { data } = await supabase.from('students').select('id, name, section, admission_no')
      .or(`name.ilike.%${q}%,admission_no.ilike.%${q}%`).limit(5);
    setFoundStudents(data ?? []);
    setSearchingStudent(false);
  };

  const issueBook = async () => {
    if (!issueBookId) { showAlert('Select book', 'Tap a book to issue.'); return; }
    if (!selectedStudent) { showAlert('Select student', 'Search and select a student.'); return; }
    setSaving(true);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    const { error } = await supabase.from('library_issues').insert({
      book_id: issueBookId,
      student_id: selectedStudent.id,
      issued_date: new Date().toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      status: 'Issued',
    });
    if (!error) {
      // Decrease available_copies
      const book = books.find(b => b.id === issueBookId);
      if (book && book.available_copies > 0) {
        await supabase.from('library_books').update({ available_copies: book.available_copies - 1 }).eq('id', issueBookId);
      }
    }
    setSaving(false);
    if (error) { showAlert('Error', error.message); return; }
    showAlert('Issued', `Book issued to ${selectedStudent.name}. Due: ${dueDate.toLocaleDateString('en-IN')}`);
    setShowIssueForm(false);
    setSelectedStudent(null); setIssueStudentSearch(''); setIssueBookId('');
    loadAll();
  };

  const returnBook = async (issue: any) => {
    showAlert('Return Book?', `Mark "${issue.library_books?.title}" as returned?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Return', onPress: async () => {
        const today = new Date().toISOString().split('T')[0];
        const dueDate = new Date(issue.due_date);
        const returnDate = new Date();
        const overdueDays = Math.max(0, Math.floor((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
        const fine = overdueDays * 2; // ₹2/day

        await supabase.from('library_issues').update({
          returned_date: today, status: 'Returned', fine,
        }).eq('id', issue.id);

        // Restore available_copies
        const book = books.find(b => b.id === issue.book_id);
        if (book) {
          await supabase.from('library_books').update({ available_copies: Math.min(book.total_copies, book.available_copies + 1) }).eq('id', issue.book_id);
        }
        loadAll();
        if (fine > 0) {
          showAlert('Returned with fine', `Overdue by ${overdueDays} days. Fine: ₹${fine}`);
        } else {
          showAlert('Returned', 'Book returned successfully.');
        }
      }},
    ]);
  };

  const filteredBooks = books.filter(b => !search || b.title.toLowerCase().includes(search.toLowerCase()) || (b.author ?? '').toLowerCase().includes(search.toLowerCase()));
  const filteredIssues = issues.filter(i => i.status !== 'Returned');

  const CATEGORIES = ['General', 'Textbook', 'Fiction', 'Biography', 'Science', 'History', 'Reference', 'Magazine'];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Library" subtitle={`${books.length} books · ${filteredIssues.length} issued`} />
      </SafeAreaView>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable onPress={() => setActiveTab('books')} style={[styles.tab, activeTab === 'books' && styles.tabActive]}>
          <MaterialCommunityIcons name="bookshelf" color={activeTab === 'books' ? '#fff' : Colors.textSecondary} size={16} />
          <Text style={[styles.tabText, activeTab === 'books' && styles.tabTextActive]}>Books ({books.length})</Text>
        </Pressable>
        <Pressable onPress={() => setActiveTab('issues')} style={[styles.tab, activeTab === 'issues' && styles.tabActive]}>
          <MaterialCommunityIcons name="book-arrow-right" color={activeTab === 'issues' ? '#fff' : Colors.textSecondary} size={16} />
          <Text style={[styles.tabText, activeTab === 'issues' && styles.tabTextActive]}>Issued ({filteredIssues.length})</Text>
        </Pressable>
      </View>

      {/* Search (books tab) */}
      {activeTab === 'books' && (
        <View style={styles.searchWrap}>
          <MaterialCommunityIcons name="magnify" color={Colors.textMuted} size={18} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search books…" placeholderTextColor={Colors.textMuted} style={styles.searchInput} />
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : activeTab === 'books' ? (
        <FlatList
          data={filteredBooks}
          keyExtractor={b => b.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <MaterialCommunityIcons name="bookshelf" color={Colors.textMuted} size={48} />
              <Text style={styles.emptyText}>No books in library</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card>
              <View style={styles.row}>
                <View style={[styles.bookIcon, { backgroundColor: item.available_copies > 0 ? Colors.successBg : Colors.dangerBg }]}>
                  <MaterialCommunityIcons name="book-open-variant" color={item.available_copies > 0 ? Colors.success : Colors.danger} size={24} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.bookMeta}>{item.author ?? 'Unknown'} · {item.category}</Text>
                  {item.isbn ? <Text style={styles.bookIsbn}>ISBN: {item.isbn}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Pill label={item.available_copies > 0 ? `${item.available_copies} avail` : 'All issued'} tone={item.available_copies > 0 ? 'success' : 'danger'} />
                  <Text style={styles.copiesText}>{item.total_copies} total</Text>
                </View>
              </View>
              {item.available_copies > 0 && (
                <Pressable onPress={() => { setIssueBookId(item.id); setShowIssueForm(true); }} style={styles.issueBtn}>
                  <MaterialCommunityIcons name="book-arrow-right" color={Colors.primary} size={14} />
                  <Text style={styles.issueBtnText}>Issue Book</Text>
                </Pressable>
              )}
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      ) : (
        <FlatList
          data={issues}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <MaterialCommunityIcons name="book-check" color={Colors.textMuted} size={48} />
              <Text style={styles.emptyText}>No active issues</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOverdue = item.status === 'Issued' && new Date(item.due_date) < new Date();
            return (
              <Card style={[isOverdue && { borderLeftWidth: 4, borderLeftColor: Colors.danger }]}>
                <View style={styles.row}>
                  <View style={[styles.bookIcon, { backgroundColor: item.status === 'Returned' ? Colors.successBg : isOverdue ? Colors.dangerBg : Colors.infoBg }]}>
                    <MaterialCommunityIcons
                      name={item.status === 'Returned' ? 'check-circle' : isOverdue ? 'alert-circle' : 'book-open'}
                      color={item.status === 'Returned' ? Colors.success : isOverdue ? Colors.danger : Colors.info}
                      size={22}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.bookTitle} numberOfLines={1}>{item.library_books?.title ?? '—'}</Text>
                    <Text style={styles.bookMeta}>{item.students?.name} · {item.students?.section}</Text>
                    <Text style={styles.bookIsbn}>
                      Issued: {item.issued_date} · Due: {item.due_date}
                      {item.fine > 0 ? ` · Fine: ₹${item.fine}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Pill label={item.status} tone={item.status === 'Returned' ? 'success' : isOverdue ? 'danger' : 'info'} />
                    {isOverdue ? <Pill label="Overdue" tone="danger" /> : null}
                  </View>
                </View>
                {item.status === 'Issued' && (
                  <Pressable onPress={() => returnBook(item)} style={[styles.issueBtn, { backgroundColor: Colors.successBg }]}>
                    <MaterialCommunityIcons name="book-arrow-left" color={Colors.success} size={14} />
                    <Text style={[styles.issueBtnText, { color: Colors.success }]}>Mark Returned</Text>
                  </Pressable>
                )}
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      <Pressable onPress={() => setShowBookForm(true)} style={styles.fab}>
        <MaterialCommunityIcons name="plus" color="#fff" size={28} />
      </Pressable>

      {/* Add Book Modal */}
      <Modal visible={showBookForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBookForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Book</Text>
              <Pressable onPress={() => setShowBookForm(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {[
                { label: 'Book Title', val: bookTitle, set: setBookTitle },
                { label: 'Author', val: bookAuthor, set: setBookAuthor },
                { label: 'ISBN', val: bookIsbn, set: setBookIsbn },
                { label: 'No. of Copies', val: bookCopies, set: setBookCopies, kb: 'number-pad' },
              ].map(f => (
                <View key={f.label} style={{ marginTop: 14 }}>
                  <Text style={styles.formLabel}>{f.label}</Text>
                  <TextInput value={f.val} onChangeText={f.set} keyboardType={(f as any).kb ?? 'default'} style={styles.formInput} />
                </View>
              ))}
              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Category</Text>
              <View style={styles.chips}>
                {CATEGORIES.map(c => (
                  <Pressable key={c} onPress={() => setBookCategory(c)} style={[styles.chip, bookCategory === c && styles.chipActive]}>
                    <Text style={[styles.chipText, bookCategory === c && styles.chipTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
              <PrimaryButton label={saving ? 'Adding…' : 'Add Book'} onPress={addBook} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Issue Book Modal */}
      <Modal visible={showIssueForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowIssueForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issue Book</Text>
              <Pressable onPress={() => setShowIssueForm(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {issueBookId && (
                <View style={styles.selectedBook}>
                  <MaterialCommunityIcons name="book-open-variant" color={Colors.primary} size={20} />
                  <Text style={styles.selectedBookTitle} numberOfLines={1}>
                    {books.find(b => b.id === issueBookId)?.title ?? 'Selected Book'}
                  </Text>
                </View>
              )}
              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Search Student</Text>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="account-search" color={Colors.textMuted} size={20} />
                <TextInput value={issueStudentSearch} onChangeText={searchStudents} placeholder="Name or admission no…" placeholderTextColor={Colors.textMuted} style={styles.textInput} />
                {searchingStudent ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
              </View>
              {foundStudents.length > 0 && !selectedStudent && (
                <View style={styles.studentResults}>
                  {foundStudents.map(s => (
                    <Pressable key={s.id} onPress={() => { setSelectedStudent(s); setIssueStudentSearch(s.name); setFoundStudents([]); }} style={styles.studentRow}>
                      <MaterialCommunityIcons name="account" color={Colors.primary} size={16} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={styles.studentName}>{s.name}</Text>
                        <Text style={styles.studentMeta}>{s.section} · {s.admission_no}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
              {selectedStudent && (
                <View style={styles.selectedStudent}>
                  <MaterialCommunityIcons name="check-circle" color={Colors.success} size={18} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.studentName}>{selectedStudent.name}</Text>
                    <Text style={styles.studentMeta}>{selectedStudent.section} · {selectedStudent.admission_no}</Text>
                  </View>
                </View>
              )}
              <PrimaryButton label={saving ? 'Issuing…' : 'Issue Book (14 days)'} onPress={issueBook} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const CATEGORIES = ['General', 'Textbook', 'Fiction', 'Biography', 'Science', 'History', 'Reference', 'Magazine'];

const styles = StyleSheet.create({
  tabRow: { flexDirection: 'row', marginHorizontal: Spacing.xl, marginVertical: Spacing.md, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.xl, marginBottom: 8, backgroundColor: '#fff', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  bookIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bookTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  bookMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  bookIsbn: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  copiesText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  issueBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: Colors.surfaceTint, borderRadius: Radius.sm, marginTop: 10, alignSelf: 'flex-start' },
  issueBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  emptyText: { fontSize: 15, color: Colors.textMuted, fontWeight: '600', marginTop: 12 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  formInput: { marginTop: 6, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  selectedBook: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceTint, borderRadius: Radius.md, padding: 12, borderWidth: 1.5, borderColor: Colors.primary + '30' },
  selectedBookTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: Colors.primary },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: Colors.border, marginTop: 8 },
  textInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  studentResults: { backgroundColor: '#fff', borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, marginTop: 6, overflow: 'hidden' },
  studentRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  studentName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  studentMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  selectedStudent: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.successBg, borderRadius: Radius.md, padding: 12, marginTop: 8, borderWidth: 1.5, borderColor: Colors.success + '50' },
});

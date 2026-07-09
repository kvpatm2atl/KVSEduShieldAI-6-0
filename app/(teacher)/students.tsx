// Class Teacher: Student List + Bulk CSV Import + Full Edit
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchStudents, updateStudentDetails, updateStudentRollOrders,
  generateStudentSampleCSV, generateStudentDetailCSV, StudentRow
} from '@/services/schoolData';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export default function TeacherStudents() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const section = user?.classTeacherOf ?? user?.section ?? '10A';
  const isClassTeacher = !!(user?.classTeacherOf);

  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Bulk import state
  const [showBulk, setShowBulk] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const [form, setForm] = useState<Partial<StudentRow>>({});

  useEffect(() => { load(); }, [section]);

  const load = async () => {
    setLoading(true);
    const data = await fetchStudents(section);
    setStudents(data);
    setLoading(false);
  };

  const openEdit = (s: StudentRow) => {
    setEditStudent(s);
    setForm({ ...s });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editStudent) return;
    setSaving(true);
    const { error } = await updateStudentDetails(editStudent.id, {
      name: form.name, roll_no: form.roll_no, pen_no: form.pen_no,
      aadhar: form.aadhar, uid: form.uid, address: form.address,
      email: form.email, phone: form.phone,
      date_of_admission: form.date_of_admission, date_of_birth: form.date_of_birth,
      gender: form.gender, blood_group: form.blood_group,
      father_name: form.father_name, mother_name: form.mother_name,
      emergency_contact: form.emergency_contact,
    });
    setSaving(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Saved', 'Student details updated successfully.');
    setShowEdit(false);
    load();
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newList = [...students];
    [newList[index - 1], newList[index]] = [newList[index], newList[index - 1]];
    setStudents(newList);
  };

  const moveDown = (index: number) => {
    if (index === students.length - 1) return;
    const newList = [...students];
    [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
    setStudents(newList);
  };

  const saveOrder = async () => {
    setSaving(true);
    const updates = students.map((s, i) => ({ id: s.id, roll_no: i + 1 }));
    await updateStudentRollOrders(updates);
    setSaving(false);
    setReorderMode(false);
    showAlert('Order saved', 'Student roll numbers updated.');
    load();
  };

  // ─── Bulk CSV Import ────────────────────────────────────────────────
  const downloadSample = async () => {
    const csv = generateStudentSampleCSV(section);
    try {
      const date = new Date().toLocaleDateString('en-IN').replace(/\//g, '_');
      await Share.share({ title: `StudentTemplate_${section}_${date}.csv`, message: csv });
    } catch { showAlert('Error', 'Could not share the sample file.'); }
  };

  const exportAllStudents = async () => {
    const csv = generateStudentDetailCSV(students, section);
    try {
      const date = new Date().toLocaleDateString('en-IN').replace(/\//g, '_');
      await Share.share({ title: `Students_${section}_${date}.csv`, message: csv });
    } catch { showAlert('Error', 'Could not export students.'); }
  };

  const parseDate = (val: string): string | undefined => {
    if (!val || val === 'undefined' || val.trim() === '') return undefined;
    // Accept DD/MM/YYYY or YYYY-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) {
      const [d, m, y] = val.split('/');
      return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    return undefined;
  };

  const importStudentsCSV = async () => {
    if (!csvText.trim()) { showAlert('Empty', 'Paste CSV content first.'); return; }
    setImporting(true);
    setImportResults(null);

    const lines = csvText.trim().split('\n').filter(l => l.trim());
    // Skip header/metadata lines that don't look like data
    const dataStart = lines.findIndex(l => l.toLowerCase().includes('admission') || l.toLowerCase().includes('roll'));
    const headerLine = dataStart >= 0 ? lines[dataStart] : lines[0];
    const dataLines = lines.slice(dataStart >= 0 ? dataStart + 1 : 1);

    const header = headerLine.toLowerCase().split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    let success = 0;
    const errors: string[] = [];

    const col = (row: any, ...keys: string[]): string => {
      for (const k of keys) {
        const val = row[k];
        if (val !== undefined && val !== null && val !== '') return String(val).trim().replace(/^"|"$/g, '');
      }
      return '';
    };

    for (let i = 0; i < dataLines.length; i++) {
      const rawLine = dataLines[i].trim();
      if (!rawLine) continue;

      // Handle quoted commas
      const vals: string[] = [];
      let inQuote = false;
      let cur = '';
      for (const ch of rawLine + ',') {
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === ',' && !inQuote) { vals.push(cur); cur = ''; }
        else { cur += ch; }
      }

      const row: any = {};
      header.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });

      const admNo = col(row, 'admission no', 'admission_no', 'admno', 'adm no', 'adm_no');
      const name = col(row, 'name', 'student name', 'student_name');

      if (!admNo && !name) {
        errors.push(`Row ${i + 2}: Missing name and admission number`);
        continue;
      }

      const studentData: any = {
        name: name || admNo,
        section,
        roll_no: parseInt(col(row, 'roll no', 'roll_no', 'roll')) || undefined,
        pen_no: col(row, 'pen no', 'pen_no', 'pen') || undefined,
        aadhar: col(row, 'uid/aadhar', 'uid_aadhar', 'aadhar', 'uid') || undefined,
        uid: col(row, 'uid/aadhar', 'uid_aadhar', 'uid', 'aadhar') || undefined,
        gender: col(row, 'gender') || 'Male',
        date_of_birth: parseDate(col(row, 'date of birth', 'date_of_birth', 'dob')),
        date_of_admission: parseDate(col(row, 'date of admission', 'date_of_admission', 'doa')),
        father_name: col(row, "father's name", 'father_name', 'father name') || undefined,
        mother_name: col(row, "mother's name", 'mother_name', 'mother name') || undefined,
        phone: col(row, 'phone', 'phone no', 'phone_no', 'mobile') || undefined,
        email: col(row, 'email') || undefined,
        address: col(row, 'address') || undefined,
        blood_group: col(row, 'blood group', 'blood_group') || undefined,
        emergency_contact: col(row, 'emergency contact', 'emergency_contact') || undefined,
      };

      // Remove undefined values
      Object.keys(studentData).forEach(k => { if (studentData[k] === undefined) delete studentData[k]; });

      try {
        if (admNo) {
          // Upsert by admission_no
          const { error } = await supabase.from('students').upsert(
            { ...studentData, admission_no: admNo },
            { onConflict: 'admission_no' }
          );
          if (error) { errors.push(`Row ${i + 2} (${name}): ${error.message}`); continue; }
        } else {
          // Insert new student without admission_no
          const genAdmNo = `TEMP-${section}-${Date.now()}-${i}`;
          const { error } = await supabase.from('students').insert({ ...studentData, admission_no: genAdmNo });
          if (error) { errors.push(`Row ${i + 2} (${name}): ${error.message}`); continue; }
        }
        success++;
      } catch (e: any) {
        errors.push(`Row ${i + 2}: ${e.message}`);
      }
    }

    setImporting(false);
    setImportResults({ success, failed: errors.length, errors });
    if (errors.length === 0) {
      showAlert('Import complete', `${success} students imported for class ${section}.`);
      setShowBulk(false);
      setCsvText('');
      setImportResults(null);
    }
    load();
  };

  const filtered = search.trim()
    ? students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.admission_no || '').toLowerCase().includes(search.toLowerCase()) ||
        String(s.roll_no ?? '').includes(search)
      )
    : students;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title={`Class ${section}`} subtitle={`${students.length} students`} />
      </SafeAreaView>

      {/* Action bar */}
      <View style={styles.actionBar}>
        {isClassTeacher && (
          <>
            <Pressable onPress={() => setReorderMode(r => !r)} style={[styles.actionBtn, reorderMode && styles.actionBtnActive]}>
              <MaterialCommunityIcons name="sort" color={reorderMode ? '#fff' : Colors.primary} size={16} />
              <Text style={[styles.actionBtnText, reorderMode && { color: '#fff' }]}>
                {reorderMode ? 'Reordering…' : 'Set Order'}
              </Text>
            </Pressable>
            {reorderMode && (
              <Pressable onPress={saveOrder} style={styles.saveOrderBtn}>
                <MaterialCommunityIcons name="content-save" color="#fff" size={16} />
                <Text style={styles.saveOrderText}>{saving ? 'Saving…' : 'Save Order'}</Text>
              </Pressable>
            )}
            <Pressable onPress={exportAllStudents} style={[styles.actionBtn, { backgroundColor: '#F5F0FF', borderColor: '#7C3AED40' }]}>
              <MaterialCommunityIcons name="download" color="#7C3AED" size={16} />
              <Text style={[styles.actionBtnText, { color: '#7C3AED' }]}>Export All</Text>
            </Pressable>
            <Pressable onPress={downloadSample} style={styles.actionBtn}>
              <MaterialCommunityIcons name="microsoft-excel" color={Colors.info} size={16} />
              <Text style={[styles.actionBtnText, { color: Colors.info }]}>Sample CSV</Text>
            </Pressable>
            <Pressable onPress={() => setShowBulk(true)} style={[styles.actionBtn, { backgroundColor: Colors.successBg, borderColor: Colors.success + '40' }]}>
              <MaterialCommunityIcons name="upload" color={Colors.success} size={16} />
              <Text style={[styles.actionBtnText, { color: Colors.success }]}>Bulk Import</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" color={Colors.textMuted} size={18} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search student…"
          placeholderTextColor={Colors.textMuted} style={styles.searchInput} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={s => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <MaterialCommunityIcons name="account-group" color={Colors.textMuted} size={48} />
              <Text style={styles.emptyText}>
                {search ? 'No students match your search' : `No students in ${section} yet`}
              </Text>
              {!search && isClassTeacher && (
                <Pressable onPress={() => setShowBulk(true)} style={styles.emptyImportBtn}>
                  <MaterialCommunityIcons name="upload" color="#fff" size={16} />
                  <Text style={styles.emptyImportText}>Import Students via CSV</Text>
                </Pressable>
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={[styles.studentCard, Shadows.card]}>
              <View style={styles.rollBadge}>
                <Text style={styles.rollText}>{item.roll_no ?? index + 1}</Text>
              </View>
              {item.profile_photo ? (
                <Image source={{ uri: item.profile_photo }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {item.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.studentName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.admNo}>{item.admission_no}</Text>
                {item.pen_no ? <Text style={styles.pen}>PEN: {item.pen_no}</Text> : null}
              </View>
              {reorderMode ? (
                <View style={styles.reorderBtns}>
                  <Pressable onPress={() => moveUp(index)} style={styles.reorderBtn} hitSlop={4}>
                    <MaterialCommunityIcons name="chevron-up" color={Colors.primary} size={20} />
                  </Pressable>
                  <Pressable onPress={() => moveDown(index)} style={styles.reorderBtn} hitSlop={4}>
                    <MaterialCommunityIcons name="chevron-down" color={Colors.primary} size={20} />
                  </Pressable>
                </View>
              ) : isClassTeacher ? (
                <Pressable onPress={() => openEdit(item)} style={styles.editBtn} hitSlop={8}>
                  <MaterialCommunityIcons name="pencil" color={Colors.info} size={20} />
                </Pressable>
              ) : null}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
        />
      )}

      {/* ─── Edit Student Modal ─── */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Student</Text>
              <Pressable onPress={() => setShowEdit(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.editForm} keyboardShouldPersistTaps="handled">
              <View style={styles.lockBanner}>
                <MaterialCommunityIcons name="lock" color={Colors.warning} size={14} />
                <Text style={styles.lockText}>Admission No and Section are locked. PEN No, UID, and Aadhar are only editable here.</Text>
              </View>
              <FormField label="Full Name" value={form.name ?? ''} onChange={v => setForm(f => ({ ...f, name: v }))} />
              <FormField label="Roll No" value={String(form.roll_no ?? '')} onChange={v => setForm(f => ({ ...f, roll_no: parseInt(v) || undefined }))} keyboard="number-pad" />
              <SectionDivider label="Academic IDs" />
              <FormField label="PEN No" value={form.pen_no ?? ''} onChange={v => setForm(f => ({ ...f, pen_no: v }))} />
              <FormField label="UID / Aadhar" value={form.uid ?? form.aadhar ?? ''} onChange={v => setForm(f => ({ ...f, uid: v, aadhar: v }))} keyboard="number-pad" />
              <SectionDivider label="Personal Details" />
              <FormField label="Date of Birth (YYYY-MM-DD)" value={form.date_of_birth ?? ''} onChange={v => setForm(f => ({ ...f, date_of_birth: v }))} />
              <FormField label="Date of Admission (YYYY-MM-DD)" value={form.date_of_admission ?? ''} onChange={v => setForm(f => ({ ...f, date_of_admission: v }))} />
              <FormField label="Gender" value={form.gender ?? ''} onChange={v => setForm(f => ({ ...f, gender: v }))} />
              <FormField label="Blood Group" value={form.blood_group ?? ''} onChange={v => setForm(f => ({ ...f, blood_group: v }))} placeholder="e.g. B+" />
              <SectionDivider label="Family Details" />
              <FormField label="Father's Name" value={form.father_name ?? ''} onChange={v => setForm(f => ({ ...f, father_name: v }))} />
              <FormField label="Mother's Name" value={form.mother_name ?? ''} onChange={v => setForm(f => ({ ...f, mother_name: v }))} />
              <SectionDivider label="Contact Details" />
              <FormField label="Phone No" value={form.phone ?? ''} onChange={v => setForm(f => ({ ...f, phone: v }))} keyboard="phone-pad" />
              <FormField label="Email" value={form.email ?? ''} onChange={v => setForm(f => ({ ...f, email: v }))} keyboard="email-address" />
              <FormField label="Address" value={form.address ?? ''} onChange={v => setForm(f => ({ ...f, address: v }))} multiline />
              <FormField label="Emergency Contact" value={form.emergency_contact ?? ''} onChange={v => setForm(f => ({ ...f, emergency_contact: v }))} keyboard="phone-pad" />
              <PrimaryButton label={saving ? 'Saving…' : 'Save Changes'} onPress={saveEdit} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Bulk Import Modal ─── */}
      <Modal visible={showBulk} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBulk(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Import Students · {section}</Text>
              <Pressable onPress={() => setShowBulk(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.editForm} keyboardShouldPersistTaps="handled">
              <View style={styles.infoBanner}>
                <MaterialCommunityIcons name="information" color={Colors.info} size={14} />
                <Text style={styles.infoText}>
                  Paste CSV from Excel. Required: Admission No. Optional columns: Roll No, Name, Gender, Date of Birth, Date of Admission, PEN No, UID/Aadhar, Father Name, Mother Name, Phone, Email, Address, Blood Group, Emergency Contact.{'\n\n'}
                  Existing students (matched by Admission No) will be updated.{'\n'}
                  Dates accepted as YYYY-MM-DD or DD/MM/YYYY.
                </Text>
              </View>

              <Pressable onPress={downloadSample} style={styles.sampleBtn}>
                <MaterialCommunityIcons name="microsoft-excel" color={Colors.info} size={16} />
                <Text style={styles.sampleBtnText}>Download Sample CSV Template</Text>
              </Pressable>

              <Text style={[styles.formLabelBulk, { marginTop: Spacing.xl }]}>Paste CSV Content</Text>
              <TextInput
                value={csvText}
                onChangeText={setCsvText}
                placeholder={`Roll No,Admission No,Name,Gender,Date of Birth,...\n1,271808221006008,ARCHANA S,Female,2009-05-12,...`}
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={10}
                style={styles.csvInput}
              />

              {importResults && (
                <View style={[styles.resultsBox, { borderColor: importResults.failed > 0 ? Colors.warning : Colors.success }]}>
                  <Text style={[styles.resultsTitle, { color: importResults.failed > 0 ? Colors.warning : Colors.success }]}>
                    {importResults.success} imported · {importResults.failed} failed
                  </Text>
                  {importResults.errors.map((e, i) => (
                    <Text key={i} style={styles.errorLine}>• {e}</Text>
                  ))}
                  {importResults.failed > 0 && (
                    <Text style={styles.errorNote}>Fix the errors above and re-import. Successfully imported rows are already saved.</Text>
                  )}
                </View>
              )}

              <PrimaryButton
                label={importing ? `Importing…` : `Import into Class ${section}`}
                onPress={importStudentsCSV}
                loading={importing}
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

function FormField({ label, value, onChange, keyboard, placeholder, multiline }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: any; placeholder?: string; multiline?: boolean;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType={keyboard ?? 'default'}
        placeholder={placeholder ?? ''} placeholderTextColor={Colors.textMuted}
        multiline={multiline} numberOfLines={multiline ? 3 : 1}
        style={[fieldStyles.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={fieldStyles.divider}>
      <Text style={fieldStyles.dividerLabel}>{label}</Text>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { marginTop: 6, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.textPrimary },
  divider: { marginTop: 20, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8 },
  dividerLabel: { fontSize: 13, fontWeight: '800', color: Colors.primary, letterSpacing: 0.5 },
});

const styles = StyleSheet.create({
  actionBar: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.surfaceTint, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  actionBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  saveOrderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: Colors.success, borderRadius: Radius.md },
  saveOrderText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: Spacing.xl, marginTop: Spacing.md, marginBottom: 4, backgroundColor: '#fff', borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  list: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, paddingBottom: 40 },
  studentCard: { backgroundColor: '#fff', borderRadius: Radius.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  rollBadge: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  rollText: { fontSize: 12, fontWeight: '900', color: Colors.primary },
  photo: { width: 42, height: 42, borderRadius: 14, marginLeft: 4 },
  avatarPlaceholder: { width: 42, height: 42, borderRadius: 14, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  avatarText: { fontSize: 14, fontWeight: '800', color: Colors.textSecondary },
  studentName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  admNo: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  pen: { fontSize: 11, color: Colors.info, marginTop: 1, fontWeight: '600' },
  reorderBtns: { flexDirection: 'row', gap: 2 },
  reorderBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.surfaceTint, alignItems: 'center', justifyContent: 'center' },
  editBtn: { padding: 8 },
  emptyText: { fontSize: 15, color: Colors.textMuted, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  emptyImportBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.success, borderRadius: Radius.lg, paddingHorizontal: 20, paddingVertical: 12, marginTop: 20 },
  emptyImportText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  editForm: { padding: Spacing.xl, paddingBottom: 60 },
  lockBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warningBg, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  lockText: { flex: 1, fontSize: 12, color: Colors.warning, fontWeight: '600', lineHeight: 18 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: 12, marginBottom: Spacing.lg },
  infoText: { flex: 1, fontSize: 12, color: Colors.info, fontWeight: '500', lineHeight: 18 },
  sampleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: Colors.infoBg, borderRadius: Radius.md },
  sampleBtnText: { color: Colors.info, fontSize: 13, fontWeight: '700' },
  formLabelBulk: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  csvInput: { backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, padding: 14, fontSize: 13, color: Colors.textPrimary, minHeight: 200, borderWidth: 1, borderColor: Colors.border, textAlignVertical: 'top', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 8 },
  resultsBox: { borderWidth: 1.5, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg },
  resultsTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  errorLine: { fontSize: 12, color: Colors.danger, marginTop: 4 },
  errorNote: { fontSize: 12, color: Colors.textMuted, marginTop: 8, fontStyle: 'italic' },
});

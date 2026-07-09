// Teacher Profile — full details + teaching sections selector
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Pill } from '@/components/ui/Pill';
import { Colors, Radius, Spacing, Shadows } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile, changeUserPassword } from '@/services/schoolData';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

const ALL_SECTIONS = ['10A', '10B', '10C', '10D', '11A', '11B', '11C', '12A', '12B', '12C',
  '9A', '9B', '9C', '8A', '8B', '7A', '7B', '6A', '6B'];

const ALL_SUBJECTS = ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English',
  'Hindi', 'Social Science', 'Computer Science', 'Economics', 'Work Education', 'Art Education',
  'Physical Education', 'Sanskrit'];

export default function TeacherProfile() {
  const { user, refreshProfile, updateTeachingSections } = useAuth();
  const { showAlert } = useAlert();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showSections, setShowSections] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [subject, setSubject] = useState('');
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    if (!user?.id) { setLoading(false); return; }
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    setProfile(data);
    setDisplayName(data?.display_name ?? user.name ?? '');
    setPhone(data?.phone ?? '');
    setAddress(data?.address ?? '');
    setSubject(data?.subject ?? user.subject ?? '');
    const sects = Array.isArray(data?.teaching_sections) ? data.teaching_sections :
      (data?.class_teacher_of ? [data.class_teacher_of] : []);
    setSelectedSections(sects);
    setLoading(false);
  };

  const save = async () => {
    if (!user?.id) return;
    setSaving(true);
    const subtitle = `${profile?.designation ?? 'Teacher'} ${subject}${profile?.class_teacher_of ? ` · CT ${profile.class_teacher_of}` : ''}`;
    await updateUserProfile(user.id, {
      display_name: displayName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      subject: subject.trim(),
      subtitle,
      teaching_sections: selectedSections,
    });
    await refreshProfile();
    setSaving(false);
    setShowEdit(false);
    showAlert('Saved', 'Profile updated successfully.');
    loadProfile();
  };

  const saveSections = async () => {
    setSaving(true);
    const { error } = await updateTeachingSections(selectedSections);
    setSaving(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Sections updated', `You are now assigned to ${selectedSections.length} section(s).`);
    setShowSections(false);
    loadProfile();
  };

  const toggleSection = (sec: string) => {
    setSelectedSections(prev =>
      prev.includes(sec) ? prev.filter(s => s !== sec) : [...prev, sec]
    );
  };

  const changePass = async () => {
    if (newPass.length < 6) { showAlert('Too short', 'Password must be at least 6 characters.'); return; }
    if (newPass !== confirmPass) { showAlert('Mismatch', 'Passwords do not match.'); return; }
    setChangingPass(true);
    const { error } = await changeUserPassword(newPass);
    setChangingPass(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Password changed', 'Your password has been updated.');
    setShowPassModal(false);
    setNewPass(''); setConfirmPass('');
  };

  const infoRows = [
    { label: 'Employee Code', value: profile?.employee_code ?? user?.employeeCode ?? '—', icon: 'badge-account' },
    { label: 'Email', value: profile?.email ?? user?.email ?? '—', icon: 'email' },
    { label: 'Phone', value: profile?.phone ?? '—', icon: 'phone' },
    { label: 'Subject', value: profile?.subject ?? user?.subject ?? '—', icon: 'book' },
    { label: 'Class Teacher Of', value: profile?.class_teacher_of ?? '—', icon: 'star-circle' },
    { label: 'Teacher Type', value: profile?.teacher_type ?? 'Regular', icon: 'account-tie' },
    { label: 'Date of Joining', value: profile?.date_of_joining ?? '—', icon: 'calendar' },
    { label: 'Address', value: profile?.address ?? '—', icon: 'map-marker' },
  ];

  const teachingSections = Array.isArray(profile?.teaching_sections)
    ? profile.teaching_sections
    : (profile?.class_teacher_of ? [profile.class_teacher_of] : []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="My Profile" subtitle={profile?.designation ? `${profile.designation} · ${profile.subject ?? ''}` : 'Teacher'} />
      </SafeAreaView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile card */}
          <Card style={styles.profileCard}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(profile?.display_name ?? user?.name ?? 'T')[0]}</Text>
              </View>
            </View>
            <Text style={styles.name}>{profile?.display_name ?? user?.name ?? '—'}</Text>
            <Text style={styles.role}>{profile?.subtitle ?? user?.subtitle ?? '—'}</Text>
            {profile?.employee_code ? (
              <View style={styles.codeBadge}>
                <MaterialCommunityIcons name="badge-account" color={Colors.primary} size={14} />
                <Text style={styles.codeText}>Code: {profile.employee_code}</Text>
              </View>
            ) : null}
          </Card>

          {/* Teaching sections */}
          <Card style={{ marginTop: Spacing.lg }}>
            <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="school" color={Colors.primary} size={20} />
              <Text style={styles.sectionTitle}>My Teaching Sections</Text>
              <Pressable onPress={() => setShowSections(true)} style={styles.editSmallBtn}>
                <MaterialCommunityIcons name="pencil" color={Colors.info} size={14} />
                <Text style={styles.editSmallText}>Edit</Text>
              </Pressable>
            </View>
            {teachingSections.length > 0 ? (
              <View style={styles.sectionsRow}>
                {teachingSections.map((sec: string) => (
                  <View key={sec} style={styles.sectionChip}>
                    <Text style={styles.sectionChipText}>{sec}</Text>
                    {sec === profile?.class_teacher_of ? (
                      <MaterialCommunityIcons name="star" color={Colors.saffron} size={12} />
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Pressable onPress={() => setShowSections(true)} style={styles.noSectionsBtn}>
                <MaterialCommunityIcons name="plus-circle-outline" color={Colors.info} size={20} />
                <Text style={styles.noSectionsText}>Tap to add your teaching sections</Text>
              </Pressable>
            )}
          </Card>

          {/* Info rows */}
          <Card style={{ marginTop: Spacing.lg }}>
            {infoRows.map((r, i) => (
              <View key={r.label}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <MaterialCommunityIcons name={r.icon as any} color={Colors.textMuted} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>{r.label}</Text>
                    <Text style={styles.infoValue} numberOfLines={2}>{r.value}</Text>
                  </View>
                </View>
                {i < infoRows.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </Card>

          {/* Actions */}
          <View style={styles.actionsRow}>
            <Pressable onPress={() => setShowEdit(true)} style={styles.actionBtn}>
              <MaterialCommunityIcons name="account-edit" color={Colors.primary} size={20} />
              <Text style={styles.actionBtnText}>Edit Profile</Text>
            </Pressable>
            <Pressable onPress={() => setShowSections(true)} style={[styles.actionBtn, { borderColor: Colors.info + '50', backgroundColor: Colors.infoBg }]}>
              <MaterialCommunityIcons name="school-outline" color={Colors.info} size={20} />
              <Text style={[styles.actionBtnText, { color: Colors.info }]}>My Sections</Text>
            </Pressable>
            <Pressable onPress={() => setShowPassModal(true)} style={[styles.actionBtn, { borderColor: Colors.warning + '50', backgroundColor: Colors.warningBg }]}>
              <MaterialCommunityIcons name="lock-reset" color={Colors.warning} size={20} />
              <Text style={[styles.actionBtnText, { color: Colors.warning }]}>Password</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}

      {/* ─── Edit Profile Modal ─── */}
      <Modal visible={showEdit} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowEdit(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <Pressable onPress={() => setShowEdit(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <Field label="Full Name" value={displayName} onChange={setDisplayName} />
              <Field label="Phone" value={phone} onChange={setPhone} keyboard="phone-pad" />
              <Field label="Address" value={address} onChange={setAddress} multiline />

              <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {ALL_SUBJECTS.map(s => (
                    <Pressable key={s} onPress={() => setSubject(s)} style={[styles.chip, subject === s && styles.chipActive]}>
                      <Text style={[styles.chipText, subject === s && styles.chipTextActive]}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <PrimaryButton label={saving ? 'Saving…' : 'Save Changes'} onPress={save} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Teaching Sections Modal ─── */}
      <Modal visible={showSections} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowSections(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>My Teaching Sections</Text>
            <Pressable onPress={() => setShowSections(false)} hitSlop={12}>
              <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form}>
            <View style={styles.infoBanner}>
              <MaterialCommunityIcons name="information" color={Colors.info} size={14} />
              <Text style={styles.infoText}>
                Select all sections where you teach {subject || 'your subject'}. This controls which class data you see throughout the app.
                {profile?.class_teacher_of ? `\n\nYou are Class Teacher of ${profile.class_teacher_of} (starred).` : ''}
              </Text>
            </View>

            <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>
              Select Sections ({selectedSections.length} selected)
            </Text>
            <View style={styles.chips}>
              {ALL_SECTIONS.map(sec => {
                const isSelected = selectedSections.includes(sec);
                const isCT = sec === profile?.class_teacher_of;
                return (
                  <Pressable
                    key={sec}
                    onPress={() => !isCT && toggleSection(sec)}
                    style={[
                      styles.sectionSelectChip,
                      isSelected && styles.sectionSelectChipActive,
                      isCT && styles.sectionSelectChipCT,
                    ]}
                  >
                    <Text style={[
                      styles.sectionSelectText,
                      isSelected && styles.sectionSelectTextActive,
                      isCT && { color: Colors.saffron },
                    ]}>{sec}</Text>
                    {isCT ? <MaterialCommunityIcons name="star" color={Colors.saffron} size={12} /> : null}
                  </Pressable>
                );
              })}
            </View>

            {selectedSections.length > 0 && (
              <View style={styles.selectedPreview}>
                <Text style={styles.selectedPreviewLabel}>Selected:</Text>
                <Text style={styles.selectedPreviewVal}>{selectedSections.join(', ')}</Text>
              </View>
            )}

            <PrimaryButton
              label={saving ? 'Saving…' : `Save ${selectedSections.length} Section${selectedSections.length !== 1 ? 's' : ''}`}
              onPress={saveSections}
              loading={saving}
              size="lg"
              style={{ marginTop: Spacing.xl }}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ─── Change Password Modal ─── */}
      <Modal visible={showPassModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPassModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <Pressable onPress={() => setShowPassModal(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <View style={styles.form}>
              <Field label="New Password (min. 6 chars)" value={newPass} onChange={setNewPass} secure />
              <Field label="Confirm Password" value={confirmPass} onChange={setConfirmPass} secure />
              <PrimaryButton
                label={changingPass ? 'Changing…' : 'Change Password'}
                onPress={changePass}
                loading={changingPass}
                size="lg"
                style={{ marginTop: Spacing.xl }}
              />
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function Field({ label, value, onChange, keyboard, multiline, secure }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: any; multiline?: boolean; secure?: boolean;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={fieldSt.label}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} keyboardType={keyboard ?? 'default'}
        multiline={multiline} secureTextEntry={secure}
        numberOfLines={multiline ? 3 : 1}
        style={[fieldSt.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const fieldSt = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { marginTop: 6, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary },
});

const styles = StyleSheet.create({
  content: { padding: Spacing.xl, paddingBottom: 60 },
  profileCard: { alignItems: 'center', paddingVertical: Spacing.xxl },
  avatarWrap: { marginBottom: Spacing.lg },
  avatar: { width: 80, height: 80, borderRadius: 24, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#fff' },
  name: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center' },
  role: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, textAlign: 'center' },
  codeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.surfaceTint, borderRadius: Radius.pill, paddingHorizontal: 12, paddingVertical: 6, marginTop: Spacing.md },
  codeText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  editSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.infoBg, borderRadius: Radius.sm },
  editSmallText: { fontSize: 12, fontWeight: '700', color: Colors.info },
  sectionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: Colors.primary, borderRadius: Radius.pill },
  sectionChipText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  noSectionsBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: Colors.infoBg, borderRadius: Radius.md },
  noSectionsText: { fontSize: 13, color: Colors.info, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  infoIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.border },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: Spacing.lg },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: Colors.surfaceTint, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.primary + '30' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  sectionSelectChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted, borderWidth: 2, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionSelectChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sectionSelectChipCT: { backgroundColor: Colors.warningBg, borderColor: Colors.saffron },
  sectionSelectText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  sectionSelectTextActive: { color: '#fff' },
  selectedPreview: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.successBg, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg },
  selectedPreviewLabel: { fontSize: 12, fontWeight: '700', color: Colors.success },
  selectedPreviewVal: { flex: 1, fontSize: 13, color: Colors.textPrimary, fontWeight: '600' },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: 12 },
  infoText: { flex: 1, fontSize: 12, color: Colors.info, fontWeight: '500', lineHeight: 18 },
});

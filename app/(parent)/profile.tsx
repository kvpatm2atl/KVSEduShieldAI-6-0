// Parent profile — photo upload, safety PIN management, restricted student fields
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, TextInput, View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Card } from '@/components/ui/Card';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile, changeUserEmail, changeUserPassword, fetchParentStudent } from '@/services/schoolData';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

export default function ParentProfile() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [tab, setTab] = useState<'child' | 'profile' | 'security'>('child');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState<any>(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [address, setAddress] = useState('');
  const [newEmail, setNewEmail] = useState(user?.email ?? '');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Editable student fields by parent (non-sensitive only)
  const [stuPhone, setStuPhone] = useState('');
  const [stuEmail, setStuEmail] = useState('');
  const [stuAddress, setStuAddress] = useState('');
  const [stuEmergency, setStuEmergency] = useState('');

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    const s = await fetchParentStudent(user.id);
    setStudent(s);
    if (s) {
      setStuPhone(s.phone ?? '');
      setStuEmail(s.email ?? '');
      setStuAddress(s.address ?? '');
      setStuEmergency(s.emergency_contact ?? '');
    }

    // Load parent address
    const { data } = await supabase.from('user_profiles').select('address, phone').eq('id', user.id).maybeSingle();
    if (data?.address) setAddress(data.address);
    if (data?.phone) setPhone(data.phone);
    setLoadingStudent(false);
  };

  const pickStudentPhoto = async () => {
    if (!student) { showAlert('No student linked', 'Your account is not linked to a student yet.'); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showAlert('Permission Required', 'Allow photo library access.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.75, base64: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
    const fileName = `students/${student.id}.${ext}`;
    if (!asset.base64) { showAlert('Error', 'Could not read image.'); return; }
    const arrayBuffer = Uint8Array.from(atob(asset.base64), c => c.charCodeAt(0));

    setUploadingPhoto(true);
    const { error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

    if (uploadError) { showAlert('Upload Failed', uploadError.message); setUploadingPhoto(false); return; }

    const { data: urlData } = supabase.storage.from('student-photos').getPublicUrl(fileName);
    if (urlData?.publicUrl) {
      await supabase.from('students').update({ profile_photo: urlData.publicUrl }).eq('id', student.id);
      setStudent((s: any) => s ? { ...s, profile_photo: urlData.publicUrl + '?t=' + Date.now() } : s);
      showAlert('Photo Updated', "Your child's profile photo has been updated. Teachers can now identify your child easily.");
    }
    setUploadingPhoto(false);
  };

  const saveStudentContact = async () => {
    if (!student) return;
    setSaving(true);
    // Parent can only edit: phone, email, address, emergency_contact — NOT pen_no, uid, aadhar
    await supabase.from('students').update({
      phone: stuPhone.trim(),
      email: stuEmail.trim(),
      address: stuAddress.trim(),
      emergency_contact: stuEmergency.trim(),
    }).eq('id', student.id);
    setSaving(false);
    showAlert('Saved', 'Contact details updated.');
    loadData();
  };

  const saveProfile = async () => {
    if (!displayName.trim()) { showAlert('Error', 'Name cannot be empty.'); return; }
    setSaving(true);
    await updateUserProfile(user!.id, {
      display_name: displayName.trim(),
      phone: phone.trim(),
      address: address.trim() || null,
    });
    if (newEmail.trim() && newEmail.trim() !== user?.email) {
      await changeUserEmail(newEmail.trim());
      await updateUserProfile(user!.id, { email: newEmail.trim() });
    }
    await refreshProfile();
    setSaving(false);
    showAlert('Saved', 'Profile updated.');
    setEditMode(false);
  };

  const changePassword = async () => {
    if (!newPass || newPass !== confirmPass) { showAlert('Error', 'Passwords do not match.'); return; }
    if (newPass.length < 6) { showAlert('Error', 'Min 6 characters required.'); return; }
    setSaving(true);
    const { error } = await changeUserPassword(newPass);
    setSaving(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Done', 'Password changed successfully.');
    setNewPass(''); setConfirmPass('');
  };

  const resetPin = () => {
    showAlert('Reset Safety PIN?', 'You will create a new PIN on next login.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive', onPress: async () => {
          await supabase.from('user_profiles').update({ safety_pin: null }).eq('id', user!.id);
          showAlert('PIN Reset', 'Safety PIN cleared. Set a new one at next login.');
        }
      },
    ]);
  };

  const signOut = () => {
    showAlert('Sign out?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  const tabs = [
    { key: 'child', label: "My Child", icon: 'account-child' },
    { key: 'profile', label: 'Profile', icon: 'account-edit' },
    { key: 'security', label: 'Security', icon: 'lock' },
  ] as const;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#091A40' }}>
        <LinearGradient colors={['#091A40', '#0F2A5C', '#2A6FDB']} style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroAvatar}>
              <MaterialCommunityIcons name="account-heart" color="#fff" size={28} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroName}>{user?.name}</Text>
              <Text style={styles.heroSub}>{user?.subtitle}</Text>
              <Text style={styles.heroEmail}>{user?.email}</Text>
            </View>
            <Pressable onPress={() => setEditMode(e => !e)} style={styles.editBtn}>
              <MaterialCommunityIcons name={editMode ? 'close' : 'pencil'} color="#fff" size={18} />
            </Pressable>
          </View>
        </LinearGradient>
      </SafeAreaView>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {tabs.map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key as any)}
            style={[styles.tab, tab === t.key && styles.tabActive]}>
            <MaterialCommunityIcons
              name={t.icon as any}
              color={tab === t.key ? Colors.primary : Colors.textMuted}
              size={16}
            />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* MY CHILD TAB */}
          {tab === 'child' && (
            <>
              {loadingStudent ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
              ) : student ? (
                <>
                  {/* Photo card */}
                  <Card style={styles.photoCard}>
                    <Pressable onPress={pickStudentPhoto} style={styles.photoWrap}>
                      {uploadingPhoto ? (
                        <View style={styles.photoPlaceholder}>
                          <ActivityIndicator color={Colors.primary} />
                        </View>
                      ) : student.profile_photo ? (
                        <Image source={{ uri: student.profile_photo }} style={styles.studentPhoto} contentFit="cover" />
                      ) : (
                        <View style={styles.photoPlaceholder}>
                          <MaterialCommunityIcons name="camera-plus" color={Colors.textMuted} size={32} />
                          <Text style={styles.photoHint}>Tap to add photo</Text>
                        </View>
                      )}
                      {!uploadingPhoto && (
                        <View style={styles.camBadge}>
                          <MaterialCommunityIcons name="camera" color="#fff" size={12} />
                        </View>
                      )}
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stuName}>{student.name}</Text>
                      <Text style={styles.stuMeta}>Section: <Text style={{ color: Colors.textPrimary }}>{student.section}</Text></Text>
                      <Text style={styles.stuMeta}>Adm No: <Text style={{ color: Colors.textPrimary }}>{student.admission_no}</Text></Text>
                    </View>
                  </Card>

                  {/* Read-only protected fields */}
                  <View style={styles.lockBanner}>
                    <MaterialCommunityIcons name="lock" color={Colors.warning} size={15} />
                    <Text style={styles.lockText}>PEN No., UID/Aadhar, Section and Admission No. are set by school and cannot be edited here.</Text>
                  </View>

                  <Card padded={false} style={{ marginBottom: Spacing.md }}>
                    <ReadRow label="PEN No." value={student.pen_no ?? 'Not set yet'} icon="identifier" />
                    <ReadRow label="UID / Aadhar" value={student.uid ?? 'Not set yet'} icon="card-account-details" />
                    <ReadRow label="Date of Birth" value={student.date_of_birth ?? '—'} icon="cake" />
                    <ReadRow label="Father's Name" value={student.father_name ?? '—'} icon="account" />
                    <ReadRow label="Mother's Name" value={student.mother_name ?? '—'} icon="account" />
                  </Card>

                  {/* Editable contact fields */}
                  <Text style={styles.sectionLabel}>Contact Details (Editable)</Text>
                  <Card>
                    <FField label="Student Phone" value={stuPhone} onChange={setStuPhone} keyboard="phone-pad" />
                    <FField label="Student Email" value={stuEmail} onChange={setStuEmail} keyboard="email-address" />
                    <FField label="Home Address" value={stuAddress} onChange={setStuAddress} multiline />
                    <FField label="Emergency Contact" value={stuEmergency} onChange={setStuEmergency} keyboard="phone-pad" />
                    <PrimaryButton
                      label={saving ? 'Saving…' : 'Save Contact Details'}
                      onPress={saveStudentContact} loading={saving} size="lg"
                      style={{ marginTop: Spacing.xl }}
                    />
                  </Card>
                </>
              ) : (
                <Card style={styles.emptyCard}>
                  <MaterialCommunityIcons name="account-question" color={Colors.textMuted} size={48} />
                  <Text style={styles.emptyTitle}>No child linked</Text>
                  <Text style={styles.emptySub}>Contact the school admin to link your child's admission number to this account.</Text>
                </Card>
              )}
            </>
          )}

          {/* PROFILE TAB */}
          {tab === 'profile' && (
            <Card style={{ marginTop: Spacing.md }}>
              <FField label="Your Name" value={displayName} onChange={setDisplayName} />
              <FField label="Phone" value={phone} onChange={setPhone} keyboard="phone-pad" />
              <FField label="Address" value={address} onChange={setAddress} multiline />
              <View style={styles.noteBox}>
                <MaterialCommunityIcons name="information" color={Colors.info} size={14} />
                <Text style={styles.noteText}>Email change requires verification at new address.</Text>
              </View>
              <FField label="New Email" value={newEmail} onChange={setNewEmail} keyboard="email-address" />
              <PrimaryButton label={saving ? 'Saving…' : 'Save Changes'} onPress={saveProfile} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
            </Card>
          )}

          {/* SECURITY TAB */}
          {tab === 'security' && (
            <>
              <Card style={{ marginTop: Spacing.md }}>
                <View style={styles.pinRow}>
                  <View style={[styles.pinIcon, { backgroundColor: Colors.primary + '18' }]}>
                    <MaterialCommunityIcons name="lock" color={Colors.primary} size={22} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.pinTitle}>Safety PIN</Text>
                    <Text style={styles.pinSub}>Required every time you open the parent app to protect your child's data.</Text>
                  </View>
                </View>
                <Pressable onPress={resetPin} style={styles.resetBtn}>
                  <MaterialCommunityIcons name="lock-reset" color={Colors.danger} size={16} />
                  <Text style={styles.resetText}>Reset Safety PIN</Text>
                </Pressable>
              </Card>

              <Text style={styles.sectionLabel}>Change Password</Text>
              <Card>
                <View style={{ position: 'relative' }}>
                  <FField label="New Password" value={newPass} onChange={setNewPass} secure={!showPass} />
                  <Pressable onPress={() => setShowPass(p => !p)} style={styles.eyeBtn} hitSlop={8}>
                    <MaterialCommunityIcons name={showPass ? 'eye-off' : 'eye'} color={Colors.textMuted} size={20} />
                  </Pressable>
                </View>
                <FField label="Confirm Password" value={confirmPass} onChange={setConfirmPass} secure={!showPass} />
                <PrimaryButton label={saving ? 'Updating…' : 'Change Password'} onPress={changePassword} loading={saving} size="lg" style={{ marginTop: Spacing.xl }} />
              </Card>
            </>
          )}

          <PrimaryButton label="Sign out" variant="outline" onPress={signOut} style={{ marginTop: Spacing.xl }} />
          <Text style={styles.footer}>Made by team NovaThink</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FField({ label, value, onChange, keyboard, multiline, secure }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: any; multiline?: boolean; secure?: boolean;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={fS.label}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} keyboardType={keyboard ?? 'default'}
        secureTextEntry={secure} multiline={multiline} numberOfLines={multiline ? 3 : 1}
        placeholderTextColor={Colors.textMuted} autoCapitalize="none"
        style={[fS.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]} />
    </View>
  );
}

function ReadRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={fS.readRow}>
      <MaterialCommunityIcons name={icon as any} color={Colors.textMuted} size={16} />
      <Text style={fS.readLabel}>{label}</Text>
      <Text style={fS.readValue} numberOfLines={1}>{value}</Text>
      <MaterialCommunityIcons name="lock-outline" color={Colors.border} size={14} />
    </View>
  );
}

const fS = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { marginTop: 6, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary },
  readRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: 13, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  readLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, width: 110 },
  readValue: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
});

const styles = StyleSheet.create({
  hero: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.xxl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroAvatar: { width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroName: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  heroEmail: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 1 },
  editBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, gap: 8 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  tabActive: { backgroundColor: '#EBF3FF', borderColor: Colors.primary },
  tabText: { fontSize: 12, fontWeight: '700', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  content: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
  photoCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  photoWrap: { position: 'relative', width: 90, height: 90 },
  studentPhoto: { width: 90, height: 90, borderRadius: 22, borderWidth: 3, borderColor: Colors.border },
  photoPlaceholder: { width: 90, height: 90, borderRadius: 22, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed' },
  photoHint: { fontSize: 10, color: Colors.textMuted, marginTop: 4, fontWeight: '600', textAlign: 'center' },
  camBadge: { position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: '#fff' },
  stuName: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  stuMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, fontWeight: '500' },
  lockBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warningBg, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg, marginBottom: Spacing.md },
  lockText: { flex: 1, fontSize: 12, color: Colors.warning, fontWeight: '600', lineHeight: 18 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary, marginTop: Spacing.xl, marginBottom: Spacing.md, letterSpacing: 0.3 },
  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textMuted },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', lineHeight: 18, paddingHorizontal: 20 },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg },
  noteText: { flex: 1, fontSize: 12, color: Colors.info, fontWeight: '600', lineHeight: 18 },
  pinRow: { flexDirection: 'row', alignItems: 'flex-start' },
  pinIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pinTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  pinSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.lg, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: Colors.dangerBg, borderRadius: Radius.md },
  resetText: { fontSize: 14, fontWeight: '700', color: Colors.danger },
  eyeBtn: { position: 'absolute', right: 14, bottom: 14 },
  footer: { textAlign: 'center', color: Colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: Spacing.xl },
});

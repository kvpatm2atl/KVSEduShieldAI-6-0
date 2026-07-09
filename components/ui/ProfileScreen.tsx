// Universal Profile Editor — all roles, full profile with photo upload
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
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAlert } from '@/template';
import { useAuth } from '@/hooks/useAuth';
import { updateUserProfile, changeUserEmail, changeUserPassword } from '@/services/schoolData';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();

const ROLE_GRADIENT: Record<string, [string, string]> = {
  parent:     ['#1A3A6B', '#2A6FDB'],
  teacher:    ['#0B3D24', '#1FA971'],
  admin:      ['#2A1050', '#7C3AED'],
  conductor:  ['#4A2800', '#D97706'],
  bus_driver: ['#052A1A', '#059669'],
  security:   ['#3A0A0A', '#DC2626'],
};
const ROLE_COLOR: Record<string, string> = {
  parent: '#2A6FDB', teacher: '#1FA971', admin: '#7C3AED',
  conductor: '#D97706', bus_driver: '#059669', security: '#DC2626',
};
const ROLE_ICONS: Record<string, string> = {
  parent: 'account-heart', teacher: 'book-education', admin: 'shield-account',
  conductor: 'bus-clock', bus_driver: 'steering', security: 'shield-star',
};

export default function ProfileScreen() {
  const { user, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const { showAlert } = useAlert();

  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'security'>('basic');
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(true);

  // Form fields
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass] = useState(false);

  const roleColor = ROLE_COLOR[user?.role ?? 'teacher'] ?? Colors.primary;
  const roleGradient = ROLE_GRADIENT[user?.role ?? 'teacher'] ?? ['#0B3D24', '#1FA971'];
  const roleIcon = ROLE_ICONS[user?.role ?? 'teacher'] ?? 'account';

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;
    setDisplayName(user.name ?? '');
    setPhone(user.phone ?? '');
    setSubtitle(user.subtitle ?? '');
    setNewEmail(user.email ?? '');

    // Load profile photo and address from DB
    const { data } = await supabase
      .from('user_profiles')
      .select('profile_photo, address, phone')
      .eq('id', user.id)
      .maybeSingle();
    if (data?.profile_photo) setProfilePhotoUrl(data.profile_photo);
    if (data?.address) setAddress(data.address);
    if (data?.phone && !phone) setPhone(data.phone);
    setLoadingPhoto(false);
  };

  const pickProfilePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
    const fileName = `staff/${user!.id}.${ext}`;

    if (!asset.base64) { showAlert('Error', 'Could not read image data.'); return; }
    const arrayBuffer = Uint8Array.from(atob(asset.base64), c => c.charCodeAt(0));

    setUploadingPhoto(true);
    const { error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(fileName, arrayBuffer, { contentType: `image/${ext}`, upsert: true });

    if (uploadError) {
      showAlert('Upload Failed', uploadError.message);
      setUploadingPhoto(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('student-photos').getPublicUrl(fileName);
    if (urlData?.publicUrl) {
      await supabase.from('user_profiles').update({ profile_photo: urlData.publicUrl }).eq('id', user!.id);
      setProfilePhotoUrl(urlData.publicUrl + '?t=' + Date.now());
      showAlert('Photo Updated', 'Your profile photo has been updated.');
    }
    setUploadingPhoto(false);
  };

  const save = async () => {
    if (!displayName.trim()) { showAlert('Error', 'Name cannot be empty.'); return; }
    setSaving(true);
    const { error } = await updateUserProfile(user!.id, {
      display_name: displayName.trim(),
      phone: phone.trim(),
      address: address.trim() || null,
      subtitle: subtitle.trim() || null,
    });
    if (error) { showAlert('Error', error); setSaving(false); return; }

    if (newEmail.trim() && newEmail.trim() !== user?.email) {
      const { error: emailErr } = await changeUserEmail(newEmail.trim());
      if (emailErr) { showAlert('Email update failed', emailErr); setSaving(false); return; }
      await updateUserProfile(user!.id, { email: newEmail.trim() });
    }

    await refreshProfile();
    setSaving(false);
    showAlert('Saved', 'Profile updated successfully.');
    setEditMode(false);
  };

  const changePassword = async () => {
    if (!newPass.trim()) { showAlert('Error', 'Enter a new password.'); return; }
    if (newPass !== confirmPass) { showAlert('Error', 'Passwords do not match.'); return; }
    if (newPass.length < 6) { showAlert('Error', 'Password must be at least 6 characters.'); return; }
    setSaving(true);
    const { error } = await changeUserPassword(newPass);
    setSaving(false);
    if (error) { showAlert('Error', error); return; }
    showAlert('Done', 'Password updated successfully.');
    setNewPass(''); setConfirmPass('');
  };

  const signOut = () => {
    showAlert('Sign out?', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await logout(); router.replace('/'); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: roleGradient[0] }}>
        <LinearGradient colors={[roleGradient[0], roleGradient[1]]} style={styles.hero}>
          {/* Photo */}
          <View style={styles.photoArea}>
            <Pressable onPress={pickProfilePhoto} style={styles.photoWrap}>
              {uploadingPhoto ? (
                <View style={[styles.photoPlaceholder, { backgroundColor: roleGradient[1] + '44' }]}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : profilePhotoUrl ? (
                <Image source={{ uri: profilePhotoUrl }} style={styles.photo} contentFit="cover" />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                  <MaterialCommunityIcons name={roleIcon as any} color="rgba(255,255,255,0.9)" size={38} />
                </View>
              )}
              <View style={styles.photoCam}>
                <MaterialCommunityIcons name="camera" color="#fff" size={13} />
              </View>
            </Pressable>
            <View style={styles.heroText}>
              <Text style={styles.heroName}>{user?.name}</Text>
              <Text style={styles.heroSub} numberOfLines={2}>{user?.subtitle}</Text>
              <View style={[styles.roleBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <MaterialCommunityIcons name={roleIcon as any} color="#fff" size={13} />
                <Text style={styles.roleText}>{(user?.role ?? '').replace('_', ' ').toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {user?.email && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="email-outline" color="rgba(255,255,255,0.7)" size={14} />
                <Text style={styles.metaText} numberOfLines={1}>{user.email}</Text>
              </View>
            )}
            {user?.phone && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="phone-outline" color="rgba(255,255,255,0.7)" size={14} />
                <Text style={styles.metaText}>{user.phone}</Text>
              </View>
            )}
          </View>

          <Pressable onPress={() => setEditMode(e => !e)} style={styles.editToggle}>
            <MaterialCommunityIcons name={editMode ? 'close' : 'account-edit'} color="#fff" size={16} />
            <Text style={styles.editToggleText}>{editMode ? 'Cancel Edit' : 'Edit Profile'}</Text>
          </Pressable>
        </LinearGradient>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Edit mode */}
          {editMode ? (
            <>
              <View style={styles.tabRow}>
                {(['basic', 'contact', 'security'] as const).map(tab => (
                  <Pressable key={tab} onPress={() => setActiveTab(tab)}
                    style={[styles.tab, activeTab === tab && [styles.tabActive, { backgroundColor: roleColor }]]}>
                    <MaterialCommunityIcons
                      name={tab === 'basic' ? 'account' : tab === 'contact' ? 'phone' : 'lock'}
                      color={activeTab === tab ? '#fff' : Colors.textSecondary}
                      size={15}
                    />
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {activeTab === 'basic' && (
                <Card style={{ marginTop: Spacing.lg }}>
                  <FField label="Full Name" value={displayName} onChange={setDisplayName} />
                  <FField label="Designation / Subtitle" value={subtitle} onChange={setSubtitle} />
                  <PrimaryButton
                    label={saving ? 'Saving…' : 'Save Basic Info'}
                    onPress={save} loading={saving} size="lg"
                    style={{ marginTop: Spacing.xl, backgroundColor: roleColor }}
                  />
                </Card>
              )}

              {activeTab === 'contact' && (
                <Card style={{ marginTop: Spacing.lg }}>
                  <FField label="Phone Number" value={phone} onChange={setPhone} keyboard="phone-pad" />
                  <FField label="Address" value={address} onChange={setAddress} multiline />
                  <View style={styles.noteBox}>
                    <MaterialCommunityIcons name="information" color={Colors.info} size={14} />
                    <Text style={styles.noteText}>Email change requires verification via new address.</Text>
                  </View>
                  <FField label="New Email Address" value={newEmail} onChange={setNewEmail} keyboard="email-address" />
                  <PrimaryButton
                    label={saving ? 'Saving…' : 'Update Contact Info'}
                    onPress={save} loading={saving} size="lg"
                    style={{ marginTop: Spacing.xl, backgroundColor: roleColor }}
                  />
                </Card>
              )}

              {activeTab === 'security' && (
                <Card style={{ marginTop: Spacing.lg }}>
                  <View style={styles.warnBox}>
                    <MaterialCommunityIcons name="lock-alert" color={Colors.warning} size={16} />
                    <Text style={styles.warnText}>Choose a strong password (min. 6 characters).</Text>
                  </View>
                  <View style={{ position: 'relative' }}>
                    <FField label="New Password" value={newPass} onChange={setNewPass} secure={!showPass} />
                    <Pressable onPress={() => setShowPass(p => !p)} style={styles.eyeBtn} hitSlop={8}>
                      <MaterialCommunityIcons name={showPass ? 'eye-off' : 'eye'} color={Colors.textMuted} size={20} />
                    </Pressable>
                  </View>
                  <FField label="Confirm Password" value={confirmPass} onChange={setConfirmPass} secure={!showPass} />
                  <PrimaryButton
                    label={saving ? 'Updating…' : 'Change Password'}
                    onPress={changePassword} loading={saving} size="lg"
                    style={{ marginTop: Spacing.xl, backgroundColor: roleColor }}
                  />
                </Card>
              )}
            </>
          ) : (
            // View mode — info cards
            <Card padded={false} style={{ marginTop: Spacing.lg }}>
              {user?.employeeCode && <InfoRow icon="badge-account" label="Employee Code" value={user.employeeCode} />}
              {user?.classTeacherOf && <InfoRow icon="account-group" label="Class Teacher Of" value={`Class ${user.classTeacherOf}`} />}
              {user?.subject && <InfoRow icon="book-open-variant" label="Subject" value={user.subject} />}
              {user?.busNumber && <InfoRow icon="bus" label="Assigned Bus" value={`Bus ${user.busNumber}`} />}
              {user?.gate && <InfoRow icon="gate-open" label="Gate" value={user.gate} />}
              {address && <InfoRow icon="map-marker" label="Address" value={address} />}
            </Card>
          )}

          <PrimaryButton
            label="Sign out"
            variant="outline"
            onPress={signOut}
            style={{ marginTop: Spacing.xl }}
          />
          <Text style={styles.footer}>Made by team NovaThink · KVS Pattom</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function FField({ label, value, onChange, keyboard, multiline, secure, placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  keyboard?: any; multiline?: boolean; secure?: boolean; placeholder?: string;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={fS.label}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange}
        keyboardType={keyboard ?? 'default'}
        secureTextEntry={secure}
        multiline={multiline} numberOfLines={multiline ? 3 : 1}
        placeholder={placeholder ?? ''} placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        style={[fS.input, multiline && { minHeight: 80, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={fS.infoRow}>
      <MaterialCommunityIcons name={icon as any} color={Colors.primary} size={18} />
      <Text style={fS.infoLabel}>{label}</Text>
      <Text style={fS.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const fS = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  input: { marginTop: 6, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.lg, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, width: 130 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
});

const styles = StyleSheet.create({
  hero: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  photoArea: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  photoWrap: { position: 'relative' },
  photo: { width: 80, height: 80, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  photoPlaceholder: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed' },
  photoCam: { position: 'absolute', bottom: -3, right: -3, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  heroText: { flex: 1 },
  heroName: { color: '#fff', fontSize: 20, fontWeight: '900' },
  heroSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, lineHeight: 18 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, alignSelf: 'flex-start', marginTop: 8 },
  roleText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.7 },
  metaRow: { marginTop: Spacing.lg, gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, flex: 1 },
  editToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.md, paddingVertical: 10 },
  editToggleText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  content: { padding: Spacing.xl, paddingBottom: Spacing.xxxl },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.lg },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  tabActive: { borderColor: 'transparent' },
  tabText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  tabTextActive: { color: '#fff' },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.lg },
  noteText: { flex: 1, fontSize: 12, color: Colors.info, fontWeight: '600', lineHeight: 18 },
  warnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.warningBg, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  warnText: { flex: 1, fontSize: 12, color: Colors.warning, fontWeight: '600', lineHeight: 18 },
  eyeBtn: { position: 'absolute', right: 14, bottom: 14 },
  footer: { textAlign: 'center', color: Colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: Spacing.xl },
});

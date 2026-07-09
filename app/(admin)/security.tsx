// Admin: Security Staff Management — Admin creates/manages security guard accounts
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

const supabase = getSupabaseClient();
const GATES = ['Main Gate', 'Back Gate', 'Side Gate A', 'Side Gate B'];
const SHIFTS = ['Morning', 'Afternoon', 'Night', 'Split'];

export default function AdminSecurityManagement() {
  const { showAlert } = useAlert();
  const [guards, setGuards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGuard, setEditGuard] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [guardName, setGuardName] = useState('');
  const [guardNo, setGuardNo] = useState('');
  const [gate, setGate] = useState('Main Gate');
  const [shift, setShift] = useState('Morning');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('KVPATTOM_64');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('*, security_staff(gate, shift)')
      .eq('role', 'security')
      .eq('is_active', true)
      .order('display_name');
    setGuards(data ?? []);
    setLoading(false);
  };

  const openAdd = () => {
    setEditGuard(null);
    setGuardName(''); setGuardNo(''); setGate('Main Gate'); setShift('Morning'); setPhone(''); setPassword('KVPATTOM_64');
    setShowForm(true);
  };

  const openEdit = (g: any) => {
    setEditGuard(g);
    setGuardName(g.display_name ?? '');
    setGuardNo(g.employee_code ?? '');
    setGate(g.security_staff?.[0]?.gate ?? 'Main Gate');
    setShift(g.security_staff?.[0]?.shift ?? 'Morning');
    setPhone(g.phone ?? '');
    setPassword('KVPATTOM_64');
    setShowForm(true);
  };

  const submit = async () => {
    if (!guardName.trim()) { showAlert('Required', 'Enter guard name.'); return; }
    if (!guardNo.trim()) { showAlert('Required', 'Enter guard number (e.g. 1, 2, 3).'); return; }
    setSaving(true);

    const sgNum = guardNo.trim();
    const email = `sg${sgNum}@kvpattom.edu`;

    if (editGuard) {
      // Update profile
      await supabase.from('user_profiles').update({
        display_name: guardName.trim(),
        employee_code: sgNum,
        phone: phone.trim(),
        subtitle: `Security Guard · ${gate} · ${shift}`,
      }).eq('id', editGuard.id);

      // Update/insert security_staff record
      const existing = editGuard.security_staff?.[0];
      if (existing) {
        await supabase.from('security_staff').update({ gate, shift }).eq('user_id', editGuard.id);
      } else {
        await supabase.from('security_staff').insert({ user_id: editGuard.id, gate, shift });
      }
      showAlert('Updated', `${guardName} profile updated.`);
    } else {
      // Create auth account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: password.trim() || 'KVPATTOM_64',
        options: { data: { role: 'security' } },
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        showAlert('Error', signUpError.message);
        setSaving(false);
        return;
      }

      const userId = authData?.user?.id;
      if (userId) {
        await supabase.from('user_profiles').upsert({
          id: userId,
          email,
          display_name: guardName.trim(),
          employee_code: sgNum,
          phone: phone.trim(),
          role: 'security',
          is_active: true,
          subtitle: `Security Guard · ${gate} · ${shift}`,
        });
        await supabase.from('security_staff').upsert({
          user_id: userId,
          gate,
          shift,
        }, { onConflict: 'user_id' });
      }

      showAlert(
        'Guard Created!',
        `Login credentials:\nUsername: SG${sgNum}@KV\nPassword: ${password.trim() || 'KVPATTOM_64'}\n\nShare these with ${guardName}.`
      );
    }

    setSaving(false);
    setShowForm(false);
    load();
  };

  const deactivateGuard = (g: any) => {
    showAlert('Deactivate guard?', `${g.display_name} will lose access.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate', style: 'destructive', onPress: async () => {
          await supabase.from('user_profiles').update({ is_active: false }).eq('id', g.id);
          load();
          showAlert('Done', `${g.display_name} deactivated.`);
        }
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Security Staff" subtitle={`${guards.length} active guards`} />
      </SafeAreaView>

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <MaterialCommunityIcons name="shield-lock" color={Colors.danger} size={16} />
        <Text style={styles.infoText}>Security accounts are created by Admin only. Login format: SG(No.)@KV · Default password: KVPATTOM_64</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.danger} />
        </View>
      ) : (
        <FlatList
          data={guards}
          keyExtractor={g => g.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="shield-account" color={Colors.textMuted} size={56} />
              <Text style={styles.emptyTitle}>No security guards yet</Text>
              <Text style={styles.emptySub}>Tap + to create a guard account</Text>
            </View>
          }
          renderItem={({ item }) => {
            const sgData = item.security_staff?.[0];
            const sgNum = item.employee_code ?? '?';
            return (
              <Card style={styles.guardCard}>
                <View style={styles.row}>
                  <View style={styles.guardAvatar}>
                    <MaterialCommunityIcons name="shield-star" color="#DC2626" size={22} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.guardName}>{item.display_name ?? 'Guard'}</Text>
                    <Text style={styles.guardMeta}>SG{sgNum}@KV · {item.phone || 'No phone'}</Text>
                    <View style={styles.badgeRow}>
                      <Pill label={sgData?.gate ?? 'Main Gate'} tone="info" />
                      <Pill label={sgData?.shift ?? 'Morning'} tone="neutral" />
                    </View>
                  </View>
                </View>

                {/* Credential display */}
                <View style={styles.credBox}>
                  <MaterialCommunityIcons name="key" color={Colors.warning} size={14} />
                  <Text style={styles.credText}>Login: SG{sgNum}@KV · Pass: KVPATTOM_64</Text>
                </View>

                <View style={styles.actionRow}>
                  <Pressable onPress={() => openEdit(item)} style={styles.editBtn}>
                    <MaterialCommunityIcons name="pencil" color={Colors.info} size={14} />
                    <Text style={[styles.btnText, { color: Colors.info }]}>Edit</Text>
                  </Pressable>
                  <Pressable onPress={() => deactivateGuard(item)} style={styles.delBtn}>
                    <MaterialCommunityIcons name="account-remove" color={Colors.danger} size={14} />
                    <Text style={[styles.btnText, { color: Colors.danger }]}>Deactivate</Text>
                  </Pressable>
                </View>
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      <Pressable onPress={openAdd} style={styles.fab}>
        <MaterialCommunityIcons name="plus" color="#fff" size={28} />
      </Pressable>

      {/* Add/Edit Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editGuard ? 'Edit Guard' : 'Add Security Guard'}</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              {!editGuard && (
                <View style={styles.previewBox}>
                  <MaterialCommunityIcons name="information" color={Colors.info} size={16} />
                  <Text style={styles.previewText}>
                    Login will be created automatically:{'\n'}
                    Username: SG{guardNo || '?'}@KV{'\n'}
                    Password: {password || 'KVPATTOM_64'}
                  </Text>
                </View>
              )}

              <FormField label="Guard Name" value={guardName} onChange={setGuardName} placeholder="Full name" />
              <FormField label="Guard Number (for SG username)" value={guardNo} onChange={setGuardNo} placeholder="e.g. 1, 2, 3" keyboard="number-pad" />
              <FormField label="Phone" value={phone} onChange={setPhone} placeholder="10-digit mobile number" keyboard="phone-pad" />

              {!editGuard && (
                <View style={{ marginTop: 14 }}>
                  <Text style={styles.formLabel}>Password</Text>
                  <View style={styles.passWrap}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPass}
                      placeholder="KVPATTOM_64"
                      placeholderTextColor={Colors.textMuted}
                      style={[styles.formInput, { flex: 1 }]}
                    />
                    <Pressable onPress={() => setShowPass(p => !p)} hitSlop={8} style={{ padding: 10 }}>
                      <MaterialCommunityIcons name={showPass ? 'eye-off' : 'eye'} color={Colors.textMuted} size={20} />
                    </Pressable>
                  </View>
                </View>
              )}

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Assigned Gate</Text>
              <View style={styles.chips}>
                {GATES.map(g => (
                  <Pressable key={g} onPress={() => setGate(g)} style={[styles.chip, gate === g && styles.chipActive]}>
                    <Text style={[styles.chipText, gate === g && styles.chipTextActive]}>{g}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Shift</Text>
              <View style={styles.chips}>
                {SHIFTS.map(s => (
                  <Pressable key={s} onPress={() => setShift(s)} style={[styles.chip, shift === s && styles.chipActive]}>
                    <Text style={[styles.chipText, shift === s && styles.chipTextActive]}>{s}</Text>
                  </Pressable>
                ))}
              </View>

              <PrimaryButton
                label={saving ? 'Saving…' : editGuard ? 'Update Guard' : 'Create Guard Account'}
                onPress={submit}
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

function FormField({ label, value, onChange, placeholder, keyboard }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboard?: any;
}) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboard ?? 'default'}
        style={styles.formInput}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.dangerBg, margin: Spacing.xl, marginBottom: Spacing.sm, borderRadius: Radius.md, padding: Spacing.md },
  infoText: { flex: 1, color: Colors.danger, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 100 },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.textMuted },
  emptySub: { fontSize: 13, color: Colors.textMuted },
  guardCard: {},
  row: { flexDirection: 'row', alignItems: 'center' },
  guardAvatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: Colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  guardName: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  guardMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  credBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.warningBg, borderRadius: Radius.sm, padding: 10, marginTop: Spacing.md },
  credText: { fontSize: 12, fontWeight: '700', color: Colors.warning },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: Spacing.md },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: Colors.infoBg, borderRadius: Radius.sm },
  delBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: Colors.dangerBg, borderRadius: Radius.sm },
  btnText: { fontSize: 12, fontWeight: '800' },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', shadowColor: '#DC2626', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  previewBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.infoBg, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg },
  previewText: { flex: 1, color: Colors.info, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  formLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  formInput: { backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary },
  passWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, overflow: 'hidden' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
});

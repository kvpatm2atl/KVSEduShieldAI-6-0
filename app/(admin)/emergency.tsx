// Admin: Emergency Alert System — broadcast school-wide alerts
// All role dashboards show active alert banner
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

const ALERT_TYPES = ['General', 'Fire', 'Medical', 'Security', 'Weather', 'Lockdown'] as const;
const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
type AlertType = typeof ALERT_TYPES[number];
type Severity = typeof SEVERITIES[number];

const TYPE_CONFIG: Record<AlertType, { icon: string; color: string; bg: string }> = {
  General:  { icon: 'bullhorn',          color: Colors.info,    bg: Colors.infoBg },
  Fire:     { icon: 'fire',              color: '#EF4444',       bg: '#FEF2F2' },
  Medical:  { icon: 'medical-bag',       color: '#E11D48',       bg: '#FFF1F2' },
  Security: { icon: 'shield-alert',      color: '#7C3AED',       bg: '#F5F0FF' },
  Weather:  { icon: 'weather-lightning', color: '#F59E0B',       bg: '#FFFBEB' },
  Lockdown: { icon: 'lock-alert',        color: '#DC2626',       bg: '#FEF2F2' },
};

const SEV_CONFIG: Record<Severity, { tone: any; color: string }> = {
  Low:      { tone: 'neutral', color: Colors.textMuted },
  Medium:   { tone: 'warning', color: Colors.warning },
  High:     { tone: 'danger',  color: Colors.danger },
  Critical: { tone: 'danger',  color: '#DC2626' },
};

export default function EmergencyAlerts() {
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'resolved'>('all');

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [alertType, setAlertType] = useState<AlertType>('General');
  const [severity, setSeverity] = useState<Severity>('High');

  useEffect(() => { loadAlerts(); }, []);

  const loadAlerts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('emergency_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setAlerts(data ?? []);
    setLoading(false);
  };

  const activeAlerts = alerts.filter(a => a.is_active);

  const filtered = alerts.filter(a => {
    if (filterActive === 'active') return a.is_active;
    if (filterActive === 'resolved') return !a.is_active;
    return true;
  });

  const createAlert = async () => {
    if (!title.trim() || !message.trim()) {
      showAlert('Required', 'Enter title and message for the alert.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('emergency_alerts').insert({
      title: title.trim(),
      message: message.trim(),
      alert_type: alertType,
      severity,
      is_active: true,
      created_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) { showAlert('Error', error.message); return; }
    showAlert('Alert Sent!', `"${title}" has been broadcast to all users.`);
    setShowForm(false);
    setTitle(''); setMessage('');
    loadAlerts();
  };

  const resolveAlert = (alert: any) => {
    showAlert(
      'Resolve Alert?',
      `Mark "${alert.title}" as resolved? It will be hidden from all users.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resolve', onPress: async () => {
          await supabase.from('emergency_alerts').update({
            is_active: false,
            resolved_at: new Date().toISOString(),
          }).eq('id', alert.id);
          loadAlerts();
          showAlert('Resolved', `"${alert.title}" has been resolved.`);
        }},
      ]
    );
  };

  const deleteAlert = (alert: any) => {
    showAlert('Delete Alert?', `Permanently delete "${alert.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('emergency_alerts').delete().eq('id', alert.id);
        loadAlerts();
      }},
    ]);
  };

  const formatTime = (ts: string) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaView edges={['top']}>
        <ScreenHeader title="Emergency Alerts" subtitle={`${activeAlerts.length} active · Broadcast to all`} />
      </SafeAreaView>

      {/* Active banner */}
      {activeAlerts.length > 0 && (
        <LinearGradient colors={['#7F1D1D', '#DC2626']} style={styles.activeBanner}>
          <MaterialCommunityIcons name="alert-circle" color="#fff" size={22} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.activeBannerTitle}>
              {activeAlerts.length} ACTIVE ALERT{activeAlerts.length > 1 ? 'S' : ''} — SCHOOL-WIDE
            </Text>
            <Text style={styles.activeBannerSub}>
              {activeAlerts[0].title}{activeAlerts.length > 1 ? ` (+${activeAlerts.length - 1} more)` : ''}
            </Text>
          </View>
          <Pill label="LIVE" tone="danger" />
        </LinearGradient>
      )}

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {(['all', 'active', 'resolved'] as const).map(f => (
          <Pressable key={f} onPress={() => setFilterActive(f)}
            style={[styles.filterBtn, filterActive === f && styles.filterBtnActive]}>
            <Text style={[styles.filterBtnText, filterActive === f && styles.filterBtnTextActive]}>
              {f === 'all' ? `All (${alerts.length})` : f === 'active' ? `Active (${activeAlerts.length})` : `Resolved (${alerts.filter(a => !a.is_active).length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={Colors.danger} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={a => a.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="shield-check" color={Colors.success} size={56} />
              <Text style={styles.emptyTitle}>All Clear</Text>
              <Text style={styles.emptySubtitle}>No active emergency alerts.{'\n'}School is operating normally.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const tc = TYPE_CONFIG[item.alert_type as AlertType] ?? TYPE_CONFIG.General;
            const sc = SEV_CONFIG[item.severity as Severity] ?? SEV_CONFIG.High;
            return (
              <Card style={[styles.alertCard, item.is_active && { borderColor: sc.color, borderWidth: 2 }]}>
                <View style={styles.alertHeader}>
                  <View style={[styles.alertIcon, { backgroundColor: tc.bg }]}>
                    <MaterialCommunityIcons name={tc.icon as any} color={tc.color} size={24} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.alertTitle, item.is_active && { color: sc.color }]}>{item.title}</Text>
                    <Text style={styles.alertTime}>{formatTime(item.created_at)}</Text>
                  </View>
                  <View style={{ gap: 4, alignItems: 'flex-end' }}>
                    <Pill label={item.alert_type} tone="danger" />
                    <Pill label={item.severity} tone={sc.tone} />
                  </View>
                </View>

                <Text style={styles.alertMessage}>{item.message}</Text>

                {item.is_active ? (
                  <View style={[styles.activePill, { backgroundColor: '#FEF2F2' }]}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeText}>ACTIVE — Visible to all users right now</Text>
                  </View>
                ) : (
                  <View style={[styles.activePill, { backgroundColor: Colors.successBg }]}>
                    <MaterialCommunityIcons name="check-circle" color={Colors.success} size={12} />
                    <Text style={[styles.activeText, { color: Colors.success }]}>
                      Resolved {item.resolved_at ? formatTime(item.resolved_at) : ''}
                    </Text>
                  </View>
                )}

                <View style={styles.alertActions}>
                  {item.is_active && (
                    <Pressable onPress={() => resolveAlert(item)} style={styles.resolveBtn}>
                      <MaterialCommunityIcons name="check" color={Colors.success} size={14} />
                      <Text style={[styles.actionText, { color: Colors.success }]}>Mark Resolved</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => deleteAlert(item)} style={styles.deleteBtn}>
                    <MaterialCommunityIcons name="delete-outline" color={Colors.danger} size={14} />
                    <Text style={[styles.actionText, { color: Colors.danger }]}>Delete</Text>
                  </Pressable>
                </View>
              </Card>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}

      {/* FAB */}
      <Pressable onPress={() => setShowForm(true)} style={styles.fab}>
        <MaterialCommunityIcons name="plus" color="#fff" size={28} />
      </Pressable>

      {/* Create Alert Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Emergency Alert</Text>
              <Pressable onPress={() => setShowForm(false)} hitSlop={12}>
                <MaterialCommunityIcons name="close" color={Colors.textSecondary} size={24} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
              <View style={styles.warnBanner}>
                <MaterialCommunityIcons name="alert-circle" color={Colors.danger} size={16} />
                <Text style={styles.warnText}>
                  This alert will be immediately visible to ALL users (parents, teachers, staff) across the entire school.
                </Text>
              </View>

              <Text style={styles.formLabel}>Alert Type</Text>
              <View style={styles.typeGrid}>
                {ALERT_TYPES.map(t => {
                  const tc = TYPE_CONFIG[t];
                  return (
                    <Pressable key={t} onPress={() => setAlertType(t)}
                      style={[styles.typeCard, alertType === t && { borderColor: tc.color, borderWidth: 2 }]}>
                      <View style={[styles.typeIcon, { backgroundColor: tc.bg }]}>
                        <MaterialCommunityIcons name={tc.icon as any} color={tc.color} size={20} />
                      </View>
                      <Text style={[styles.typeLabel, alertType === t && { color: tc.color, fontWeight: '800' }]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Severity</Text>
              <View style={styles.chips}>
                {SEVERITIES.map(s => {
                  const sc = SEV_CONFIG[s];
                  return (
                    <Pressable key={s} onPress={() => setSeverity(s)}
                      style={[styles.chip, severity === s && { backgroundColor: sc.color, borderColor: sc.color }]}>
                      <Text style={[styles.chipText, severity === s && { color: '#fff' }]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.formLabel, { marginTop: Spacing.xl }]}>Alert Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Fire drill at 2 PM today"
                placeholderTextColor={Colors.textMuted}
                style={styles.formInput}
                maxLength={100}
              />

              <Text style={[styles.formLabel, { marginTop: Spacing.lg }]}>Full Message *</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Provide full details about the emergency or drill..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                style={[styles.formInput, { minHeight: 110, textAlignVertical: 'top' }]}
              />

              <PrimaryButton
                label={saving ? 'Broadcasting…' : 'Broadcast Alert to All'}
                onPress={createAlert}
                loading={saving}
                size="lg"
                style={{ marginTop: Spacing.xl, backgroundColor: Colors.danger }}
              />
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  activeBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, margin: Spacing.xl, borderRadius: Radius.lg },
  activeBannerTitle: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  activeBannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  filterRow: { flexDirection: 'row', paddingHorizontal: Spacing.xl, gap: 8, marginBottom: Spacing.sm },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: Radius.md, backgroundColor: Colors.surfaceMuted, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border },
  filterBtnActive: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  filterBtnText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  filterBtnTextActive: { color: '#fff' },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 100, paddingTop: Spacing.sm },
  alertCard: { paddingBottom: Spacing.sm },
  alertHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  alertIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  alertTime: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontWeight: '600' },
  alertMessage: { fontSize: 14, color: Colors.textSecondary, lineHeight: 21, marginBottom: Spacing.sm },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, marginBottom: Spacing.sm },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },
  activeText: { fontSize: 11, fontWeight: '800', color: Colors.danger, letterSpacing: 0.4 },
  alertActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  resolveBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.successBg, borderRadius: Radius.sm },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.dangerBg, borderRadius: Radius.sm },
  actionText: { fontSize: 12, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: Colors.success },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 22 },
  fab: { position: 'absolute', right: 24, bottom: 32, width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.danger, alignItems: 'center', justifyContent: 'center', ...Shadows.raised },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.xl, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  form: { padding: Spacing.xl, paddingBottom: 60 },
  warnBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF2F2', borderRadius: Radius.md, padding: 12, marginBottom: Spacing.xl, borderWidth: 1.5, borderColor: Colors.danger + '30' },
  warnText: { flex: 1, fontSize: 12, color: Colors.danger, fontWeight: '600', lineHeight: 18 },
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: { width: '30%', alignItems: 'center', paddingVertical: 12, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border },
  typeIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  typeLabel: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  formInput: { backgroundColor: Colors.surfaceMuted, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
});

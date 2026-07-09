// Landing — Role selector with premium design
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ResponsiveContainer } from '@/components/ui/ResponsiveContainer';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/services/mockData';

const roles: {
  id: Role; title: string; subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string; bg: string;
}[] = [
  { id: 'parent',     title: 'Parent',         subtitle: 'Child safety & academics',       icon: 'account-heart',           color: '#2A6FDB', bg: '#E4EEFC' },
  { id: 'teacher',    title: 'Teacher',         subtitle: 'Attendance, exams & lessons',   icon: 'book-education',          color: '#1FA971', bg: '#E5F7EE' },
  { id: 'admin',      title: 'Administrator',   subtitle: 'School-wide operations',        icon: 'shield-account',          color: '#7C3AED', bg: '#F0ECFD' },
  { id: 'conductor',  title: 'Conductor',       subtitle: 'Bus boarding & student safety', icon: 'bus-clock',               color: '#D97706', bg: '#FEF3C7' },
  { id: 'bus_driver', title: 'Bus Driver',      subtitle: 'Route & trip management',       icon: 'steering',                color: '#059669', bg: '#D1FAE5' },
  { id: 'security',   title: 'Security Guard',  subtitle: 'Gate & early pickup control',   icon: 'shield-star',             color: '#DC2626', bg: '#FEE2E2' },
];

function RoleCard({ item, index, isLarge }: { item: typeof roles[0]; index: number; isLarge: boolean }) {
  const router = useRouter();
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, isLarge && { width: '48%', marginBottom: 14 }]}>
      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        onPress={() => router.push({ pathname: '/login', params: { role: item.id } })}
        style={[styles.roleCard, isLarge && { height: 100 }]}
      >
        <View style={[styles.roleIcon, { backgroundColor: item.bg }]}>
          <MaterialCommunityIcons name={item.icon} color={item.color} size={26} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.roleTitle}>{item.title}</Text>
          <Text style={styles.roleSub}>{item.subtitle}</Text>
        </View>
        <View style={[styles.arrowWrap, { backgroundColor: item.bg }]}>
          <MaterialCommunityIcons name="arrow-right" size={18} color={item.color} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function LandingScreen() {
  const { user, loading } = useAuth();
  const { width } = useWindowDimensions();
  const isLarge = width >= 768;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <Image source={require('@/assets/kvs-logo.png')} style={{ width: 90, height: 90 }} contentFit="contain" />
        <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 24 }} />
        <Text style={styles.loadingText}>Loading KVS EduShield AI…</Text>
      </View>
    );
  }

  if (user) {
    if (user.role === 'parent')    return <Redirect href="/pin" />;
    if (user.role === 'teacher')   return <Redirect href="/(teacher)" />;
    if (user.role === 'admin')     return <Redirect href="/(admin)" />;
    if (user.role === 'conductor') return <Redirect href="/(conductor)" />;
    if (user.role === 'bus_driver')return <Redirect href="/(bus_driver)" />;
    if (user.role === 'security')  return <Redirect href="/(security)" />;
  }

  return (
    <LinearGradient colors={['#060F24', '#0A1A3E', '#0F2A5C']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* Brand header */}
          <Animated.View style={[styles.brandArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.logoWrap}>
              <Image source={require('@/assets/kvs-logo.png')} style={styles.logo} contentFit="contain" />
            </View>
            <Text style={styles.appName}>KVS EduShield AI</Text>
            <Text style={styles.appMotto}>तत् त्वं पूषन् अपावृणु</Text>
            <Text style={styles.appSchool}>Kendriya Vidyalaya Sangathan · Pattom</Text>
          </Animated.View>

          {/* Hero section */}
          <Animated.View style={[styles.heroSection, isLarge && { alignSelf: 'center', width: '100%', maxWidth: 700 }, { opacity: fadeAnim }]}>
            <LinearGradient
              colors={['rgba(42,111,219,0.15)', 'rgba(42,111,219,0.04)']}
              style={styles.heroBanner}
            >
              <MaterialCommunityIcons name="shield-check" color="#4F8EF7" size={32} />
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.heroTitle}>Every Child Safe.{'\n'}Every Parent Informed.</Text>
                <Text style={styles.heroSub}>AI-powered school management for Kendriya Vidyalaya</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Stats row */}
          <Animated.View style={[styles.statsRow, isLarge && { alignSelf: 'center', width: '100%', maxWidth: 700 }, { opacity: fadeAnim }]}>
            {[
              { value: '6', label: 'Roles' },
              { value: '100+', label: 'Students' },
              { value: '5', label: 'Buses' },
              { value: 'AI', label: 'Powered' },
            ].map((s, i) => (
              <View key={i} style={styles.statItem}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Divider */}
          <Animated.View style={[styles.dividerRow, { opacity: fadeAnim }]}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>SELECT YOUR ROLE</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Role cards */}
          <Animated.View style={[styles.cards, isLarge && styles.cardsGrid, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <ResponsiveContainer maxWidth={900} style={isLarge && styles.cardsGridInner}>
              {roles.map((r, i) => <RoleCard key={r.id} item={r} index={i} isLarge={isLarge} />)}
            </ResponsiveContainer>
          </Animated.View>

          {/* Footer */}
          <Animated.View style={[styles.footerRow, { opacity: fadeAnim }]}>
            <MaterialCommunityIcons name="lock-check" size={12} color="rgba(255,255,255,0.4)" />
            <Text style={styles.footerText}>Secured by Supabase Auth · Made by team NovaThink</Text>
          </Animated.View>

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', gap: 8 },
  loadingText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: 8 },
  scroll: { paddingBottom: 40 },

  brandArea: { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.xxl },
  logoWrap: { width: 88, height: 88, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
  logo: { width: 68, height: 68 },
  appName: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 0.3 },
  appMotto: { color: 'rgba(255,200,100,0.9)', fontSize: 12, fontWeight: '700', marginTop: 4, fontStyle: 'italic' },
  appSchool: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4, fontWeight: '500' },

  heroSection: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  heroBanner: { borderRadius: Radius.xl, padding: Spacing.xl, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(79,142,247,0.25)' },
  heroTitle: { color: '#fff', fontSize: 17, fontWeight: '800', lineHeight: 24 },
  heroSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 4, lineHeight: 18 },

  statsRow: { flexDirection: 'row', marginHorizontal: Spacing.xl, marginBottom: Spacing.xl, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: Radius.lg, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 17, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginTop: 2 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.xl, marginBottom: Spacing.lg, gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },

  cards: { paddingHorizontal: Spacing.xl, gap: 10 },
  cardsGrid: { alignItems: 'center' },
  cardsGridInner: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  roleCard: { backgroundColor: '#fff', borderRadius: Radius.xl, padding: Spacing.lg, flexDirection: 'row', alignItems: 'center', ...Shadows.raised },
  roleIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  roleTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  roleSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  arrowWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: Spacing.xxl, paddingHorizontal: Spacing.xl },
  footerText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '500' },
});

// Premium Welcome Screen — KVS official branding
// Powered by OnSpace.AI

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

const FEATURES = [
  {
    icon: 'shield-check' as const,
    color: '#1FA971',
    bg: '#E5F7EE',
    title: 'Every Child Safe',
    body: 'Real-time bus tracking, boarding alerts & gate security — 24/7 protection for your child.',
  },
  {
    icon: 'book-education' as const,
    color: '#2A6FDB',
    bg: '#E4EEFC',
    title: 'Academic Connected',
    body: 'Attendance, homework, exams & lessons — parents and teachers seamlessly connected.',
  },
  {
    icon: 'brain' as const,
    color: '#7C3AED',
    bg: '#F0ECFD',
    title: 'AI-Powered Insights',
    body: 'KVS EduShield AI identifies learning gaps and provides smart guidance for every student.',
  },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.timing(cardAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(btnAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <LinearGradient colors={['#04091E', '#0A1A3E', '#0F2A5C']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Logo + brand */}
        <Animated.View style={[styles.brandArea, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoRing}>
            <Image source={require('@/assets/kvs-logo.png')} style={styles.logo} contentFit="contain" />
          </View>
          <Text style={styles.appName}>KVS EduShield AI</Text>
          <Text style={styles.motto}>तत् त्वं पूषन् अपावृणु</Text>
          <Text style={styles.school}>Kendriya Vidyalaya Sangathan · Pattom</Text>
        </Animated.View>

        {/* Features */}
        <Animated.View style={[styles.features, { opacity: cardAnim }]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: f.bg }]}>
                <MaterialCommunityIcons name={f.icon} color={f.color} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureBody}>{f.body}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Stats strip */}
        <Animated.View style={[styles.statsStrip, { opacity: cardAnim }]}>
          {[
            { value: '6', label: 'Roles' },
            { value: '5+', label: 'Buses' },
            { value: 'AI', label: 'Assistant' },
            { value: '🔒', label: 'Secured' },
          ].map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* CTA */}
        <Animated.View style={[styles.ctaArea, { opacity: btnAnim }]}>
          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
          >
            <LinearGradient
              colors={[Colors.saffron, '#C04800']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.ctaGradient}
            >
              <Text style={styles.ctaText}>Get Started</Text>
              <MaterialCommunityIcons name="arrow-right-circle" color="#fff" size={22} />
            </LinearGradient>
          </Pressable>
          <Text style={styles.footer}>Secured by Supabase Auth · Made by team NovaThink</Text>
        </Animated.View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  brandArea: {
    alignItems: 'center', paddingTop: Spacing.xl, paddingBottom: Spacing.xl, paddingHorizontal: Spacing.xl,
  },
  logoRing: {
    width: 110, height: 110, borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#2A6FDB',
    shadowOpacity: 0.25, shadowRadius: 24, shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  logo: { width: 88, height: 88 },
  appName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 0.2 },
  motto: { color: 'rgba(255,210,100,0.95)', fontSize: 13, fontWeight: '700', marginTop: 5, fontStyle: 'italic' },
  school: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 4, fontWeight: '500' },

  features: { flex: 1, paddingHorizontal: Spacing.xl, gap: 10 },
  featureCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: Radius.xl, padding: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: { width: 50, height: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  featureBody: { color: 'rgba(255,255,255,0.62)', fontSize: 12, lineHeight: 18, marginTop: 3 },

  statsStrip: {
    flexDirection: 'row', marginHorizontal: Spacing.xl, marginTop: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: Radius.lg,
    paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 17, fontWeight: '900' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '700', marginTop: 2 },

  ctaArea: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.xxl, gap: 14 },
  ctaBtn: { borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.raised },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 18 },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500' },
});

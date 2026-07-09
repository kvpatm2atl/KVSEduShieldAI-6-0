// Premium KVS Splash Screen — using official logo
// Powered by OnSpace.AI

import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textSlide = useRef(new Animated.Value(30)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo appears
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      ]),
      Animated.delay(100),
      // 2. App name slides up
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(textSlide, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.delay(100),
      // 3. Tagline + footer
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(footerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(barWidth, { toValue: 1, duration: 2000, useNativeDriver: false }),
      ]),
    ]).start();

    const timer = setTimeout(() => router.replace('/welcome'), 3200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <LinearGradient
      colors={['#F8F9FF', '#EFF4FF', '#E0EAFF']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safe}>
        {/* Decorative circles */}
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        {/* Logo */}
        <Animated.View style={[styles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Image
            source={require('@/assets/kvs-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>

        {/* App name */}
        <Animated.View style={[styles.textWrap, { opacity: textOpacity, transform: [{ translateY: textSlide }] }]}>
          <Text style={styles.appName}>KVS EduShield AI</Text>
          <Text style={styles.school}>Kendriya Vidyalaya Sangathan</Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineWrap, { opacity: taglineOpacity }]}>
          <Text style={styles.taglineHindi}>तत् त्वं पूषन् अपावृणु</Text>
          <Text style={styles.taglineEng}>AI-Powered School Safety & Management</Text>
        </Animated.View>

        {/* Loading bar */}
        <Animated.View style={styles.barWrap}>
          <Animated.View
            style={[
              styles.bar,
              {
                width: barWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </Animated.View>

        {/* Footer */}
        <Animated.View style={[styles.footer, { opacity: footerOpacity }]}>
          <Text style={styles.footerText}>Made by team NovaThink</Text>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  circle1: {
    position: 'absolute', top: -80, right: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(42,111,219,0.06)',
  },
  circle2: {
    position: 'absolute', bottom: -60, left: -60,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: 'rgba(139,58,26,0.05)',
  },
  logoWrap: {
    width: 180, height: 180,
    backgroundColor: '#fff',
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2A6FDB',
    shadowOpacity: 0.14,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(42,111,219,0.1)',
    marginBottom: 32,
  },
  logo: { width: 140, height: 140 },
  textWrap: { alignItems: 'center', gap: 6, marginBottom: 16 },
  appName: {
    fontSize: 28, fontWeight: '900',
    color: '#0A1A3E', letterSpacing: -0.3,
  },
  school: {
    fontSize: 14, fontWeight: '600',
    color: '#4A6A9E',
  },
  taglineWrap: { alignItems: 'center', gap: 4, marginBottom: 48 },
  taglineHindi: { fontSize: 14, fontWeight: '700', color: '#8B1A1A', fontStyle: 'italic' },
  taglineEng: { fontSize: 12, color: '#6B7EA8', fontWeight: '500' },
  barWrap: {
    width: 200, height: 4,
    backgroundColor: 'rgba(42,111,219,0.12)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  bar: {
    height: '100%',
    backgroundColor: '#2A6FDB',
    borderRadius: 2,
  },
  footer: { position: 'absolute', bottom: 28 },
  footerText: { fontSize: 12, color: '#9AACC0', fontWeight: '600' },
});

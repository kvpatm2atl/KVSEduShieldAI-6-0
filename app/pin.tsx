// Parent Safety PIN screen — compulsory, premium UI
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { getSupabaseClient } from '@/template';

const supabase = getSupabaseClient();
const PIN_LENGTH = 4;

const PAD_KEYS = ['1','2','3','4','5','6','7','8','9','','0','del'];

export default function PinScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'loading' | 'set' | 'confirm' | 'enter'>('loading');
  const [tempPin, setTempPin] = useState('');
  const [error, setError] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentSection, setStudentSection] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotScales = useRef(Array.from({ length: PIN_LENGTH }, () => new Animated.Value(1))).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    checkPinAndStudent();
  }, []);

  const checkPinAndStudent = async () => {
    if (!user?.id) { setMode('set'); return; }
    const { data } = await supabase
      .from('user_profiles')
      .select('safety_pin')
      .eq('id', user.id)
      .single();

    // Load student info
    const { data: student } = await supabase
      .from('students')
      .select('name, section')
      .eq('parent_user_id', user.id)
      .maybeSingle();
    if (student) {
      setStudentName(student.name);
      setStudentSection(student.section);
    }

    setMode(!data?.safety_pin ? 'set' : 'enter');
  };

  const shake = () => {
    Vibration.vibrate([0, 100, 50, 100]);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 14, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -14, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  };

  const animateDot = (index: number) => {
    Animated.sequence([
      Animated.timing(dotScales[index], { toValue: 1.3, duration: 80, useNativeDriver: true }),
      Animated.spring(dotScales[index], { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  };

  const handleDigit = async (d: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const newPin = pin + d;
    animateDot(newPin.length - 1);
    setPin(newPin);
    setError('');

    if (newPin.length === PIN_LENGTH) {
      await new Promise(r => setTimeout(r, 120));

      if (mode === 'set') {
        setTempPin(newPin);
        setMode('confirm');
        setPin('');
      } else if (mode === 'confirm') {
        if (newPin === tempPin) {
          await supabase.from('user_profiles').update({ safety_pin: newPin }).eq('id', user!.id);
          router.replace('/(parent)');
        } else {
          shake();
          setError('PINs do not match. Try again.');
          setPin(''); setTempPin('');
          setMode('set');
        }
      } else {
        const { data } = await supabase.from('user_profiles').select('safety_pin').eq('id', user!.id).single();
        if (data?.safety_pin === newPin) {
          router.replace('/(parent)');
        } else {
          shake();
          setError('Incorrect PIN. Try again.');
          setPin('');
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError('');
  };

  const titleMap = {
    loading: 'Loading…',
    set: 'Create Safety PIN',
    confirm: 'Confirm Your PIN',
    enter: 'Enter Safety PIN',
  };
  const subtitleMap = {
    loading: '',
    set: 'Set a 4-digit PIN to protect your child\'s data',
    confirm: 'Re-enter the same PIN to confirm',
    enter: studentName ? `Welcome back! Enter PIN to continue` : 'Enter your 4-digit safety PIN',
  };

  return (
    <LinearGradient colors={['#060F24', '#0A1A3E', '#0F2A5C']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

          {/* Logo */}
          <View style={styles.logoWrap}>
            <Image source={require('@/assets/kvs-logo.png')} style={styles.logo} contentFit="contain" />
          </View>

          {/* Student info card */}
          {(studentName && mode === 'enter') ? (
            <View style={styles.studentCard}>
              <MaterialCommunityIcons name="account-child" color="#4F8EF7" size={20} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.studentName}>{studentName}</Text>
                <Text style={styles.studentSec}>Section {studentSection}</Text>
              </View>
            </View>
          ) : null}

          {/* Title */}
          <Text style={styles.title}>{titleMap[mode]}</Text>
          <Text style={styles.subtitle}>{subtitleMap[mode]}</Text>

          {/* Mode indicator for set/confirm */}
          {(mode === 'set' || mode === 'confirm') && (
            <View style={styles.stepsRow}>
              <View style={[styles.step, mode === 'set' && styles.stepActive]}>
                <Text style={[styles.stepText, mode === 'set' && styles.stepTextActive]}>1</Text>
              </View>
              <View style={styles.stepLine} />
              <View style={[styles.step, mode === 'confirm' && styles.stepActive]}>
                <Text style={[styles.stepText, mode === 'confirm' && styles.stepTextActive]}>2</Text>
              </View>
            </View>
          )}

          {/* PIN dots */}
          <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && styles.dotFilled,
                  error && styles.dotError,
                  { transform: [{ scale: dotScales[i] }] },
                ]}
              />
            ))}
          </Animated.View>

          {error
            ? <Text style={styles.error}>{error}</Text>
            : <View style={{ height: 22 }} />
          }

          {/* Keypad */}
          <View style={styles.keypad}>
            {PAD_KEYS.map((d, i) => {
              if (d === '') return <View key={i} style={styles.keyEmpty} />;
              if (d === 'del') {
                return (
                  <Pressable key={i} onPress={handleDelete}
                    style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                    hitSlop={8}
                  >
                    <MaterialCommunityIcons name="backspace-outline" color="rgba(255,255,255,0.85)" size={26} />
                  </Pressable>
                );
              }
              return (
                <Pressable key={i} onPress={() => handleDigit(d)}
                  style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
                >
                  <Text style={styles.keyText}>{d}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Security note */}
          <View style={styles.secNote}>
            <MaterialCommunityIcons name="shield-lock" color="rgba(255,255,255,0.4)" size={14} />
            <Text style={styles.secNoteText}>PIN protects your child's school data</Text>
          </View>

          {/* Sign out */}
          <Pressable onPress={async () => { await logout(); router.replace('/'); }} style={styles.signOutBtn}>
            <MaterialCommunityIcons name="logout" color="rgba(255,255,255,0.5)" size={15} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>

          <Text style={styles.footer}>Made by team NovaThink · Kendriya Vidyalaya Pattom</Text>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', paddingTop: Spacing.xl },
  logoWrap: { width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', marginBottom: Spacing.xl },
  logo: { width: 52, height: 52 },
  studentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', marginBottom: Spacing.xl },
  studentName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  studentSec: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 1 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: 48, lineHeight: 20 },
  stepsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 10 },
  step: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  stepActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  stepText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '800' },
  stepTextActive: { color: '#fff' },
  stepLine: { width: 32, height: 2, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotsRow: { flexDirection: 'row', gap: 18, marginTop: 30, marginBottom: 6 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: '#4F8EF7', borderColor: '#4F8EF7' },
  dotError: { borderColor: '#EF4444', backgroundColor: '#EF444433' },
  error: { color: '#F87171', fontSize: 13, fontWeight: '600', height: 22, marginTop: 2 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 288, gap: 14, marginTop: 22 },
  key: { width: 82, height: 82, borderRadius: 41, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' },
  keyPressed: { backgroundColor: 'rgba(255,255,255,0.2)', transform: [{ scale: 0.93 }] },
  keyEmpty: { width: 82, height: 82 },
  keyText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  secNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 28 },
  secNoteText: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '600' },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20 },
  signOutText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
  footer: { position: 'absolute', bottom: 20, color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500', textAlign: 'center' },
});

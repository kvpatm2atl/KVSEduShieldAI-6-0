// Status pill / chip
// Powered by OnSpace.AI

import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Tone = 'success' | 'info' | 'warning' | 'danger' | 'neutral' | 'primary';

interface PillProps {
  label: string;
  tone?: Tone;
}

const tones: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: Colors.successBg, fg: Colors.success },
  info: { bg: Colors.infoBg, fg: Colors.info },
  warning: { bg: Colors.warningBg, fg: Colors.warning },
  danger: { bg: Colors.dangerBg, fg: Colors.danger },
  neutral: { bg: Colors.surfaceMuted, fg: Colors.textSecondary },
  primary: { bg: '#E4ECFB', fg: Colors.primary },
};

export function Pill({ label, tone = 'neutral' }: PillProps) {
  const c = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

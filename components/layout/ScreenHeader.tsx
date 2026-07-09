// Branded screen header
// Powered by OnSpace.AI

import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  rightAction?: React.ReactNode;
  variant?: 'gradient' | 'flat';
}

export function ScreenHeader({ title, subtitle, right, rightAction, variant = 'gradient' }: ScreenHeaderProps) {
  if (variant === 'flat') {
    return (
      <View style={styles.flat}>
        <View style={{ flex: 1 }}>
          <Text style={styles.titleDark}>{title}</Text>
          {subtitle ? <Text style={styles.subDark}>{subtitle}</Text> : null}
        </View>
        {right ?? rightAction}
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.primaryDark, Colors.primary, Colors.primaryLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.grad}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        {right ?? rightAction}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  grad: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  sub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  flat: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  titleDark: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  subDark: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
});

// Primary CTA button
// Powered by OnSpace.AI

import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'ghost' | 'saffron';
  size?: 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  icon?: React.ReactNode;
}

export function PrimaryButton({
  label,
  onPress,
  variant = 'solid',
  size = 'md',
  loading,
  disabled,
  style,
  icon,
}: PrimaryButtonProps) {
  const bg =
    variant === 'solid' ? Colors.primary
    : variant === 'saffron' ? Colors.saffron
    : variant === 'outline' ? 'transparent'
    : 'transparent';
  const fg =
    variant === 'solid' || variant === 'saffron' ? Colors.textInverse
    : Colors.primary;
  const border = variant === 'outline' ? Colors.primary : 'transparent';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        size === 'lg' && styles.lg,
        { backgroundColor: bg, borderColor: border, borderWidth: variant === 'outline' ? 1.5 : 0 },
        (variant === 'solid' || variant === 'saffron') && Shadows.card,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style as any,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: fg }, icon ? { marginLeft: 8 } : null]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  lg: {
    height: 56,
    borderRadius: Radius.lg,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

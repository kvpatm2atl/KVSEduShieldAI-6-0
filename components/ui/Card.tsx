// Reusable Card surface
// Powered by OnSpace.AI

import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  padded?: boolean;
}

export function Card({ children, style, padded = true }: CardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, style as any]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    ...Shadows.card,
  },
  padded: {
    padding: Spacing.lg,
  },
});

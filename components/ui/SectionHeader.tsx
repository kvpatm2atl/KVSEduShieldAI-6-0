// Section header w/ optional action
// Powered by OnSpace.AI

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  subtitle?: string;
}

export function SectionHeader({ title, actionLabel, onAction, subtitle }: SectionHeaderProps) {
  return (
    <View style={styles.wrap}>
      <View style={{ flex: 1 }}>
        <Text style={Typography.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sub: {
    fontSize: 13,
    color: Colors.textMuted,
    marginTop: 2,
  },
  action: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

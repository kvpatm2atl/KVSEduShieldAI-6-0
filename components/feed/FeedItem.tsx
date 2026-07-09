// Parent feed item w/ icon + status
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { FeedItem as FeedItemType, FeedKind } from '@/services/mockData';

const kindMeta: Record<FeedKind, { icon: keyof typeof MaterialCommunityIcons.glyphMap; bg: string; fg: string; tag: string }> = {
  bus_boarded:   { icon: 'bus',                bg: '#E4ECFB', fg: Colors.primary, tag: 'BOARDED' },
  school_arrived:{ icon: 'school',             bg: Colors.successBg, fg: Colors.success, tag: 'AT SCHOOL' },
  return_boarded:{ icon: 'bus-clock',          bg: '#E4ECFB', fg: Colors.primary, tag: 'RETURN' },
  home_arrived:  { icon: 'home-heart',         bg: Colors.successBg, fg: Colors.success, tag: 'HOME' },
  attendance:    { icon: 'check-circle',       bg: Colors.successBg, fg: Colors.success, tag: 'PRESENT' },
  lesson:        { icon: 'book-open-variant',  bg: Colors.infoBg, fg: Colors.info, tag: 'LESSON' },
  homework:      { icon: 'clipboard-text',     bg: Colors.warningBg, fg: Colors.warning, tag: 'HOMEWORK' },
  notice:        { icon: 'bullhorn',           bg: '#FFE9DC', fg: Colors.saffron, tag: 'NOTICE' },
  incident:      { icon: 'alert-circle',       bg: Colors.dangerBg, fg: Colors.danger, tag: 'INCIDENT' },
  remark:        { icon: 'message-text',       bg: '#EEEAFB', fg: '#6E55C2', tag: 'REMARK' },
};

interface Props {
  item: FeedItemType;
}

export function FeedItemCard({ item }: Props) {
  const meta = kindMeta[item.kind];
  return (
    <View style={styles.row}>
      <View style={styles.timeline}>
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <MaterialCommunityIcons name={meta.icon} size={22} color={meta.fg} />
        </View>
        <View style={styles.line} />
      </View>
      <View style={[styles.card, Shadows.card]}>
        <View style={styles.headerRow}>
          <Text style={[styles.tag, { color: meta.fg, backgroundColor: meta.bg }]}>{meta.tag}</Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
  },
  timeline: {
    width: 44,
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginLeft: Spacing.md,
    marginBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    overflow: 'hidden',
  },
  time: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  detail: {
    marginTop: Spacing.sm,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    backgroundColor: Colors.surfaceMuted,
    padding: Spacing.md,
    borderRadius: Radius.sm,
  },
});

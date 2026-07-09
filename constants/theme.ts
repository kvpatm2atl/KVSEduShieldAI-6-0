// KVS EduShield AI theme tokens
// Powered by OnSpace.AI

export const Colors = {
  // Brand
  primary: '#0F2A5C',
  primaryDark: '#081A3D',
  primaryLight: '#1F4280',
  saffron: '#FF7A2E',
  saffronLight: '#FFB37D',

  // Surfaces
  background: '#F5F7FB',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF1F8',
  surfaceTint: '#E8EEFA',

  // Text
  textPrimary: '#0E1A33',
  textSecondary: '#4A5878',
  textMuted: '#8892AB',
  textInverse: '#FFFFFF',

  // Semantic
  success: '#1FA971',
  successBg: '#E5F7EE',
  warning: '#E8A317',
  warningBg: '#FFF6E1',
  danger: '#E0414C',
  dangerBg: '#FDE7E9',
  info: '#2A6FDB',
  infoBg: '#E4EEFC',

  // Border
  border: '#E2E7F2',
  borderStrong: '#C8D1E3',

  // Misc
  overlay: 'rgba(15, 42, 92, 0.6)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
};

export const Typography = {
  pageTitle: { fontSize: 22, fontWeight: '700' as const, color: Colors.textPrimary },
  sectionTitle: { fontSize: 18, fontWeight: '600' as const, color: Colors.textPrimary },
  cardTitle: { fontSize: 16, fontWeight: '600' as const, color: Colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400' as const, color: Colors.textPrimary },
  bodyStrong: { fontSize: 15, fontWeight: '600' as const, color: Colors.textPrimary },
  caption: { fontSize: 13, fontWeight: '500' as const, color: Colors.textSecondary },
  micro: { fontSize: 11, fontWeight: '600' as const, color: Colors.textMuted },
  button: { fontSize: 16, fontWeight: '600' as const, color: Colors.textInverse },
};

export const Shadows = {
  card: {
    shadowColor: '#0F2A5C',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  raised: {
    shadowColor: '#0F2A5C',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
};

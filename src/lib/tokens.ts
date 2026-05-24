// Timely — design tokens (ported from Resonera/tokens.css)
export const colors = {
  background: '#FFFFFF',
  foreground: '#141414',
  card: '#F8F9FA',
  surfaceAlt: '#FAFAFA',
  primary: '#141414',
  primaryForeground: '#FFFFFF',
  muted: '#F2F2F2',
  mutedForeground: '#6B7280',
  border: '#E5E7EB',

  fg1: 'rgba(0,0,0,1)',
  fg2: 'rgba(0,0,0,0.70)',
  fg3: 'rgba(0,0,0,0.55)',
  fg4: 'rgba(0,0,0,0.50)',
  fg5: 'rgba(0,0,0,0.45)',
  fg6: 'rgba(0,0,0,0.40)',
  fg7: 'rgba(0,0,0,0.35)',
  fg8: 'rgba(0,0,0,0.25)',
  fg9: 'rgba(0,0,0,0.20)',

  fgInv1: 'rgba(255,255,255,1)',
  fgInv2: 'rgba(255,255,255,0.60)',
  fgInv3: 'rgba(255,255,255,0.50)',
  fgInv4: 'rgba(255,255,255,0.40)',
  fgInv5: 'rgba(255,255,255,0.35)',

  bgTint02: 'rgba(0,0,0,0.02)',
  bgTint04: 'rgba(0,0,0,0.04)',
  bgTint05: 'rgba(0,0,0,0.05)',
  bgTint06: 'rgba(0,0,0,0.06)',

  border04: 'rgba(0,0,0,0.04)',
  border06: 'rgba(0,0,0,0.06)',
  border08: 'rgba(0,0,0,0.08)',
  border10: 'rgba(0,0,0,0.10)',
  border12: 'rgba(0,0,0,0.12)',
  border15: 'rgba(0,0,0,0.15)',
  border20: 'rgba(0,0,0,0.20)',
  border25: 'rgba(0,0,0,0.25)',

  borderInv10: 'rgba(255,255,255,0.10)',
  borderInv15: 'rgba(255,255,255,0.15)',
  borderInv20: 'rgba(255,255,255,0.20)',

  destructive: '#DC2626',
};

export const radius = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  pill: 9999,
};

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
};

export const typography = {
  fontDisplay: 'System', // will be Plus Jakarta Sans via expo-font
  fontMono: 'Courier',   // monospace fallback
};

// Per-slot colors for up to 4 household members
export const SLOT_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  '1': { bg: '#141414', fg: '#ffffff', border: '#141414' },           // filled black (was M)
  '2': { bg: '#ffffff', fg: '#141414', border: '#141414' },           // outlined (was A)
  '3': { bg: '#484848', fg: '#ffffff', border: '#484848' },           // dark grey
  '4': { bg: '#D4D4D4', fg: '#141414', border: '#A0A0A0' },           // light grey
  'B': { bg: '#141414', fg: '#ffffff', border: '#141414' },           // both/together
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 15,
    elevation: 8,
  },
  xlBlack: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.30,
    shadowRadius: 25,
    elevation: 16,
  },
};

import React from 'react';
import {
  View, Text, TouchableOpacity, Switch as RNSwitch,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { colors, radius, shadows, SLOT_COLORS } from '../lib/tokens';
import { Icon } from './Icon';
import type { UserId } from '../lib/types';
import { useStore } from '../lib/store';

// ─── UserChip ───────────────────────────────────────────────
type ChipSize = 'sm' | 'lg' | 'xl';

const CHIP_DIMS: Record<ChipSize, { sz: number; r: number; fs: number; iconSz: number }> = {
  sm: { sz: 18, r: 5,  fs: 9,  iconSz: 10 },
  lg: { sz: 30, r: 9,  fs: 12, iconSz: 12 },
  xl: { sz: 44, r: 12, fs: 15, iconSz: 16 },
};

export function UserChip({ id, size = 'sm', priv }: { id: UserId | 'B'; size?: ChipSize; priv?: boolean }) {
  const { state } = useStore();
  const d = CHIP_DIMS[size];
  const base: ViewStyle = { width: d.sz, height: d.sz, borderRadius: d.r, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };

  if (priv) {
    return (
      <View style={[base, { backgroundColor: colors.foreground, borderWidth: 1.5, borderColor: colors.foreground }]}>
        <Icon name="lock" size={d.iconSz} color="#fff" />
      </View>
    );
  }

  if (id === 'B') {
    return (
      <View style={[base, { flexDirection: 'row', borderWidth: 1.5, borderColor: colors.foreground }]}>
        <View style={{ flex: 1, height: '100%', backgroundColor: colors.foreground }} />
        <View style={{ flex: 1, height: '100%', backgroundColor: '#fff' }} />
      </View>
    );
  }

  const slotColor = SLOT_COLORS[id] ?? SLOT_COLORS['1'];
  const initial = (state.profiles[id]?.displayName?.[0] ?? id).toUpperCase();

  return (
    <View style={[base, { backgroundColor: slotColor.bg, borderWidth: 1.5, borderColor: slotColor.border }]}>
      <Text style={{ fontFamily: 'Courier', fontSize: d.fs, fontWeight: '700', color: slotColor.fg }}>{initial}</Text>
    </View>
  );
}

// ─── UserStripe ─────────────────────────────────────────────
export function UserStripe({ id, priv }: { id: UserId | 'B' | 'priv'; priv?: boolean }) {
  const base: ViewStyle = { width: 4, borderRadius: 2 };
  if (priv || id === 'priv') {
    return <View style={[base, { backgroundColor: colors.foreground, borderWidth: 1, borderColor: colors.foreground }]} />;
  }
  if (id === 'B') {
    return (
      <View style={[base, { borderWidth: 1.5, borderColor: colors.foreground, overflow: 'hidden' }]}>
        <View style={{ flex: 1, backgroundColor: colors.foreground }} />
        <View style={{ flex: 1, backgroundColor: '#fff' }} />
      </View>
    );
  }
  const slotColor = SLOT_COLORS[id] ?? SLOT_COLORS['1'];
  return <View style={[base, { backgroundColor: slotColor.bg, borderWidth: slotColor.bg === '#ffffff' ? 1.5 : 0, borderColor: slotColor.border }]} />;
}

// ─── Tag ────────────────────────────────────────────────────
export function Tag({ children, solid, ghost, dark }: { children: React.ReactNode; solid?: boolean; ghost?: boolean; dark?: boolean }) {
  return (
    <View style={[
      styles.tag,
      solid && { backgroundColor: colors.foreground, borderColor: colors.foreground },
      ghost && { backgroundColor: 'transparent', borderColor: 'transparent' },
      dark && { borderColor: colors.borderInv15, backgroundColor: 'transparent' },
    ]}>
      {children}
    </View>
  );
}

// ─── SecLabel ───────────────────────────────────────────────
export function SecLabel({ children, count, right }: { children: React.ReactNode; count?: number; right?: React.ReactNode }) {
  return (
    <View style={[styles.row, { marginBottom: 12, gap: 10 }]}>
      <Text style={styles.monoSm}>{children}</Text>
      {count !== undefined && <Text style={[styles.monoSm, { color: colors.fg7 }]}>· {String(count).padStart(2, '0')}</Text>}
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border08 }} />
      {right}
    </View>
  );
}

// ─── Switch ─────────────────────────────────────────────────
export function AppSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <RNSwitch
      value={value}
      onValueChange={onChange}
      trackColor={{ false: colors.bgTint06, true: colors.foreground }}
      thumbColor="#fff"
      ios_backgroundColor={colors.bgTint06}
    />
  );
}

// ─── ScreenHeader ───────────────────────────────────────────
export function ScreenHeader({
  eyebrow, title, ghost, sub, right,
}: {
  eyebrow: React.ReactNode;
  title: string;
  ghost?: string;
  sub?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={[styles.row, { alignItems: 'flex-start', marginBottom: 20 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.screenTitle}>
          {title}
          {ghost ? <Text style={{ color: colors.fg9 }}> {ghost}</Text> : null}
        </Text>
        {sub ? <Text style={styles.screenSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

// ─── Card ───────────────────────────────────────────────────
export function Card({ children, style, tight }: { children: React.ReactNode; style?: ViewStyle; tight?: boolean }) {
  return (
    <View style={[styles.card, tight && styles.cardTight, style]}>
      {children}
    </View>
  );
}

export function CardInv({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.cardInv, style]}>
      {children}
    </View>
  );
}

export function CardAlt({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.cardAlt, style]}>
      {children}
    </View>
  );
}

// ─── IconBtn ────────────────────────────────────────────────
export function IconBtn({ onPress, inv, children }: { onPress: () => void; inv?: boolean; children: React.ReactNode }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.iconBtn,
        inv && { backgroundColor: colors.foreground, borderColor: colors.foreground },
      ]}>
      {children}
    </TouchableOpacity>
  );
}

// ─── EventRow ───────────────────────────────────────────────
import { toMins, mins, fmtHM } from '../lib/utils';
import type { CalEvent } from '../lib/types';

export function EventRow({ ev, viewer, onPress }: { ev: CalEvent; viewer: UserId; onPress: () => void }) {
  const { state } = useStore();
  const hidden = ev.priv && ev.who !== 'B' && ev.who !== viewer;
  const dur = mins(ev.start, ev.end);
  const whoName = ev.who === 'B' ? 'TOGETHER' : (state.profiles[ev.who as UserId]?.displayName?.toUpperCase() ?? ev.who);

  return (
    <TouchableOpacity onPress={onPress} style={[styles.card, styles.eventRow]}>
      <View style={{ gap: 4, minWidth: 50 }}>
        <Text style={styles.eventTime}>{ev.start}</Text>
        <Text style={styles.monoXs}>
          {dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 ? ` ${dur % 60}m` : ''}` : `${dur}m`}
        </Text>
      </View>
      <UserStripe id={ev.who} priv={hidden} />
      <View style={{ flex: 1 }}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {hidden ? 'Private · busy' : ev.title}
        </Text>
        <Text style={styles.monoXs}>
          {hidden
            ? `${whoName} · ${ev.start}—${ev.end}`
            : `${ev.loc} · ${whoName}${ev.priv ? ' · PRIVATE' : ''}`
          }
        </Text>
      </View>
      <View style={[styles.row, { gap: 4 }]}>
        {ev.priv && !hidden && <Icon name="lock" size={12} color={colors.fg6} />}
        <UserChip id={ev.who} priv={hidden} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Divider ────────────────────────────────────────────────
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: colors.border06, marginVertical: 16 }, style]} />;
}

// ─── Styles ─────────────────────────────────────────────────
export const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  between: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border08,
    borderRadius: 18,
    padding: 18,
    ...shadows.sm,
  } as ViewStyle,
  cardTight: {
    padding: 14,
  } as ViewStyle,
  cardInv: {
    backgroundColor: colors.foreground,
    borderRadius: 18,
    padding: 20,
    ...shadows.xlBlack,
  } as ViewStyle,
  cardAlt: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: colors.border08,
    borderRadius: 18,
    padding: 18,
  } as ViewStyle,
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 22,
    paddingHorizontal: 9,
    borderWidth: 1,
    borderColor: colors.border12,
    backgroundColor: colors.bgTint04,
    borderRadius: 9999,
  } as ViewStyle,
  monoXs: {
    fontFamily: 'Courier',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    color: colors.fg5,
  } as TextStyle,
  monoSm: {
    fontFamily: 'Courier',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.2,
    color: colors.fg5,
  } as TextStyle,
  eyebrow: {
    fontFamily: 'Courier',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    color: colors.fg5,
  } as TextStyle,
  screenTitle: {
    fontWeight: '900',
    fontSize: 38,
    lineHeight: 46,
    letterSpacing: -1.3,
    marginTop: 8,
    color: colors.fg1,
  } as TextStyle,
  screenSub: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '300',
    color: colors.fg5,
  } as TextStyle,
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.bgTint04,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border08,
  } as ViewStyle,
  eventRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    padding: 12,
  } as ViewStyle,
  eventTime: {
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: -0.2,
    color: colors.fg1,
  } as TextStyle,
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
    color: colors.fg1,
  } as TextStyle,
  statNum: {
    fontWeight: '900',
    letterSpacing: -1.3,
    color: colors.fg1,
  } as TextStyle,
});

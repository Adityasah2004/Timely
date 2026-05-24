import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/tokens';
import { toMins, amPm } from '../../lib/utils';
import { ScreenHeader, CardInv, CardAlt, Card, SecLabel, UserChip, UserStripe, AppSwitch, IconBtn, styles } from '../../components/Primitives';
import { Icon } from '../../components/Icon';
import type { Alarm } from '../../lib/types';
import { USER_LIST } from '../../data/seed';

function SharedChips({ activeSlots }: { activeSlots: import('../../lib/types').UserId[] }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      {activeSlots.map((u, i) => (
        <View key={u} style={{ marginLeft: i > 0 ? -6 : 0 }}><UserChip id={u} /></View>
      ))}
    </View>
  );
}

function AlarmRow({ a, dispatch, activeSlots }: { a: Alarm; dispatch: (action: any) => void; activeSlots: import('../../lib/types').UserId[] }) {
  return (
    <View style={[styles.row, { padding: 14, paddingHorizontal: 16, alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border06 }]}>
      <View style={{ flex: 1, opacity: a.on ? 1 : 0.42 }}>
        <View style={[styles.row, { gap: 8, alignItems: 'baseline' }]}>
          <Text style={{ fontWeight: '800', fontSize: 28, lineHeight: 28, letterSpacing: -0.8, color: colors.fg1 }}>{a.time}</Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5 }}>{amPm(a.time)}</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '500', marginTop: 4, letterSpacing: -0.1 }}>{a.label}</Text>
        <View style={[styles.row, { gap: 8, marginTop: 6 }]}>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>{a.days}</Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg7 }}>· {a.sound.toUpperCase()}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 10 }}>
        {a.shared ? (
          <SharedChips activeSlots={activeSlots} />
        ) : (
          <UserChip id={a.who ?? activeSlots[0] ?? '1'} />
        )}
        <AppSwitch value={a.on} onChange={(v) => dispatch({ t: 'toggleAlarm', id: a.id, v })} />
      </View>
    </View>
  );
}

export function AlarmsScreen() {
  const { state, dispatch } = useStore();
  const alarms = state.alarms;
  const activeSlots = USER_LIST.filter(u => state.profiles[u]);
  const myPrefs = state.profiles[state.viewer]?.preferences as Record<string, string> | undefined ?? {};
  const bedtime = myPrefs.bedtime ?? '23:00 → 06:00';
  const shared = alarms.filter(a => a.shared);
  const personal = alarms.filter(a => !a.shared);
  const onCount = alarms.filter(a => a.on).length;

  const nextAlarm = (() => {
    const now = state.clock;
    const nm = now.getHours() * 60 + now.getMinutes();
    const onA = alarms.filter(a => a.on);
    const future = onA.filter(a => toMins(a.time) > nm).sort((a, b) => toMins(a.time) - toMins(b.time));
    return future[0] || onA.sort((a, b) => toMins(a.time) - toMins(b.time))[0];
  })();

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 130 }}>
      <ScreenHeader
        eyebrow={`ALARMS · ${onCount} OF ${alarms.length} ON`}
        title="A clock"
        ghost="for two."
        sub="Shared alarms ring on both phones. Personal stays personal."
        right={
          <IconBtn inv onPress={() => dispatch({ t: 'openNewAlarm' })}>
            <Icon name="plus" size={18} color="#fff" />
          </IconBtn>
        }
      />

      {nextAlarm && (
        <CardInv style={{ marginBottom: 22 }}>
          <View style={[styles.between, { marginBottom: 14 }]}>
            <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fgInv4 }}>
              NEXT · {nextAlarm.shared ? 'SHARED' : 'PERSONAL'}
            </Text>
            {nextAlarm.shared ? (
              <SharedChips activeSlots={activeSlots} />
            ) : <UserChip id={nextAlarm.who ?? activeSlots[0] ?? '1'} />}
          </View>
          <View style={[styles.row, { alignItems: 'baseline', gap: 12 }]}>
            <Text style={{ fontWeight: '900', fontSize: 72, lineHeight: 65, letterSpacing: -3, color: '#fff' }}>{nextAlarm.time}</Text>
            <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fgInv4 }}>
              {amPm(nextAlarm.time)}
            </Text>
          </View>
          <Text style={{ fontSize: 14, fontWeight: '300', color: colors.fgInv2, marginTop: 8 }}>{nextAlarm.label}</Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fgInv4, marginTop: 14 }}>
            {nextAlarm.days} · {nextAlarm.sound.toUpperCase()}
          </Text>
        </CardInv>
      )}

      <SecLabel count={shared.length}>Shared · the house</SecLabel>
      <Card style={{ padding: 0, marginBottom: 22, overflow: 'hidden' }}>
        {shared.map((a, i, arr) => (
          <View key={a.id} style={{ borderBottomWidth: i === arr.length - 1 ? 0 : 0 }}>
            <AlarmRow a={a} dispatch={dispatch} activeSlots={activeSlots} />
          </View>
        ))}
      </Card>

      <SecLabel count={personal.length}>Personal</SecLabel>
      <Card style={{ padding: 0, marginBottom: 22, overflow: 'hidden' }}>
        {personal.map((a, i, arr) => (
          <View key={a.id}>
            <AlarmRow a={a} dispatch={dispatch} activeSlots={activeSlots} />
          </View>
        ))}
      </Card>

      <CardAlt>
        <View style={[styles.between, { marginBottom: 10 }]}>
          <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fg5 }}>BEDTIME · TONIGHT</Text>
          <SharedChips activeSlots={activeSlots} />
        </View>
        <Text style={{ fontWeight: '900', fontSize: 26, lineHeight: 25, letterSpacing: -0.8 }}>
          {bedtime}. <Text style={{ color: colors.fg9 }}>{(() => {
            const parts = bedtime.split('→').map(s => s.trim());
            if (parts.length === 2) {
              const [h1, m1] = parts[0].split(':').map(Number);
              const [h2, m2] = parts[1].split(':').map(Number);
              const start = (h1 ?? 0) * 60 + (m1 ?? 0);
              const end = (h2 ?? 0) * 60 + (m2 ?? 0);
              const diff = end > start ? end - start : 24 * 60 - start + end;
              const hrs = Math.floor(diff / 60);
              const mins = diff % 60;
              return mins > 0 ? `${hrs}h ${mins}m.` : `${hrs} hours.`;
            }
            return '';
          })()}</Text>
        </Text>
        <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 10 }}>
          PHONES DIM · NOTIFICATIONS SILENCED · WAKE WITH SUNRISE
        </Text>
      </CardAlt>
    </ScrollView>
  );
}

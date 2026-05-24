import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/tokens';
import { toMins, mins, fmtHM } from '../../lib/utils';
import {
  ScreenHeader, Card, SecLabel, UserStripe, UserChip, IconBtn, styles,
} from '../../components/Primitives';
import { Icon } from '../../components/Icon';
import type { CalEvent } from '../../lib/types';

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

function localISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildWeekDates(): Record<string, string> {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const map: Record<string, string> = {};
  DAYS.forEach((d, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    map[d] = localISODate(dt);
  });
  return map;
}
const WEEK_ISO = buildWeekDates();
const DAY_DATES: Record<string, number> = Object.fromEntries(
  DAYS.map(d => [d, parseInt(WEEK_ISO[d].split('-')[2], 10)])
);
// Built dynamically inside component to pick up real names

const START_MIN = 6 * 60;
const END_MIN = 22 * 60;
const HOUR_PX = 60;
const TOTAL_MIN = END_MIN - START_MIN;
const TOTAL_PX = (TOTAL_MIN / 60) * HOUR_PX;

function todayDayName(): string {
  const d = new Date().getDay();
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] ?? 'Mon';
}

import { USER_LIST } from '../../data/seed';

function profileName(id: string, profiles: import('../../lib/store').ProfileMap): string {
  return profiles[id as import('../../lib/types').UserId]?.displayName ?? 'N/A';
}

export function PlanScreen() {
  const { state, dispatch } = useStore();
  const [day, setDay] = useState<string>(todayDayName);
  const [filter, setFilter] = useState<string>('ALL');
  const viewer = state.viewer;

  const activeSlots = USER_LIST.filter(u => state.profiles[u]);
  const FILTER_OPTIONS = [
    { v: 'ALL', label: 'EVERYTHING' },
    ...activeSlots.map(u => ({ v: u, label: profileName(u, state.profiles).toUpperCase() })),
    { v: 'B',   label: 'TOGETHER' },
  ];

  // state.events holds the full week from Supabase; filter by the selected day's ISO date
  const todayName = todayDayName();
  const selectedIso = WEEK_ISO[day];
  const rawEvs = state.events.filter(e => e.day === selectedIso);
  const evs = rawEvs.filter(e => filter === 'ALL' || e.who === filter || e.who === 'B');

  // Lane assignment for overlapping events
  const sorted = [...evs].sort((a, b) => toMins(a.start) - toMins(b.start));
  const laneEnds: number[] = [];
  const placed = sorted.map(ev => {
    const s = toMins(ev.start), e = toMins(ev.end);
    let lane = laneEnds.findIndex(end => end <= s);
    if (lane === -1) { laneEnds.push(e); lane = laneEnds.length - 1; }
    else laneEnds[lane] = e;
    return { ...ev, _lane: lane };
  });
  const laneCount = Math.max(1, laneEnds.length);

  const totalBooked = evs.reduce((a, e) => a + mins(e.start, e.end), 0);
  const busyPct = Math.round((totalBooked / TOTAL_MIN) * 100);

  const hours = Array.from({ length: TOTAL_MIN / 60 + 1 }, (_, i) => 6 + i);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 130 }}>
      <ScreenHeader
        eyebrow={`PLAN · WEEK ${getISOWeek(state.clock)} · ${state.clock.toLocaleDateString('en', { month: 'short', year: '2-digit' }).toUpperCase()}`}
        title="The"
        ghost="shared grid."
        sub="Tap a block to open. Private events show as 'busy' to your partner."
        right={
          <IconBtn inv onPress={() => dispatch({ t: 'openAdd' })}>
            <Icon name="plus" size={18} color="#fff" />
          </IconBtn>
        }
      />

      {/* Day strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 8 }}>
        {DAYS.map(d => {
          const active = d === day;
          return (
            <TouchableOpacity key={d} onPress={() => setDay(d)}
              style={{
                minWidth: 52, height: 64, paddingHorizontal: 10, paddingVertical: 8,
                borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 4,
                backgroundColor: active ? colors.foreground : '#fff',
                borderWidth: 1,
                borderColor: active ? colors.foreground : colors.border08,
              }}>
              <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: active ? colors.fgInv4 : colors.fg6 }}>{d.toUpperCase()}</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', letterSpacing: -0.4, color: active ? '#fff' : colors.fg2 }}>{DAY_DATES[d]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }} contentContainerStyle={{ gap: 6 }}>
        {FILTER_OPTIONS.map(o => {
          const active = filter === o.v;
          return (
            <TouchableOpacity key={o.v} onPress={() => setFilter(o.v)}
              style={[styles.row, { height: 30, paddingHorizontal: 10, borderRadius: 9999, gap: 6, flexShrink: 0,
                backgroundColor: active ? colors.foreground : colors.bgTint04,
                borderWidth: 1, borderColor: active ? colors.foreground : colors.border08 }]}>
              {o.v !== 'ALL' && <UserChip id={o.v as import('../../lib/types').UserId | 'B'} />}
              <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.8, color: active ? '#fff' : colors.fg3 }}>{o.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Day summary */}
      <Card style={{ marginBottom: 16, padding: 14 }}>
        <View style={[styles.between, { marginBottom: 10 }]}>
          <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fg5 }}>{day.toUpperCase()} · SUMMARY</Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>{evs.length} EVENTS · {fmtHM(totalBooked).toUpperCase()} BOOKED</Text>
        </View>
        <View style={{ height: 6, backgroundColor: colors.bgTint06, borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ width: `${busyPct}%`, height: '100%', backgroundColor: colors.foreground }} />
        </View>
        <View style={[styles.between, { marginTop: 8 }]}>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>{busyPct}% BOOKED</Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>{fmtHM(TOTAL_MIN - totalBooked).toUpperCase()} FREE</Text>
        </View>
      </Card>

      {/* Timeline */}
      <View style={{ height: TOTAL_PX + 12, marginBottom: 24 }}>
        {/* Hour lines */}
        {hours.map((h, i) => (
          <View key={h} style={{ position: 'absolute', left: 0, right: 0, top: i * HOUR_PX, height: HOUR_PX, borderTopWidth: 1, borderTopColor: colors.border06, flexDirection: 'row' }}>
            <Text style={{ fontFamily: 'Courier', fontSize: 10, color: colors.fg7, letterSpacing: 0.5, paddingTop: 4, width: 36 }}>{String(h).padStart(2, '0')}:00</Text>
          </View>
        ))}

        {/* Now line (only on today) */}
        {day === todayName && (() => {
          const n = state.clock;
          const nm = n.getHours() * 60 + n.getMinutes();
          if (nm < START_MIN || nm > END_MIN) return null;
          const y = ((nm - START_MIN) / 60) * HOUR_PX;
          return (
            <View style={{ position: 'absolute', left: 36, right: 0, top: y, borderTopWidth: 1.5, borderTopColor: colors.foreground }}>
              <View style={{ position: 'absolute', top: -3.5, left: -3, width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.foreground }} />
            </View>
          );
        })()}

        {/* Event blocks */}
        <View style={{ position: 'absolute', left: 44, right: 0, top: 0, bottom: 0 }}>
          {placed.map((ev, i) => {
            const hidden = ev.priv && ev.who !== 'B' && ev.who !== viewer;
            const top = ((toMins(ev.start) - START_MIN) / 60) * HOUR_PX;
            const h = (mins(ev.start, ev.end) / 60) * HOUR_PX - 2;
            const colFrac = 1 / laneCount;
            const left = `${ev._lane * colFrac * 100}%`;
            const width = `${colFrac * 100 - 1}%`;
            return (
              <TouchableOpacity key={i}
                onPress={() => dispatch({ t: 'openEvent', ev: { ...ev, loc: ev.loc || '' } })}
                style={{ position: 'absolute', top, height: h, left: `${ev._lane * (100 / laneCount)}%` as any, width: `${100 / laneCount - 1}%` as any,
                  backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border08, borderRadius: 10,
                  padding: 8, flexDirection: 'row', gap: 8, overflow: 'hidden' }}>
                <UserStripe id={hidden ? 'priv' : ev.who} priv={hidden} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '600', letterSpacing: -0.1 }} numberOfLines={1}>
                    {ev.priv && <Icon name="lock" size={10} color={colors.fg6} />}
                    {hidden ? 'Private · busy' : ev.title}
                  </Text>
                  <Text style={{ fontFamily: 'Courier', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', color: colors.fg5, marginTop: 2 }}>{ev.start}—{ev.end}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <SecLabel>Legend</SecLabel>
      <Card style={{ padding: 14 }}>
        {[
          ...activeSlots.map(u => ({ id: u, label: profileName(u, state.profiles) + ' only', isPriv: false })),
          { id: 'B',    label: 'Together (everyone)',      isPriv: false },
          { id: 'priv', label: 'Private · shown as busy', isPriv: true  },
        ].map(o => (
          <View key={o.id} style={[styles.row, { gap: 10, marginBottom: 12 }]}>
            <UserStripe id={o.id as any} priv={o.isPriv} />
            <UserChip id={o.isPriv ? activeSlots[0] ?? '1' : o.id as any} priv={o.isPriv} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: '500', letterSpacing: -0.1 }}>{o.label}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

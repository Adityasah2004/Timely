import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/tokens';
import { toMins, fmtClock, fmtHM } from '../../lib/utils';
import { USER_LIST } from '../../data/seed';

function useName(shortId: string, profiles: import('../../lib/store').ProfileMap): string {
  if (shortId === 'B') return 'Both';
  return profiles[shortId as import('../../lib/types').UserId]?.displayName ?? 'N/A';
}
import {
  ScreenHeader, CardInv, CardAlt, Card, SecLabel, EventRow, UserChip,
  UserStripe, AppSwitch, styles, Divider,
} from '../../components/Primitives';
import { Icon } from '../../components/Icon';

export function TodayScreen() {
  const { state, dispatch } = useStore();
  const now = state.clock;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const viewer = state.viewer;
  const myName = useName(viewer, state.profiles);

  // All slots that have a real profile in this household
  const activeSlots = USER_LIST.filter(u => state.profiles[u]);

  const events = state.events;
  const visible = events.filter(e => !(e.priv && e.who !== 'B' && e.who !== viewer));
  const upcoming = visible.filter(e => toMins(e.end) > nowMin);
  const current = visible.find(e => toMins(e.start) <= nowMin && toMins(e.end) > nowMin);
  const next = upcoming.find(e => toMins(e.start) > nowMin);

  const sharedTodos = state.todos.filter(t => t.shared);
  const openShared = sharedTodos.filter(t => !t.done);

  const dayPct = Math.min(100, Math.max(0, ((nowMin - 6 * 60) / (22 * 60 - 6 * 60)) * 100));

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 130 }}>
      <ScreenHeader
        eyebrow={`TIMELY · ${myName.toUpperCase()}'S PHONE`}
        title="Hi,"
        ghost={`${myName}.`}
        sub={`${openShared.length} shared task${openShared.length === 1 ? '' : 's'} open. ${visible.length - upcoming.length}/${visible.length} done.`}
      />

      {/* NOW card */}
      <CardInv style={{ marginBottom: 18 }}>
        <View style={[styles.between, { marginBottom: 14 }]}>
          <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fgInv4 }}>NOW · LIVE</Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 13, color: colors.fgInv2 }}>{fmtClock(now)}</Text>
        </View>

        {current ? (
          <>
            <View style={[styles.row, { gap: 12, marginBottom: 4 }]}>
              <UserChip id={current.who} />
              <Text style={{ fontFamily: 'Courier', fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.fgInv4 }}>
                {current.start}—{current.end}
              </Text>
              {current.priv && (
                <View style={[styles.row, { gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: colors.borderInv15, borderRadius: 9999 }]}>
                  <Icon name="lock" size={10} color={colors.fgInv2} />
                  <Text style={{ fontFamily: 'Courier', fontSize: 9, color: colors.fgInv2, textTransform: 'uppercase' }}>PRIVATE</Text>
                </View>
              )}
            </View>
            <Text style={{ fontWeight: '900', fontSize: 30, lineHeight: 29, letterSpacing: -1, color: '#fff', marginTop: 6 }}>
              {current.title}
            </Text>
            <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fgInv4, marginTop: 8 }}>
              {current.loc.toUpperCase()} · {current.who === 'B' ? 'TOGETHER' : useName(current.who, state.profiles).toUpperCase()}
            </Text>
          </>
        ) : (
          <>
            <Text style={{ fontWeight: '900', fontSize: 32, lineHeight: 30, letterSpacing: -1, color: '#fff' }}>
              Free until <Text style={{ color: colors.fgInv4 }}>{next ? next.start : '—'}</Text>
            </Text>
            <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fgInv4, marginTop: 10 }}>
              {next ? `NEXT · ${next.title.toUpperCase()}` : 'NO MORE EVENTS TODAY'}
            </Text>
          </>
        )}

        {/* Day progress */}
        <View style={{ marginTop: 22, height: 1, backgroundColor: colors.borderInv15 }}>
          <View style={{ position: 'absolute', top: -2, left: 0, width: `${dayPct}%`, height: 5, backgroundColor: '#fff', borderRadius: 2 }} />
        </View>
        <View style={[styles.between, { marginTop: 8 }]}>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, color: colors.fgInv5 }}>06:00</Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, color: colors.fgInv5 }}>22:00</Text>
        </View>
      </CardInv>

      {/* Members strip — scrollable, works for 2-4 people */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 22 }} contentContainerStyle={{ gap: 10 }}>
        {activeSlots.map(uid => {
          const memberCurrent = events.find(e => (e.who === uid || e.who === 'B') && toMins(e.start) <= nowMin && toMins(e.end) > nowMin);
          const memberNext = events.find(e => (e.who === uid || e.who === 'B') && toMins(e.start) > nowMin);
          const hidden = memberCurrent && memberCurrent.priv && memberCurrent.who !== 'B' && memberCurrent.who !== viewer;
          const isMe = uid === viewer;
          return (
            <Card key={uid} style={{ width: 160, padding: 14 }}>
              <View style={[styles.row, { gap: 8, marginBottom: 8 }]}>
                <UserChip id={uid} size="lg" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: 'Courier', fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.fg5 }}>{isMe ? 'YOU' : useName(uid, state.profiles).toUpperCase()}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: -0.2 }} numberOfLines={1}>{useName(uid, state.profiles)}</Text>
                </View>
              </View>
              {memberCurrent ? (
                <>
                  <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: -0.1 }} numberOfLines={1}>{hidden ? 'Private · busy' : memberCurrent.title}</Text>
                  <Text style={{ fontFamily: 'Courier', fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.fg5, marginTop: 3 }}>TILL {memberCurrent.end}</Text>
                </>
              ) : memberNext ? (
                <>
                  <Text style={{ fontSize: 13, fontWeight: '600' }}>Free</Text>
                  <Text style={{ fontFamily: 'Courier', fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.fg5, marginTop: 3 }}>NEXT {memberNext.start}</Text>
                </>
              ) : (
                <Text style={{ fontFamily: 'Courier', fontSize: 9, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.fg5 }}>WRAPPED · FREE</Text>
              )}
            </Card>
          );
        })}
      </ScrollView>

      {/* Up next */}
      <SecLabel count={Math.min(4, upcoming.length)} right={
        <TouchableOpacity style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.bgTint04, borderWidth: 1, borderColor: colors.border08 }}
          onPress={() => dispatch({ t: 'tab', tab: 'plan' })}>
          <Icon name="chev" size={12} />
        </TouchableOpacity>
      }>Up next</SecLabel>
      <View style={{ gap: 8, marginBottom: 24 }}>
        {upcoming.slice(0, 4).map(ev => (
          <EventRow key={ev.id} ev={ev} viewer={viewer} onPress={() => dispatch({ t: 'openEvent', ev })} />
        ))}
      </View>

      {/* Shared to-dos */}
      <SecLabel count={openShared.length} right={
        <TouchableOpacity style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.bgTint04, borderWidth: 1, borderColor: colors.border08 }}
          onPress={() => dispatch({ t: 'tab', tab: 'todos' })}>
          <Icon name="chev" size={12} />
        </TouchableOpacity>
      }>Shared to-dos</SecLabel>
      <Card style={{ padding: 4, marginBottom: 24 }}>
        {sharedTodos.slice(0, 4).map((td, i, arr) => (
          <TouchableOpacity key={td.id} onPress={() => dispatch({ t: 'toggleTodo', id: td.id })}
            style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, paddingHorizontal: 14, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border06 }}>
            <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: td.done ? colors.foreground : colors.border20, backgroundColor: td.done ? colors.foreground : '#fff', alignItems: 'center', justifyContent: 'center' }}>
              {td.done && <Icon name="check" size={11} color="#fff" strokeWidth={2.4} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '500', letterSpacing: -0.1, textDecorationLine: td.done ? 'line-through' : 'none', color: td.done ? colors.fg6 : colors.fg1 }} numberOfLines={1}>{td.text}</Text>
              <Text style={{ fontFamily: 'Courier', fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.fg5, marginTop: 3 }}>DUE {td.due}</Text>
            </View>
            <UserChip id={td.who} />
          </TouchableOpacity>
        ))}
      </Card>

      {/* Activity feed */}
      <SecLabel count={state.activity.length}>Activity</SecLabel>
      <Card style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
        {state.activity.slice(0, 6).map((a, i) => (
          <View key={i} style={[styles.row, { padding: 14, gap: 12, alignItems: 'flex-start', borderBottomWidth: i < 5 ? 1 : 0, borderBottomColor: colors.border06 }]}>
            <UserChip id={a.who} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, lineHeight: 18, color: colors.fg2 }}>
                <Text style={{ fontWeight: '700', color: colors.fg1 }}>{a.who === 'B' ? 'You both' : useName(a.who, state.profiles)}</Text>
                {' '}{a.verb}{' '}
                <Text style={{ color: colors.fg1, fontWeight: '500' }}>{a.obj}</Text>
              </Text>
              <Text style={{ fontFamily: 'Courier', fontSize: 9, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.fg5, marginTop: 4 }}>{a.t} · {a.badge}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Focus quick-start */}
      <CardAlt>
        <View style={[styles.between, { marginBottom: 10 }]}>
          <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fg5 }}>DEEP FOCUS · TOGETHER</Text>
          <View style={styles.row}>
            {activeSlots.map((u, i) => (
              <View key={u} style={{ marginLeft: i > 0 ? -6 : 0 }}><UserChip id={u} /></View>
            ))}
          </View>
        </View>
        <Text style={{ fontWeight: '900', fontSize: 22, lineHeight: 21, letterSpacing: -0.6 }}>
          Quiet the house.{' '}
          <Text style={{ color: colors.fg9 }}>50 min, side by side.</Text>
        </Text>
        <View style={[styles.row, { gap: 8, marginTop: 14 }]}>
          <TouchableOpacity style={{ flex: 1, height: 44, backgroundColor: colors.foreground, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => dispatch({ t: 'tab', tab: 'focus' })}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Start focus</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ height: 44, paddingHorizontal: 18, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.border15, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => dispatch({ t: 'tab', tab: 'focus' })}>
            <Text style={{ fontWeight: '600', fontSize: 14 }}>Solo</Text>
          </TouchableOpacity>
        </View>
      </CardAlt>
    </ScrollView>
  );
}

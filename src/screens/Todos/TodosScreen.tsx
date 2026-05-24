import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/tokens';
import { USERS } from '../../data/seed';
import { ScreenHeader, Card, CardAlt, SecLabel, UserChip, AppSwitch, IconBtn, styles } from '../../components/Primitives';
import { Icon } from '../../components/Icon';
import type { Todo } from '../../lib/types';

const BUCKET_ORDER = ['TODAY', 'TOMORROW', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN', 'THIS WEEK', 'NEXT WEEK', 'LATER'];

export function TodosScreen() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState<'SHARED' | 'MINE' | 'ALL'>('SHARED');
  const [showDone, setShowDone] = useState(false);
  const viewer = state.viewer;
  const all = state.todos;

  const filtered = all.filter(t => {
    if (tab === 'SHARED') {
      if (!t.shared) return false;
      // if sharedWith is set, only show to members in that list
      if (t.sharedWith) return t.sharedWith.includes(viewer);
      return true;
    }
    if (tab === 'MINE') return t.who === viewer;
    return true;
  }).filter(t => showDone || !t.done);

  const openCount = filtered.filter(t => !t.done).length;
  const doneToday = all.filter(t => t.done).length;

  const buckets: Record<string, Todo[]> = {};
  filtered.forEach(t => {
    if (!buckets[t.due]) buckets[t.due] = [];
    buckets[t.due].push(t);
  });
  const ordered = BUCKET_ORDER.filter(k => buckets[k]);

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 130 }}>
      <ScreenHeader
        eyebrow={`TO-DOS · ${openCount} OPEN · ${doneToday} DONE TODAY`}
        title="Take"
        ghost="the small stuff off your mind."
        sub="Shared lives in the house. Yours stays yours."
        right={
          <IconBtn inv onPress={() => dispatch({ t: 'openNewTodo' })}>
            <Icon name="plus" size={18} color="#fff" />
          </IconBtn>
        }
      />

      {/* Tab pills */}
      <Card style={{ padding: 4, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {([
            { id: 'SHARED', label: 'Shared', count: all.filter(t => t.shared && !t.done).length },
            { id: 'MINE',   label: 'Mine',   count: all.filter(t => t.who === viewer && !t.done).length },
            { id: 'ALL',    label: 'All',    count: all.filter(t => !t.done).length },
          ] as const).map(t => (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)}
              style={{ flex: 1, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4,
                backgroundColor: tab === t.id ? colors.foreground : 'transparent' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', letterSpacing: -0.1, color: tab === t.id ? '#fff' : colors.fg3 }}>{t.label}</Text>
              <Text style={{ fontFamily: 'Courier', fontSize: 10, color: tab === t.id ? 'rgba(255,255,255,0.6)' : colors.fg5 }}>· {String(t.count).padStart(2, '0')}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <View style={[styles.between, { marginBottom: 18, paddingHorizontal: 4 }]}>
        <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5 }}>SORTED BY DUE</Text>
        <View style={[styles.row, { gap: 8 }]}>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5 }}>SHOW DONE</Text>
          <AppSwitch value={showDone} onChange={setShowDone} />
        </View>
      </View>

      {ordered.length === 0 && (
        <CardAlt style={{ alignItems: 'center', padding: 32, marginBottom: 22 }}>
          <Text style={{ fontWeight: '900', fontSize: 28, letterSpacing: -1, lineHeight: 27 }}>
            Clean. <Text style={{ color: colors.fg9 }}>Nothing to do.</Text>
          </Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5, marginTop: 12 }}>ENJOY THE QUIET, OR ADD SOMETHING.</Text>
        </CardAlt>
      )}

      {ordered.map(k => (
        <React.Fragment key={k}>
          <SecLabel count={buckets[k].length}>Due · {k.toLowerCase()}</SecLabel>
          <Card style={{ padding: 4, marginBottom: 18 }}>
            {buckets[k].map((td, i, arr) => (
              <TouchableOpacity key={td.id} onPress={() => dispatch({ t: 'toggleTodo', id: td.id })}
                style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 12, paddingHorizontal: 14,
                  borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: colors.border06 }}>
                <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5,
                  borderColor: td.done ? colors.foreground : colors.border20,
                  backgroundColor: td.done ? colors.foreground : '#fff',
                  alignItems: 'center', justifyContent: 'center' }}>
                  {td.done && <Icon name="check" size={12} color="#fff" strokeWidth={2.4} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', letterSpacing: -0.1,
                    textDecorationLine: td.done ? 'line-through' : 'none',
                    color: td.done ? colors.fg6 : colors.fg1 }}>{td.text}</Text>
                  <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 3 }}>
                    {td.shared ? 'SHARED' : 'PERSONAL'} · P{td.p}
                  </Text>
                </View>
                <UserChip id={td.who} />
              </TouchableOpacity>
            ))}
          </Card>
        </React.Fragment>
      ))}
    </ScrollView>
  );
}

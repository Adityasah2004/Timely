import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/tokens';
import { ScreenHeader, CardInv, Card, styles } from '../../components/Primitives';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';
import type { Notification } from '../../lib/types';

function kindIcon(kind: string): IconName {
  switch (kind) {
    case 'event':  return 'cal';
    case 'todo':   return 'check';
    case 'alarm':  return 'bell';
    case 'focus':  return 'bolt';
    default:       return 'bell';
  }
}

function NotifRow({ n, onRead }: { n: Notification; onRead: () => void }) {
  return (
    <TouchableOpacity onPress={onRead}
      style={[styles.row, { padding: 14, paddingHorizontal: 16, gap: 12, alignItems: 'flex-start' }]}>
      <View style={{ width: 32, height: 32, borderRadius: 10,
        backgroundColor: n.read ? colors.bgTint04 : colors.foreground,
        alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
        <Icon name={kindIcon(n.kind)} size={14} color={n.read ? colors.fg5 : '#fff'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13.5, fontWeight: n.read ? '400' : '600',
          color: n.read ? colors.fg3 : colors.fg1, letterSpacing: -0.1 }}>
          {n.title}
        </Text>
        {n.body ? <Text style={{ fontSize: 12.5, color: colors.fg5, marginTop: 2 }}>{n.body}</Text> : null}
        <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase',
          letterSpacing: 1.6, color: colors.fg6, marginTop: 5 }}>
          {n.when} · {n.kind.toUpperCase()}
        </Text>
      </View>
      {!n.read && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.foreground, marginTop: 6 }} />}
    </TouchableOpacity>
  );
}

export function NotificationsScreen() {
  const { state, dispatch } = useStore();
  const notifs = state.notifications;
  const unread = notifs.filter(n => !n.read).length;
  const urgent = notifs.find(n => n.urgent && !n.read);
  const rest = notifs.filter(n => !(n.urgent && !n.read));

  async function markRead(id: string) {
    dispatch({ t: 'markNotifRead', id });
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  async function markAllRead() {
    notifs.forEach(n => { if (!n.read) dispatch({ t: 'markNotifRead', id: n.id }); });
    if (state.householdId) {
      await supabase.from('notifications')
        .update({ is_read: true })
        .eq('household_id', state.householdId)
        .eq('is_read', false);
    }
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 130 }}>
      <ScreenHeader
        eyebrow={`NOTIFICATIONS · ${unread} UNREAD`}
        title="What's"
        ghost="happening."
        sub="Shared actions, new events, alarms your partner set."
        right={
          unread > 0 ? (
            <TouchableOpacity onPress={markAllRead}
              style={{ height: 32, paddingHorizontal: 12, borderRadius: 9999, borderWidth: 1,
                borderColor: colors.border12, justifyContent: 'center' }}>
              <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase',
                letterSpacing: 1.5, color: colors.fg4 }}>MARK ALL READ</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      {urgent && (
        <>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase',
            letterSpacing: 1.8, color: colors.fg5, marginBottom: 10 }}>URGENT</Text>
          <CardInv style={{ marginBottom: 22 }}>
            <View style={[styles.row, { gap: 10, marginBottom: 10 }]}>
              <Icon name={kindIcon(urgent.kind)} size={14} color={colors.fgInv2} />
              <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase',
                letterSpacing: 1.8, color: colors.fgInv4 }}>
                {urgent.kind.toUpperCase()} · {urgent.when}
              </Text>
            </View>
            <Text style={{ fontWeight: '900', fontSize: 22, letterSpacing: -0.6, color: '#fff', lineHeight: 24 }}>
              {urgent.title}
            </Text>
            {urgent.body ? <Text style={{ fontSize: 13, color: colors.fgInv2, marginTop: 8 }}>{urgent.body}</Text> : null}
            <TouchableOpacity onPress={() => markRead(urgent.id)}
              style={{ height: 40, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10,
                alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Got it</Text>
            </TouchableOpacity>
          </CardInv>
        </>
      )}

      {rest.length > 0 ? (
        <>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase',
            letterSpacing: 1.8, color: colors.fg5, marginBottom: 10 }}>
            {urgent ? 'EARLIER' : 'ALL'}
          </Text>
          <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 22 }}>
            {rest.map((n, i) => (
              <View key={n.id} style={{ borderBottomWidth: i === rest.length - 1 ? 0 : 1, borderBottomColor: colors.border06 }}>
                <NotifRow n={n} onRead={() => markRead(n.id)} />
              </View>
            ))}
          </Card>
        </>
      ) : !urgent && (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ fontWeight: '900', fontSize: 28, letterSpacing: -1, color: colors.fg1 }}>All clear.</Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase',
            letterSpacing: 1.8, color: colors.fg5, marginTop: 10 }}>NOTHING NEW YET.</Text>
        </View>
      )}
    </ScrollView>
  );
}

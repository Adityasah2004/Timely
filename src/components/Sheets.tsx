import React, { useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TouchableWithoutFeedback,
  TextInput, ScrollView, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../lib/tokens';
import { useStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { writeActivity } from '../lib/store';
import { scheduleNotif, cancelNotif, secondsUntil } from '../lib/notifications';
import { USER_LIST } from '../data/seed';
import type { UserId } from '../lib/types';

const REMINDER_NOTIF_KEY = (eventId: string) => `reminder_notif_${eventId}`;

const REMINDER_OPTIONS = [
  { label: 'None',         value: null },
  { label: 'At time',      value: 0    },
  { label: '5 min before', value: 5    },
  { label: '15 min',       value: 15   },
  { label: '30 min',       value: 30   },
  { label: '1 hour',       value: 60   },
  { label: '1 day',        value: 1440 },
] as const;

function useName(id: string, profiles: import('../lib/store').ProfileMap): string {
  if (id === 'B') return 'Both';
  return profiles[id as import('../lib/types').UserId]?.displayName ?? 'N/A';
}
import { UserChip, AppSwitch, styles as S } from './Primitives';
import { Icon } from './Icon';

// ─── Sheet shell ────────────────────────────────────────────
function SheetShell({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={sh.backdrop}>
          <TouchableWithoutFeedback>
            <View style={sh.sheet}>
              <View style={sh.grab} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Event detail ────────────────────────────────────────────
export function EventSheet() {
  const { state, dispatch } = useStore();
  const profiles = state.profiles;
  const visible = state.modal?.kind === 'event';
  const ev = state.modal?.kind === 'event' ? state.modal.ev : null;
  if (!ev) return null;
  const viewer = state.viewer;
  const hidden = ev.priv && ev.who !== 'B' && ev.who !== viewer;

  return (
    <SheetShell visible={visible} onClose={() => dispatch({ t: 'closeModal' })}>
      <View style={[S.between, { marginBottom: 14 }]}>
        <Text style={sh.monoSm}>{ev.who === 'B' ? 'SHARED EVENT' : `${useName(ev.who, profiles).toUpperCase()}'S EVENT`}</Text>
        <TouchableOpacity onPress={() => dispatch({ t: 'closeModal' })} style={sh.closeBtn}>
          <Icon name="x" size={14} />
        </TouchableOpacity>
      </View>

      <Text style={sh.sheetH}>
        {hidden ? <>Private. <Text style={{ color: colors.fg9 }}>No details.</Text></> : ev.title}
      </Text>

      <View style={[S.row, { gap: 6, marginTop: 14, marginBottom: 18, flexWrap: 'wrap' }]}>
        <View style={sh.tagWrap}>
          <UserChip id={ev.who} priv={hidden} />
          <Text style={sh.tagText}>{hidden ? 'PRIVATE' : ev.who === 'B' ? 'TOGETHER' : useName(ev.who, profiles).toUpperCase()}</Text>
        </View>
        {ev.priv && (
          <View style={sh.tagWrap}>
            <Icon name="lock" size={10} />
            <Text style={sh.tagText}>PRIVATE</Text>
          </View>
        )}
        {!ev.priv && (
          <View style={[sh.tagWrap, { borderColor: 'transparent', backgroundColor: 'transparent' }]}>
            <Icon name="eye" size={10} color={colors.fg6} />
            <Text style={[sh.tagText, { color: colors.fg6 }]}>VISIBLE TO PARTNER</Text>
          </View>
        )}
      </View>

      <View style={[sh.infoCard, { marginBottom: 16 }]}>
        <View style={[S.row, { padding: 12, paddingHorizontal: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border06 }]}>
          <Icon name="timer" size={16} color={colors.fg2} />
          <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '500' }}>Time</Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 13, fontWeight: '600' }}>{ev.start} — {ev.end}</Text>
        </View>
        {!hidden && ev.loc ? (
          <View style={[S.row, { padding: 12, paddingHorizontal: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border06 }]}>
            <Icon name="pin" size={16} color={colors.fg2} />
            <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '500' }}>Location</Text>
            <Text style={{ fontSize: 13, color: colors.fg3 }}>{ev.loc}</Text>
          </View>
        ) : null}
        <View style={[S.row, { padding: 12, paddingHorizontal: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border06 }]}>
          <Icon name="users" size={16} color={colors.fg2} />
          <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '500' }}>Who</Text>
          <Text style={{ fontSize: 13, color: colors.fg3 }}>{ev.who === 'B' ? 'Everyone' : useName(ev.who, profiles)}</Text>
        </View>
        {ev.reminderOffsetMin !== null && (
          <View style={[S.row, { padding: 12, paddingHorizontal: 14, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border06 }]}>
            <Icon name="bell" size={16} color={colors.fg2} />
            <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '500' }}>Reminder</Text>
            <Text style={{ fontSize: 13, color: colors.fg3 }}>
              {REMINDER_OPTIONS.find(o => o.value === ev.reminderOffsetMin)?.label ?? `${ev.reminderOffsetMin} min before`}
            </Text>
          </View>
        )}
        <View style={[S.row, { padding: 12, paddingHorizontal: 14, gap: 12 }]}>
          <Icon name={ev.priv ? 'lock' : 'eye'} size={16} color={colors.fg2} />
          <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '500' }}>Visibility</Text>
          {ev.who === viewer
            ? <AppSwitch value={ev.priv} onChange={(v) => {
                dispatch({ t: 'togglePriv', v });
                supabase.from('events').update({ is_private: v }).eq('id', ev.id);
              }} />
            : <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>{ev.priv ? 'PRIVATE' : 'PUBLIC'}</Text>}
        </View>
      </View>

      <View style={[S.row, { gap: 10 }]}>
        <TouchableOpacity style={[sh.btnOutline, { borderColor: colors.destructive }]} onPress={() => {
          Alert.alert(
            'Delete event',
            `Delete "${ev.title}"? This can't be undone.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: async () => {
                // cancel any pending reminder notification
                const notifId = await AsyncStorage.getItem(REMINDER_NOTIF_KEY(ev.id));
                await cancelNotif(notifId);
                await AsyncStorage.removeItem(REMINDER_NOTIF_KEY(ev.id));
                await supabase.from('events').delete().eq('id', ev.id);
                dispatch({ t: 'closeModal' });
              }},
            ]
          );
        }}>
          <Text style={[sh.btnOutlineTxt, { color: colors.destructive }]}>Delete</Text>
        </TouchableOpacity>
        <TouchableOpacity style={sh.btnPrimary} onPress={() => dispatch({ t: 'closeModal' })}><Text style={sh.btnPrimaryTxt}>Done</Text></TouchableOpacity>
      </View>
    </SheetShell>
  );
}

// ─── Add Event ───────────────────────────────────────────────
export function AddEventSheet() {
  const { state, dispatch } = useStore();
  const visible = state.modal?.kind === 'addEvent';
  const viewer = state.viewer;
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('14:00');
  const [end, setEnd] = useState('15:00');
  const [who, setWho] = useState<UserId | 'B'>(viewer);
  const [priv, setPriv] = useState(false);
  const [loc, setLoc] = useState('');
  const [reminder, setReminder] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim() || !state.householdId || !state.userId) {
      dispatch({ t: 'closeModal' });
      return;
    }
    setSaving(true);
    const _nd = new Date();
    const today = `${_nd.getFullYear()}-${String(_nd.getMonth()+1).padStart(2,'0')}-${String(_nd.getDate()).padStart(2,'0')}`;

    const { data: inserted } = await supabase.from('events').insert({
      household_id: state.householdId,
      owner_id: state.userId,
      title: title.trim(),
      start_time: start + ':00',
      end_time: end + ':00',
      event_date: today,
      location: loc.trim(),
      who,
      is_private: priv,
      reminder_offset_min: reminder,
    }).select('id').single();

    // Schedule local notification if a reminder was set
    if (inserted?.id && reminder !== null) {
      const secs = secondsUntil(today, start, reminder);
      const reminderLabel = REMINDER_OPTIONS.find(o => o.value === reminder)?.label ?? '';
      const notifId = await scheduleNotif(
        secs,
        `📅 ${title.trim()}`,
        reminder === 0 ? 'Starting now' : `${reminderLabel} — starts at ${start}`,
      );
      if (notifId) {
        await AsyncStorage.setItem(REMINDER_NOTIF_KEY(inserted.id), notifId);
      }
    }

    await writeActivity(state.householdId, state.userId, viewer,
      'added', title.trim(), 'event',
      who !== viewer ? { title: 'New event added', body: `${title.trim()} at ${start}`, forUser: who } : undefined
    );
    setSaving(false);
    setTitle(''); setLoc(''); setStart('14:00'); setEnd('15:00'); setPriv(false); setWho(viewer); setReminder(null);
    dispatch({ t: 'closeModal' });
  }

  return (
    <SheetShell visible={visible} onClose={() => dispatch({ t: 'closeModal' })}>
      <View style={[S.between, { marginBottom: 14 }]}>
        <Text style={sh.monoSm}>NEW EVENT · TODAY</Text>
        <TouchableOpacity onPress={() => dispatch({ t: 'closeModal' })} style={sh.closeBtn}>
          <Icon name="x" size={14} />
        </TouchableOpacity>
      </View>
      <Text style={sh.sheetH}>Add to <Text style={{ color: colors.fg9 }}>the grid.</Text></Text>

      <View style={{ gap: 10, marginTop: 18 }}>
        <View style={sh.field}>
          <Text style={sh.fieldLabel}>EVENT</Text>
          <TextInput style={sh.fieldInput} placeholder="e.g. Lunch with parents" value={title} onChangeText={setTitle} />
        </View>
        <View style={S.row}>
          <View style={[sh.field, { flex: 1, marginRight: 5 }]}>
            <Text style={sh.fieldLabel}>STARTS</Text>
            <TextInput style={sh.fieldInput} value={start} onChangeText={setStart} placeholder="HH:MM" />
          </View>
          <View style={[sh.field, { flex: 1, marginLeft: 5 }]}>
            <Text style={sh.fieldLabel}>ENDS</Text>
            <TextInput style={sh.fieldInput} value={end} onChangeText={setEnd} placeholder="HH:MM" />
          </View>
        </View>
        <View style={sh.field}>
          <Text style={sh.fieldLabel}>LOCATION</Text>
          <TextInput style={sh.fieldInput} placeholder="Optional" value={loc} onChangeText={setLoc} />
        </View>
        <View style={sh.field}>
          <Text style={sh.fieldLabel}>WHO</Text>
          <View style={[S.row, { flexWrap: 'wrap', gap: 6, marginTop: 4 }]}>
            {[
              ...USER_LIST.filter(u => state.profiles[u]).map(u => ({
                v: u as UserId | 'B',
                label: u === viewer ? 'You' : (state.profiles[u]?.displayName ?? u),
                chip: u as UserId | 'B',
              })),
              { v: 'B' as const, label: 'All', chip: 'B' as const },
            ].map(o => (
              <TouchableOpacity key={o.v} onPress={() => setWho(o.v)}
                style={[S.row, { height: 36, paddingHorizontal: 10, borderRadius: 10, gap: 6, justifyContent: 'center',
                  backgroundColor: who === o.v ? colors.foreground : 'transparent',
                  borderWidth: 1, borderColor: who === o.v ? colors.foreground : colors.border08 }]}>
                <UserChip id={o.chip} />
                <Text style={{ fontSize: 12, fontWeight: '600', color: who === o.v ? '#fff' : colors.fg2 }}>{o.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={sh.field}>
          <Text style={sh.fieldLabel}>REMINDER</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 6 }}>
            {REMINDER_OPTIONS.map(o => {
              const active = reminder === o.value;
              return (
                <TouchableOpacity key={String(o.value)} onPress={() => setReminder(o.value)}
                  style={{ height: 32, paddingHorizontal: 12, borderRadius: 9999, justifyContent: 'center',
                    backgroundColor: active ? colors.foreground : colors.bgTint04,
                    borderWidth: 1, borderColor: active ? colors.foreground : colors.border08 }}>
                  <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
                    color: active ? '#fff' : colors.fg3 }}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <View style={[sh.infoCard, S.row, { gap: 12 }]}>
          <Icon name={priv ? 'lock' : 'eye'} size={16} color={colors.fg2} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '600' }}>{priv ? 'Private' : 'Public'}</Text>
            <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 3 }}>
              {priv ? "PARTNER SEES 'BUSY' · NO DETAILS" : 'PARTNER SEES TITLE + LOCATION'}
            </Text>
          </View>
          <AppSwitch value={priv} onChange={setPriv} />
        </View>
      </View>

      <View style={[S.row, { gap: 10, marginTop: 18 }]}>
        <TouchableOpacity style={sh.btnOutline} onPress={() => dispatch({ t: 'closeModal' })}><Text style={sh.btnOutlineTxt}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={sh.btnPrimary} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={sh.btnPrimaryTxt}>Add to today</Text>}
        </TouchableOpacity>
      </View>
    </SheetShell>
  );
}

// ─── Add Todo ────────────────────────────────────────────────
export function AddTodoSheet() {
  const { state, dispatch } = useStore();
  const visible = state.modal?.kind === 'addTodo';
  const viewer = state.viewer;
  const activeSlots = USER_LIST.filter(u => state.profiles[u]);
  const otherSlots = activeSlots.filter(u => u !== viewer);
  const multiMember = activeSlots.length > 2;

  const [text, setText] = useState('');
  const [shared, setShared] = useState(true);
  // sharedWith: null = everyone; when multiMember and shared, user picks a subset
  const [sharedWith, setSharedWith] = useState<UserId[] | null>(null);
  const [due, setDue] = useState('TODAY');
  const [p, setP] = useState<1 | 2 | 3>(2);
  const [saving, setSaving] = useState(false);

  // When shared is turned off, reset sharedWith
  function handleSetShared(v: boolean) {
    setShared(v);
    if (!v) setSharedWith(null);
  }

  function toggleMember(u: UserId) {
    setSharedWith(prev => {
      // null means everyone — clicking a member switches to explicit selection
      const current = prev ?? activeSlots;
      const next = current.includes(u) ? current.filter(x => x !== u) : [...current, u];
      // if all active slots are selected, collapse back to null (everyone)
      return next.length === activeSlots.length ? null : next.length === 0 ? [viewer] : next;
    });
  }

  async function save() {
    if (!text.trim() || !state.householdId || !state.userId) {
      dispatch({ t: 'closeModal' });
      return;
    }
    setSaving(true);
    // For single/two-member households sharedWith is always null (everyone)
    const finalSharedWith = shared && multiMember && sharedWith ? sharedWith : null;
    await supabase.from('todos').insert({
      household_id: state.householdId,
      owner_id: state.userId,
      text: text.trim(),
      is_shared: shared,
      shared_with: finalSharedWith,
      is_done: false,
      due_label: due,
      priority: p,
    });
    await writeActivity(state.householdId, state.userId, viewer,
      'added', text.trim(), 'todo',
      shared ? { title: 'New shared to-do', body: text.trim(), forUser: 'B' } : undefined
    );
    setSaving(false);
    setText(''); setShared(true); setSharedWith(null); setDue('TODAY'); setP(2);
    dispatch({ t: 'closeModal' });
  }

  // Label for the sharing info card
  const sharingLabel = !shared
    ? 'Personal'
    : sharedWith === null
      ? 'Everyone'
      : sharedWith.map(u => state.profiles[u]?.displayName ?? u).join(', ');

  const sharingSubLabel = !shared
    ? 'ONLY YOU SEE IT'
    : sharedWith === null
      ? `ALL ${activeSlots.length} MEMBERS SEE IT`
      : 'SELECTED MEMBERS ONLY';

  return (
    <SheetShell visible={visible} onClose={() => dispatch({ t: 'closeModal' })}>
      <View style={[S.between, { marginBottom: 14 }]}>
        <Text style={sh.monoSm}>NEW TO-DO</Text>
        <TouchableOpacity onPress={() => dispatch({ t: 'closeModal' })} style={sh.closeBtn}><Icon name="x" size={14} /></TouchableOpacity>
      </View>
      <Text style={sh.sheetH}>One small <Text style={{ color: colors.fg9 }}>thing.</Text></Text>

      <View style={{ gap: 10, marginTop: 18 }}>
        <View style={sh.field}>
          <Text style={sh.fieldLabel}>TO-DO</Text>
          <TextInput style={sh.fieldInput} autoFocus placeholder="e.g. Buy fresh herbs" value={text} onChangeText={setText} />
        </View>
        <View style={sh.field}>
          <Text style={sh.fieldLabel}>DUE</Text>
          <View style={[S.row, { flexWrap: 'wrap', gap: 6, marginTop: 4 }]}>
            {['TODAY', 'TOMORROW', 'THIS WEEK', 'LATER'].map(d => (
              <TouchableOpacity key={d} onPress={() => setDue(d)}
                style={{ height: 32, paddingHorizontal: 10, borderRadius: 9, justifyContent: 'center',
                  backgroundColor: due === d ? colors.foreground : 'transparent',
                  borderWidth: 1, borderColor: due === d ? colors.foreground : colors.border08 }}>
                <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: due === d ? '#fff' : colors.fg3 }}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={sh.field}>
          <Text style={sh.fieldLabel}>PRIORITY</Text>
          <View style={[S.row, { gap: 6, marginTop: 4 }]}>
            {([1, 2, 3] as const).map(n => (
              <TouchableOpacity key={n} onPress={() => setP(n)}
                style={{ flex: 1, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center',
                  backgroundColor: p === n ? colors.foreground : 'transparent',
                  borderWidth: 1, borderColor: p === n ? colors.foreground : colors.border08 }}>
                <Text style={{ fontFamily: 'Courier', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: p === n ? '#fff' : colors.fg3 }}>P{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Shared toggle + member picker */}
        <View style={[sh.infoCard, { gap: 12 }]}>
          <View style={[S.row, { gap: 12 }]}>
            <UserChip id={shared ? 'B' : viewer} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600' }}>{sharingLabel}</Text>
              <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 3 }}>
                {sharingSubLabel}
              </Text>
            </View>
            <AppSwitch value={shared} onChange={handleSetShared} />
          </View>

          {/* Member picker: only shown when shared + 3 or more members */}
          {shared && multiMember && (
            <View style={{ borderTopWidth: 1, borderTopColor: colors.border06, paddingTop: 10, gap: 6 }}>
              <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: colors.fg5 }}>SHARE WITH</Text>
              <View style={[S.row, { flexWrap: 'wrap', gap: 6, marginTop: 2 }]}>
                {/* "Everyone" option */}
                <TouchableOpacity
                  onPress={() => setSharedWith(null)}
                  style={[S.row, { height: 34, paddingHorizontal: 10, borderRadius: 10, gap: 6,
                    backgroundColor: sharedWith === null ? colors.foreground : 'transparent',
                    borderWidth: 1, borderColor: sharedWith === null ? colors.foreground : colors.border08 }]}>
                  <UserChip id='B' />
                  <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
                    color: sharedWith === null ? '#fff' : colors.fg3 }}>Everyone</Text>
                </TouchableOpacity>
                {/* One chip per other member */}
                {otherSlots.map(u => {
                  const selected = sharedWith === null || sharedWith.includes(u);
                  return (
                    <TouchableOpacity key={u}
                      onPress={() => toggleMember(u)}
                      style={[S.row, { height: 34, paddingHorizontal: 10, borderRadius: 10, gap: 6,
                        backgroundColor: selected ? colors.foreground : 'transparent',
                        borderWidth: 1, borderColor: selected ? colors.foreground : colors.border08 }]}>
                      <UserChip id={u} />
                      <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5,
                        color: selected ? '#fff' : colors.fg3 }}>
                        {state.profiles[u]?.displayName ?? u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={[S.row, { gap: 10, marginTop: 18 }]}>
        <TouchableOpacity style={sh.btnOutline} onPress={() => dispatch({ t: 'closeModal' })}><Text style={sh.btnOutlineTxt}>Cancel</Text></TouchableOpacity>
        <TouchableOpacity style={sh.btnPrimary} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={sh.btnPrimaryTxt}>Add to list</Text>}
        </TouchableOpacity>
      </View>
    </SheetShell>
  );
}


const sh = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 32, maxHeight: '85%' },
  grab: { width: 40, height: 4, backgroundColor: colors.bgTint06, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  sheetH: { fontWeight: '900', fontSize: 26, lineHeight: 32, letterSpacing: -0.7, color: colors.fg1 },
  monoSm: { fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.2, color: colors.fg5 } as any,
  closeBtn: { width: 28, height: 28, borderRadius: 10, backgroundColor: colors.bgTint04, borderWidth: 1, borderColor: colors.border08, alignItems: 'center', justifyContent: 'center' },
  field: { borderWidth: 1, borderColor: colors.border12, borderRadius: 14, padding: 12, backgroundColor: '#fff', gap: 4 },
  fieldLabel: { fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 2.2, color: colors.fg6 } as any,
  fieldInput: { fontSize: 15, fontWeight: '500', color: colors.fg1, paddingVertical: 0 },
  infoCard: { borderWidth: 1, borderColor: colors.border08, borderRadius: 18, padding: 14 },
  tagWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 22, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.border12, backgroundColor: colors.bgTint04, borderRadius: 9999 } as any,
  tagText: { fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: colors.fg4 } as any,
  btnPrimary: { flex: 1, height: 44, backgroundColor: colors.foreground, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnOutline: { flex: 1, height: 44, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnOutlineTxt: { fontWeight: '600', fontSize: 14, color: colors.fg1 },
});

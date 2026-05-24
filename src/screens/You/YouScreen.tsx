import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Clipboard, Modal, TextInput } from 'react-native';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/tokens';
import { fmtHM } from '../../lib/utils';
import { USER_LIST } from '../../data/seed';

function useName(id: string, profiles: import('../../lib/store').ProfileMap): string {
  return profiles[id as import('../../lib/types').UserId]?.displayName ?? 'N/A';
}
import { ScreenHeader, CardInv, CardAlt, Card, SecLabel, UserChip, Divider, styles } from '../../components/Primitives';
import { Icon } from '../../components/Icon';
import type { IconName } from '../../components/Icon';

// Simple edit modal for text values
function EditModal({ visible, title, value, onSave, onClose }: {
  visible: boolean; title: string; value: string; onSave: (v: string) => void; onClose: () => void;
}) {
  const [text, setText] = useState(value);
  React.useEffect(() => { if (visible) setText(value); }, [visible, value]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 28 }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24 }}>
            <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fg5, marginBottom: 12 }}>{title}</Text>
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              style={{ height: 48, borderWidth: 1, borderColor: colors.border12, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, color: colors.fg1 }}
            />
            <View style={[styles.row, { gap: 10, marginTop: 18 }]}>
              <TouchableOpacity onPress={onClose} style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border12, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, color: colors.fg3 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { onSave(text); onClose(); }} style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.foreground, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// Picker modal for options
function PickerModal({ visible, title, options, selected, onSave, onClose }: {
  visible: boolean; title: string; options: string[]; selected: string; onSave: (v: string) => void; onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 28 }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24 }}>
            <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fg5, marginBottom: 16 }}>{title}</Text>
            {options.map((opt, i) => (
              <TouchableOpacity key={opt} onPress={() => { onSave(opt); onClose(); }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14,
                  borderBottomWidth: i < options.length - 1 ? 1 : 0, borderBottomColor: colors.border06 }}>
                <Text style={{ fontSize: 15, color: colors.fg1 }}>{opt}</Text>
                {opt === selected && <Icon name="check" size={14} color={colors.foreground} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function SettingsRow({ label, value, icon, danger, last, onPress }: {
  label: string; value?: string; icon: IconName; danger?: boolean; last?: boolean; onPress?: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}
      style={[styles.row, { padding: 14, paddingHorizontal: 16, gap: 14, alignItems: 'center', borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border06 }]}>
      <View style={{ width: 30, height: 30, borderRadius: 9, backgroundColor: colors.bgTint04, borderWidth: 1, borderColor: colors.border08, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={14} color={danger ? '#B91C1C' : colors.fg2} />
      </View>
      <Text style={{ flex: 1, fontSize: 13.5, fontWeight: '500', letterSpacing: -0.1, color: danger ? '#B91C1C' : colors.fg1 }}>{label}</Text>
      {value ? <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>{value}</Text> : null}
      {onPress && <Icon name="chev" size={14} color={colors.fg7} />}
    </TouchableOpacity>
  );
}

export function YouScreen() {
  const { state, dispatch } = useStore();
  const myProfile = state.profiles[state.viewer];
  const myName = myProfile?.displayName ?? 'N/A';
  const me = {
    name: myName, full: myName,
    role:    myProfile?.roleLabel ?? '',
    tagline: myProfile?.tagline ?? '',
  };
  // All other members in the household
  const housemates = USER_LIST.filter(u => u !== state.viewer && state.profiles[u]);
  const myMinutes = useMemo(() => {
    const now = new Date();
    const dow = now.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return state.focusSessions
      .filter(s => s.ownerSlot === state.viewer && new Date(s.startedAt) >= monday && new Date(s.startedAt) <= sunday)
      .reduce((a, s) => a + s.durationMin, 0);
  }, [state.focusSessions, state.viewer]);
  const myEvents = state.events.filter(e => e.who === state.viewer || e.who === 'B').length;
  const sharedEvents = state.events.filter(e => e.who === 'B').length;

  // Prefs state (loaded from profile or defaults)
  const prefs = myProfile?.preferences as Record<string, string> | undefined ?? {};
  const [defaultShare, setDefaultShare] = useState<string>(prefs.defaultShare ?? 'Shared');
  const [privateAs,    setPrivateAs]    = useState<string>(prefs.privateAs ?? 'Busy · no details');
  const [focusStatus,  setFocusStatus]  = useState<string>(prefs.focusStatus ?? 'Always');
  const [bedtime,      setBedtime]      = useState<string>(prefs.bedtime ?? '23:00 → 06:00');
  const [crossNotifs,  setCrossNotifs]  = useState<string>(prefs.crossNotifs ?? 'Off during focus');
  const appearance = prefs.appearance ?? 'Light';

  // Modal state
  const [modal, setModal] = useState<string | null>(null);

  async function savePref(key: string, value: string) {
    if (!state.userId) return;
    const next = { ...prefs, [key]: value };
    await supabase.from('profiles').update({ preferences: next }).eq('id', state.userId);
    dispatch({ t: 'setProfiles', profiles: { ...state.profiles, [state.viewer]: { ...myProfile!, preferences: next } } });
  }

  function copyHouseholdId() {
    if (!state.householdId) return;
    Clipboard.setString(state.householdId);
    Alert.alert('Copied!', 'Household ID copied to clipboard. Share it with anyone you want to invite.');
  }

  function signOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  // Modal for editing tagline/role
  const [editTaglineVisible, setEditTaglineVisible] = useState(false);
  const [editRoleVisible, setEditRoleVisible] = useState(false);

  async function saveTagline(v: string) {
    if (!state.userId) return;
    await supabase.from('profiles').update({ tagline: v }).eq('id', state.userId);
    dispatch({ t: 'setProfiles', profiles: { ...state.profiles, [state.viewer]: { ...myProfile!, tagline: v } } });
  }

  async function saveRole(v: string) {
    if (!state.userId) return;
    await supabase.from('profiles').update({ role_label: v }).eq('id', state.userId);
    dispatch({ t: 'setProfiles', profiles: { ...state.profiles, [state.viewer]: { ...myProfile!, roleLabel: v } } });
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 130 }}>
      <ScreenHeader
        eyebrow={`YOU · ${me.full.toUpperCase()}`}
        title="Hi,"
        ghost={me.name + '.'}
        sub="Two calendars, one home. Make it yours."
      />

      {/* Profile card */}
      <CardInv style={{ marginBottom: 22 }}>
        <View style={[styles.row, { gap: 14, alignItems: 'center', marginBottom: 16 }]}>
          <UserChip id={state.viewer} size="xl" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '900', fontSize: 24, letterSpacing: -0.8, lineHeight: 23, color: '#fff' }}>{me.full}</Text>
            <TouchableOpacity onPress={() => setEditRoleVisible(true)}>
              <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fgInv4, marginTop: 6 }}>
                {me.role.toUpperCase() || 'TAP TO SET ROLE'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditTaglineVisible(true)}>
              <Text style={{ fontSize: 12, fontWeight: '300', color: colors.fgInv2, marginTop: 6 }}>
                "{me.tagline || 'tap to set tagline'}"
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 1, backgroundColor: colors.borderInv15 }}>
          {[
            { v: fmtHM(myMinutes), l: 'FOCUS · WK' },
            { v: String(myEvents),  l: 'EVENTS · WK' },
            { v: String(state.todos.filter(t => t.who === state.viewer && !t.done).length), l: 'TO-DO · OPEN' },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: colors.foreground, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ fontWeight: '900', fontSize: 22, letterSpacing: -0.8, lineHeight: 22, color: '#fff' }}>{s.v}</Text>
              <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fgInv4, marginTop: 6, textAlign: 'center' }}>{s.l}</Text>
            </View>
          ))}
        </View>
      </CardInv>

      {/* Household members */}
      <SecLabel>The house · {housemates.length + 1}</SecLabel>
      {housemates.map((u, i) => {
        const p = state.profiles[u];
        return (
          <Card key={u} style={{ padding: 14, marginBottom: i < housemates.length - 1 ? 8 : 0 }}>
            <View style={[styles.row, { gap: 12, alignItems: 'center' }]}>
              <UserChip id={u} size="lg" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.2 }}>{p?.displayName ?? 'N/A'}</Text>
                <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 3 }}>{(p?.roleLabel ?? '').toUpperCase()}</Text>
              </View>
            </View>
          </Card>
        );
      })}
      <View style={{ height: 8 }} />
      <Card style={{ padding: 14, marginBottom: 8 }}>
        <View style={styles.between}>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>TODAY</Text>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>{sharedEvents} SHARED EVENTS</Text>
        </View>
      </Card>

      {/* View as switcher — only show slots that have real profiles */}
      <View style={[styles.between, { paddingHorizontal: 4, paddingBottom: 22, flexWrap: 'wrap', gap: 8 }]}>
        <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>View calendar as</Text>
        <View style={[styles.row, { gap: 6, flexWrap: 'wrap' }]}>
          {USER_LIST.filter(u => state.profiles[u]).map(u => (
            <TouchableOpacity key={u} onPress={() => dispatch({ t: 'setViewer', u })}
              style={[styles.row, { height: 28, paddingHorizontal: 12, borderRadius: 9999, gap: 6,
                backgroundColor: state.viewer === u ? colors.foreground : colors.bgTint04,
                borderWidth: 1, borderColor: state.viewer === u ? colors.foreground : colors.border08 }]}>
              <UserChip id={u} />
              <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.8, color: state.viewer === u ? '#fff' : colors.fg3 }}>{useName(u, state.profiles)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Share invite */}
      {state.householdId && (
        <>
          <SecLabel>Invite · member</SecLabel>
          <Card style={{ padding: 14, marginBottom: 22 }}>
            <Text style={{ fontSize: 13, color: colors.fg5, lineHeight: 19, marginBottom: 10 }}>
              Send your household ID to anyone you want to join (up to 4 members).
            </Text>
            <TouchableOpacity onPress={copyHouseholdId}
              style={{ backgroundColor: colors.bgTint04, borderWidth: 1, borderColor: colors.border08, borderRadius: 10, padding: 12 }}>
              <Text style={{ fontFamily: 'Courier', fontSize: 11, color: colors.fg3, letterSpacing: 0.5 }} numberOfLines={1}>{state.householdId}</Text>
              <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg6, marginTop: 6 }}>TAP TO COPY</Text>
            </TouchableOpacity>
          </Card>
        </>
      )}

      {/* Sharing */}
      <SecLabel>Sharing · privacy</SecLabel>
      <Card style={{ padding: 0, marginBottom: 22 }}>
        <SettingsRow icon="cal"  label="New events default to"  value={defaultShare.toUpperCase()}
          onPress={() => setModal('defaultShare')} />
        <SettingsRow icon="lock" label="Private events show as" value={privateAs.toUpperCase()}
          onPress={() => setModal('privateAs')} />
        <SettingsRow icon="bolt" label="Show focus status"       value={focusStatus.toUpperCase()}
          onPress={() => setModal('focusStatus')} />
        <SettingsRow icon="moon" label="Bedtime · quiet hours"   value={bedtime.toUpperCase()}
          onPress={() => setModal('bedtime')} />
        <SettingsRow icon="bell" label="Cross-notifications"     value={crossNotifs.toUpperCase()}
          onPress={() => setModal('crossNotifs')} last />
      </Card>

      {/* App */}
      <SecLabel>App</SecLabel>
      <Card style={{ padding: 0, marginBottom: 22 }}>
        <SettingsRow icon="sun" label="Appearance" value={appearance.toUpperCase()} last
          onPress={() => Alert.alert('Appearance', 'Dark mode is coming soon. The app is light-only for now.')} />
      </Card>

      {/* Re-onboard */}
      <CardAlt style={{ marginBottom: 22 }}>
        <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fg5, marginBottom: 8 }}>RESET</Text>
        <Text style={{ fontWeight: '900', fontSize: 22, lineHeight: 21, letterSpacing: -0.6 }}>
          Run setup again. <Text style={{ color: colors.fg9 }}>Fresh paint.</Text>
        </Text>
        <Text style={{ fontSize: 12.5, color: colors.fg5, fontWeight: '300', lineHeight: 19, marginTop: 8 }}>
          Re-onboard, swap your role, or invite a new partner.
        </Text>
        <TouchableOpacity onPress={() => dispatch({ t: 'onboard' })}
          style={{ height: 44, backgroundColor: colors.foreground, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Re-run onboarding</Text>
        </TouchableOpacity>
      </CardAlt>

      <View style={styles.between}>
        <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>TIMELY · 1.0.0</Text>
        <TouchableOpacity onPress={signOut}>
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.destructive }}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>

      {/* Edit modals */}
      <EditModal visible={editTaglineVisible} title="Your tagline" value={me.tagline}
        onSave={saveTagline} onClose={() => setEditTaglineVisible(false)} />
      <EditModal visible={editRoleVisible} title="Your role" value={me.role}
        onSave={saveRole} onClose={() => setEditRoleVisible(false)} />

      <PickerModal visible={modal === 'defaultShare'} title="New events default to"
        options={['Shared', 'Private']} selected={defaultShare}
        onSave={v => { setDefaultShare(v); savePref('defaultShare', v); }}
        onClose={() => setModal(null)} />

      <PickerModal visible={modal === 'privateAs'} title="Private events show as"
        options={['Busy · no details', 'Hidden', 'Free']} selected={privateAs}
        onSave={v => { setPrivateAs(v); savePref('privateAs', v); }}
        onClose={() => setModal(null)} />

      <PickerModal visible={modal === 'focusStatus'} title="Show focus status"
        options={['Always', 'During session only', 'Never']} selected={focusStatus}
        onSave={v => { setFocusStatus(v); savePref('focusStatus', v); }}
        onClose={() => setModal(null)} />

      <EditModal visible={modal === 'bedtime'} title="Bedtime · quiet hours (e.g. 23:00 → 06:00)" value={bedtime}
        onSave={v => { setBedtime(v); savePref('bedtime', v); }}
        onClose={() => setModal(null)} />

      <PickerModal visible={modal === 'crossNotifs'} title="Cross-notifications"
        options={['Always on', 'Off during focus', 'Off always']} selected={crossNotifs}
        onSave={v => { setCrossNotifs(v); savePref('crossNotifs', v); }}
        onClose={() => setModal(null)} />

    </ScrollView>
  );
}

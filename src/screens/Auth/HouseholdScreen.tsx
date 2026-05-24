import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/tokens';
import type { UserId } from '../../lib/types';
import { USER_SLOTS, MAX_HOUSEHOLD_MEMBERS } from '../../lib/types';

interface Props {
  userId: string;
}

type Step = 'choose' | 'create' | 'join';

export function HouseholdScreen({ userId }: Props) {
  const insets = useSafeAreaInsets();
  const { dispatch } = useStore();
  const [step, setStep]           = useState<Step>('choose');
  const [houseName, setHouseName] = useState('Home');
  const [yourName, setYourName]   = useState('');
  const [yourRole, setYourRole]   = useState('');
  const [slot, setSlot]           = useState<UserId>('1');
  const [inviteCode, setInviteCode] = useState('');
  const [joinName, setJoinName]   = useState('');
  const [joinRole, setJoinRole]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  async function createHousehold() {
    if (!yourName.trim()) { setError('Enter your name'); return; }
    setLoading(true);
    setError('');

    // Ensure session is present before writing
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError('Not signed in — please restart the app and sign in again'); setLoading(false); return; }

    // 1. Create household
    const { data: hh, error: e1 } = await supabase
      .from('households')
      .insert({ name: houseName.trim() || 'Home' })
      .select('id')
      .single();

    if (e1 || !hh) { setError(`${e1?.message ?? 'Failed'} (code: ${e1?.code})`); setLoading(false); return; }

    // 2. Upsert profile — creator always gets slot '1'
    const creatorSlot: UserId = '1';
    const { error: e2 } = await supabase.from('profiles').upsert({
      id: userId,
      household_id: hh.id,
      display_name: yourName.trim(),
      short_id: creatorSlot,
      role_label: yourRole.trim() || null,
    });

    setLoading(false);
    if (e2) { setError(e2.message); return; }

    dispatch({ t: 'setHousehold', householdId: hh.id });
    dispatch({ t: 'setViewer', u: creatorSlot });
    dispatch({ t: 'setProfiles', profiles: {
      [creatorSlot]: { displayName: yourName.trim(), shortId: creatorSlot, roleLabel: yourRole.trim(), tagline: '' }
    } });
  }

  async function joinHousehold() {
    if (!joinName.trim()) { setError('Enter your name'); return; }
    if (!inviteCode.trim()) { setError('Enter invite code'); return; }
    setLoading(true);
    setError('');

    // Invite code IS the household UUID
    const hhId = inviteCode.trim();

    const { data: hh, error: e1 } = await supabase
      .from('households')
      .select('id')
      .eq('id', hhId)
      .single();

    if (e1 || !hh) { setError('Household not found — check the invite code'); setLoading(false); return; }

    // Determine which slot is free (re-check after insert to handle race)
    const { data: existing } = await supabase
      .from('profiles')
      .select('short_id, id')
      .eq('household_id', hhId);

    const others = (existing ?? []).filter((p: { id: string }) => p.id !== userId);
    const takenByOthers = others.map((p: { short_id: string }) => p.short_id);

    if (takenByOthers.length >= MAX_HOUSEHOLD_MEMBERS) {
      setError(`This household is full (max ${MAX_HOUSEHOLD_MEMBERS} members)`);
      setLoading(false);
      return;
    }

    const mySlot = USER_SLOTS.find(s => !takenByOthers.includes(s)) ?? '1';

    const { error: e2 } = await supabase.from('profiles').upsert({
      id: userId,
      household_id: hhId,
      display_name: joinName.trim(),
      short_id: mySlot,
      role_label: joinRole.trim() || null,
    });

    setLoading(false);
    if (e2) { setError(e2.message); return; }

    // Load all profiles in this household (the other person may already exist)
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('short_id, display_name, role_label, tagline')
      .eq('household_id', hhId);

    const profileMap: Record<string, { displayName: string; shortId: UserId; roleLabel: string; tagline: string }> = {};
    (allProfiles ?? []).forEach((p: { short_id: string; display_name: string; role_label: string | null; tagline: string | null }) => {
      profileMap[p.short_id] = { displayName: p.display_name, shortId: p.short_id as UserId, roleLabel: p.role_label ?? '', tagline: p.tagline ?? '' };
    });

    dispatch({ t: 'setHousehold', householdId: hhId });
    dispatch({ t: 'setViewer', u: mySlot as UserId });
    dispatch({ t: 'setProfiles', profiles: profileMap });
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <Text style={s.wordmark}>TIMELY</Text>

        {step === 'choose' && (
          <>
            <Text style={s.headline}>Set up{'\n'}your home.</Text>
            <Text style={s.sub}>Is this the first phone, or are you joining someone who's already set up?</Text>
            <TouchableOpacity style={s.card} onPress={() => setStep('create')}>
              <Text style={[s.cardTitle, { color: '#fff' }]}>Create household</Text>
              <Text style={[s.cardSub, { color: 'rgba(255,255,255,0.6)' }]}>First phone — you'll get an invite code to share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.card, s.cardOutline]} onPress={() => setStep('join')}>
              <Text style={s.cardTitle}>Join household</Text>
              <Text style={s.cardSub}>Paste the invite code your partner sent</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'create' && (
          <>
            <Text style={s.headline}>Create{'\n'}household.</Text>
            <Text style={s.fieldLabel}>HOUSEHOLD NAME</Text>
            <TextInput style={s.input} value={houseName} onChangeText={setHouseName} placeholder="Home" placeholderTextColor={colors.fg4} />
            <Text style={s.fieldLabel}>YOUR NAME</Text>
            <TextInput style={s.input} value={yourName} onChangeText={setYourName} placeholder="e.g. Maya" placeholderTextColor={colors.fg4} autoFocus />
            <Text style={s.fieldLabel}>YOUR ROLE (OPTIONAL)</Text>
            <TextInput style={s.input} value={yourRole} onChangeText={setYourRole} placeholder="e.g. Designer at Studio" placeholderTextColor={colors.fg4} />
            {error ? <Text style={s.err}>{error}</Text> : null}
            <TouchableOpacity style={s.btn} onPress={createHousehold} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnLabel}>CREATE</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('choose'); setError(''); }} style={s.link}>
              <Text style={s.linkLabel}>Back</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 'join' && (
          <>
            <Text style={s.headline}>Join{'\n'}household.</Text>
            <Text style={s.sub}>Your partner can find the household ID in the You tab → Share with partner.</Text>
            <Text style={s.fieldLabel}>YOUR NAME</Text>
            <TextInput style={s.input} value={joinName} onChangeText={setJoinName} placeholder="e.g. Arjun" placeholderTextColor={colors.fg4} autoFocus />
            <Text style={s.fieldLabel}>YOUR ROLE (OPTIONAL)</Text>
            <TextInput style={s.input} value={joinRole} onChangeText={setJoinRole} placeholder="e.g. PM at Resonera" placeholderTextColor={colors.fg4} />
            <Text style={s.fieldLabel}>INVITE CODE (HOUSEHOLD ID)</Text>
            <TextInput
              style={s.input}
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              placeholderTextColor={colors.fg4}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? <Text style={s.err}>{error}</Text> : null}
            <TouchableOpacity style={s.btn} onPress={joinHousehold} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnLabel}>JOIN</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('choose'); setError(''); }} style={s.link}>
              <Text style={s.linkLabel}>Back</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.background },
  inner: { paddingHorizontal: 28, paddingBottom: 40 },
  wordmark: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    letterSpacing: 3,
    color: colors.fg3,
    marginBottom: 32,
  },
  headline: {
    fontSize: 38,
    fontWeight: '700',
    color: colors.foreground,
    lineHeight: 44,
    letterSpacing: -1,
    marginBottom: 20,
  },
  sub: { fontSize: 15, color: colors.fg5, lineHeight: 22, marginBottom: 28 },
  fieldLabel: {
    fontFamily: 'SpaceMono',
    fontSize: 10,
    letterSpacing: 2,
    color: colors.fg4,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border12,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.foreground,
    backgroundColor: colors.bgTint02,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  slotBtn: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: colors.border12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotActive:      { backgroundColor: colors.foreground, borderColor: colors.foreground },
  slotLabel:       { fontSize: 14, color: colors.fg5 },
  slotLabelActive: { color: '#fff', fontWeight: '600' },
  card: {
    borderRadius: 14,
    backgroundColor: colors.foreground,
    padding: 20,
    marginBottom: 12,
  },
  cardOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border12,
  },
  cardTitle:   { fontSize: 17, fontWeight: '700', color: colors.foreground, marginBottom: 4 },
  cardSub:     { fontSize: 13, color: colors.fg5 },
  btn: {
    height: 52,
    backgroundColor: colors.foreground,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  btnLabel: { color: '#fff', fontFamily: 'SpaceMono', fontSize: 12, letterSpacing: 2 },
  link: { marginTop: 20, alignSelf: 'center' },
  linkLabel: { color: colors.fg5, fontSize: 14 },
  err: { color: colors.destructive, fontSize: 13, marginTop: 8 },
});

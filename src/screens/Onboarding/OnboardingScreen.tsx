import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { colors } from '../../lib/tokens';
import { UserChip, UserStripe, Card, CardInv, CardAlt, Tag, styles as S } from '../../components/Primitives';
import { Icon } from '../../components/Icon';

const TOTAL = 4;

interface Props {
  onDone: () => void;
}

export function OnboardingScreen({ onDone }: Props) {
  const [step, setStep] = useState(0);

  const next = () => step < TOTAL - 1 ? setStep(step + 1) : onDone();
  const back = () => step > 0 && setStep(step - 1);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ flex: 1, padding: 20, paddingBottom: 100 }}>
        {/* Progress */}
        <View style={ob.progress}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <View key={i} style={[ob.seg, i <= step && ob.segOn]} />
          ))}
        </View>

        {/* Header row */}
        <View style={[S.between, { marginBottom: 24 }]}>
          <Text style={ob.monoSm}>TIMELY · SETUP {step + 1}/{TOTAL}</Text>
          <TouchableOpacity onPress={onDone}>
            <Text style={[ob.monoSm, { color: colors.fg6 }]}>SKIP</Text>
          </TouchableOpacity>
        </View>

        {/* Step content */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {step === 0 && <StepWelcome />}
          {step === 1 && <StepHouse />}
          {step === 2 && <StepSharing />}
          {step === 3 && <StepWrap />}
        </ScrollView>

        {/* Footer */}
        <View style={[S.row, { gap: 10, marginTop: 14 }]}>
          {step > 0 && (
            <TouchableOpacity onPress={back} style={ob.btnOutline}>
              <Icon name="chevLeft" size={18} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={next} style={[ob.btnPrimary, { flex: 1, flexDirection: 'row', gap: 8 }]}>
            <Text style={ob.btnPrimaryTxt}>{step === TOTAL - 1 ? 'Open Timely' : 'Continue'}</Text>
            <Icon name="arrow" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

function StepWelcome() {
  return (
    <View>
      <Text style={ob.monoSm}>HI, WE'RE</Text>
      <Text style={{ fontWeight: '900', fontSize: 64, lineHeight: 58, letterSpacing: -3, marginTop: 16 }}>
        Timely.{'\n'}
        <Text style={{ color: colors.fg9 }}>A clock{'\n'}for two.</Text>
      </Text>
      <Text style={{ fontSize: 14, color: colors.fg3, fontWeight: '300', lineHeight: 22, marginTop: 22, maxWidth: 280 }}>
        One app for your shared timetable, alarms, reminders and quiet hours.{'\n\n'}
        Private events stay private. Everything else lives in the same calendar.
      </Text>
      <View style={[S.row, { gap: 10, marginTop: 32 }]}>
        {[
          { id: '1' as const, name: 'You',     line: 'Therapy · Thu' },
          { id: '2' as const, name: 'Partner', line: 'Standup · Mon' },
        ].map((p) => (
          <Card key={p.id} style={{ flex: 1, padding: 14 }}>
            <UserChip id={p.id} size="lg" />
            <Text style={{ fontSize: 13, fontWeight: '700', marginTop: 10 }}>{p.name}</Text>
            <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5, marginTop: 4 }}>{p.line.toUpperCase()}</Text>
          </Card>
        ))}
      </View>
    </View>
  );
}

function StepHouse() {
  const [m, setM] = useState('Maya');
  const [a, setA] = useState('Arjun');
  return (
    <View>
      <Text style={ob.monoSm}>STEP 1 · THE HOUSE</Text>
      <Text style={{ fontWeight: '900', fontSize: 38, lineHeight: 36, letterSpacing: -1.4, marginTop: 16 }}>
        Who lives{'\n'}<Text style={{ color: colors.fg9 }}>in the house?</Text>
      </Text>
      <Text style={{ fontSize: 13, color: colors.fg5, fontWeight: '300', marginTop: 12, maxWidth: 280 }}>
        Names go on every event you share. Add your partner once — they'll get an invite link.
      </Text>
      <View style={{ marginTop: 26, gap: 12 }}>
        <Card style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <UserChip id="1" size="xl" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5, marginBottom: 4 }}>YOU</Text>
            <TextInput value={m} onChangeText={setM}
              style={{ fontWeight: '800', fontSize: 18, letterSpacing: -0.5, color: colors.fg1 }} />
          </View>
        </Card>
        <Card style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <UserChip id="2" size="xl" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5, marginBottom: 4 }}>PARTNER</Text>
            <TextInput value={a} onChangeText={setA}
              style={{ fontWeight: '800', fontSize: 18, letterSpacing: -0.5, color: colors.fg1 }} />
          </View>
          <TouchableOpacity style={{ height: 30, paddingHorizontal: 12, borderRadius: 9999, backgroundColor: colors.bgTint04, borderWidth: 1, borderColor: colors.border08, justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: colors.fg2 }}>Invite link</Text>
          </TouchableOpacity>
        </Card>
      </View>
      <CardAlt style={{ marginTop: 18, padding: 14 }}>
        <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5 }}>PREVIEW · HOW YOU'LL SHOW UP</Text>
        <View style={[S.row, { gap: 8, marginTop: 12, flexWrap: 'wrap' }]}>
          {[
            { id: '1' as const, label: m.toUpperCase() },
            { id: '2' as const, label: a.toUpperCase() },
            { id: 'B' as const, label: 'TOGETHER' },
          ].map(({ id, label }) => (
            <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 22, paddingHorizontal: 9, borderWidth: 1, borderColor: colors.border12, backgroundColor: colors.bgTint04, borderRadius: 9999 }}>
              <UserChip id={id} />
              <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: colors.fg4 }}>{label}</Text>
            </View>
          ))}
        </View>
      </CardAlt>
    </View>
  );
}

function StepSharing() {
  const [defShared, setDefShared] = useState(true);
  const [hideTitles, setHideTitles] = useState(true);
  const events = [
    { ev: 'Morning run',   priv: false, time: '06:30', loc: 'Carter Road' },
    { ev: 'Therapy',       priv: true,  time: '07:30', loc: 'Dr. Mehta' },
    { ev: 'Client review', priv: false, time: '09:30', loc: 'Studio' },
  ];
  return (
    <View>
      <Text style={ob.monoSm}>STEP 2 · SHARING</Text>
      <Text style={{ fontWeight: '900', fontSize: 38, lineHeight: 36, letterSpacing: -1.4, marginTop: 16 }}>
        Public is default.{'\n'}<Text style={{ color: colors.fg9 }}>Private when it matters.</Text>
      </Text>
      <Text style={{ fontSize: 13, color: colors.fg5, fontWeight: '300', marginTop: 12, maxWidth: 280 }}>
        Every event has a single toggle. Private events show your partner 'busy' with no details.
      </Text>
      <Card style={{ padding: 14, marginTop: 22 }}>
        <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5, marginBottom: 12 }}>PARTNER'S VIEW · YOUR FRIDAY</Text>
        <View style={{ gap: 8 }}>
          {events.map((e, i) => {
            const hidden = e.priv && hideTitles;
            return (
              <View key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10, backgroundColor: colors.bgTint02, borderWidth: 1, borderColor: colors.border08, borderRadius: 14 }}>
                <UserStripe id={hidden ? 'priv' : '1'} priv={hidden} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', letterSpacing: -0.1 }}>{hidden ? 'Private · busy' : e.ev}</Text>
                  <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 3 }}>
                    {e.time} · {hidden ? 'NO DETAILS' : e.loc.toUpperCase()}
                  </Text>
                </View>
                {e.priv && <Icon name="lock" size={14} color={colors.fg6} />}
              </View>
            );
          })}
        </View>
      </Card>
      <Card style={{ padding: 0, marginTop: 14 }}>
        {[
          { label: 'New events default to', sub: defShared ? 'SHARED · BOTH SEE IT' : 'PRIVATE · ONLY YOU SEE', value: defShared, onChange: setDefShared },
          { label: 'Hide titles on private events', sub: "SHOW AS 'BUSY' · NO DETAILS", value: hideTitles, onChange: setHideTitles },
        ].map((row, i) => (
          <View key={i} style={[S.row, { padding: 14, paddingHorizontal: 16, gap: 12, borderBottomWidth: i === 0 ? 1 : 0, borderBottomColor: colors.border06 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: '600' }}>{row.label}</Text>
              <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 3 }}>{row.sub}</Text>
            </View>
            <View style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}>
              <View style={[{ width: 44, height: 26, borderRadius: 13, backgroundColor: row.value ? colors.foreground : colors.bgTint06, borderWidth: 1, borderColor: row.value ? colors.foreground : colors.border10 }]}>
                <TouchableOpacity onPress={() => row.onChange(!row.value)} style={{ flex: 1, justifyContent: 'center' }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', position: 'absolute', top: 2, left: row.value ? 20 : 2 }} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
}

function StepWrap() {
  return (
    <View>
      <Text style={ob.monoSm}>STEP 3 · QUIET HOURS</Text>
      <Text style={{ fontWeight: '900', fontSize: 38, lineHeight: 36, letterSpacing: -1.4, marginTop: 16 }}>
        Phones dim{'\n'}<Text style={{ color: colors.fg9 }}>when the lights do.</Text>
      </Text>
      <Text style={{ fontSize: 13, color: colors.fg5, fontWeight: '300', marginTop: 12, maxWidth: 280 }}>
        Set bedtime. Wake with the same alarm. Notifications stay quiet for both of you.
      </Text>
      <CardInv style={{ marginTop: 22 }}>
        <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fgInv4, marginBottom: 12 }}>BEDTIME · TOGETHER</Text>
        <View style={[S.row, { alignItems: 'baseline', gap: 12 }]}>
          <Text style={{ fontWeight: '900', fontSize: 56, lineHeight: 50, letterSpacing: -2.5, color: '#fff' }}>23:00</Text>
          <Text style={{ fontWeight: '900', fontSize: 24, color: colors.fgInv4 }}>→</Text>
          <Text style={{ fontWeight: '900', fontSize: 56, lineHeight: 50, letterSpacing: -2.5, color: '#fff' }}>06:00</Text>
        </View>
        <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fgInv4, marginTop: 14 }}>7 HOURS · SUNRISE WAKE · GENTLE</Text>
      </CardInv>
      <CardAlt style={{ marginTop: 14, padding: 14 }}>
        <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5 }}>YOU'RE ALL SET</Text>
        <Text style={{ fontWeight: '900', fontSize: 22, lineHeight: 21, letterSpacing: -0.6, marginTop: 8 }}>
          Two calendars, <Text style={{ color: colors.fg9 }}>one home.</Text>
        </Text>
        <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 10 }}>
          TAP 'OPEN TIMELY' · WE'LL FILL IN TODAY'S EVENTS FOR YOU
        </Text>
      </CardAlt>
    </View>
  );
}

const ob = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: 4, marginBottom: 24 },
  seg: { height: 3, flex: 1, backgroundColor: colors.bgTint06, borderRadius: 2 },
  segOn: { backgroundColor: colors.foreground },
  monoSm: { fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.2, color: colors.fg5 } as any,
  btnPrimary: { height: 44, backgroundColor: colors.foreground, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimaryTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnOutline: { width: 52, height: 44, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border15, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

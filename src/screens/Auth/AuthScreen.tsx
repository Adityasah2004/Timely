import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/tokens';

type Step = 'email' | 'otp' | 'sent';

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [otp, setOtp]     = useState('');
  const [step, setStep]   = useState<Step>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function sendMagicLink() {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const { error: e } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: undefined,  // OTP code only, no magic link
      },
    });
    setLoading(false);
    if (e) { setError(e.message); return; }
    setStep('sent');
  }

  async function verifyOtp() {
    if (!otp.trim()) return;
    setLoading(true);
    setError('');
    const { error: e } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otp.trim(),
      type: 'email',
    });
    setLoading(false);
    if (e) { setError(e.message); }
    // on success, supabase session updates → App.tsx re-renders to main app
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.inner}>
        <Text style={s.wordmark}>TIMELY</Text>
        <Text style={s.headline}>Your day,{'\n'}together.</Text>

        {step === 'email' && (
          <>
            <Text style={s.sub}>Enter your email to get a sign-in link.</Text>
            <TextInput
              style={s.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.fg4}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={sendMagicLink}
            />
            {error ? <Text style={s.err}>{error}</Text> : null}
            <TouchableOpacity style={s.btn} onPress={sendMagicLink} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnLabel}>SEND LINK</Text>}
            </TouchableOpacity>
          </>
        )}

        {step === 'sent' && (
          <>
            <Text style={s.sub}>Check your inbox — we sent a 6-digit code to{'\n'}<Text style={s.bold}>{email}</Text></Text>
            <TextInput
              style={s.input}
              placeholder="12345678"
              placeholderTextColor={colors.fg4}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={8}
              returnKeyType="done"
              onSubmitEditing={verifyOtp}
              autoFocus
            />
            {error ? <Text style={s.err}>{error}</Text> : null}
            <TouchableOpacity style={s.btn} onPress={verifyOtp} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnLabel}>VERIFY</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setStep('email'); setError(''); setOtp(''); }} style={s.link}>
              <Text style={s.linkLabel}>Use a different email</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
  },
  wordmark: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
    letterSpacing: 3,
    color: colors.fg3,
    marginBottom: 40,
  },
  headline: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.foreground,
    lineHeight: 46,
    marginBottom: 32,
    letterSpacing: -1,
  },
  sub: {
    fontSize: 15,
    color: colors.fg5,
    lineHeight: 22,
    marginBottom: 20,
  },
  bold: {
    color: colors.foreground,
    fontWeight: '600',
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
    marginBottom: 12,
  },
  btn: {
    height: 52,
    backgroundColor: colors.foreground,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnLabel: {
    color: '#fff',
    fontFamily: 'SpaceMono',
    fontSize: 12,
    letterSpacing: 2,
  },
  link: {
    marginTop: 20,
    alignSelf: 'center',
  },
  linkLabel: {
    color: colors.fg5,
    fontSize: 14,
  },
  err: {
    color: colors.destructive,
    fontSize: 13,
    marginBottom: 8,
  },
});

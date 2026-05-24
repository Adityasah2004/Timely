import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Dev: read from .env. Production build: fall back to app.json extra (always present).
const url  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? (Constants.expoConfig?.extra?.supabaseUrl as string);
const key  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? (Constants.expoConfig?.extra?.supabaseAnonKey as string);

// expo-secure-store adapter for Supabase session persistence
const ExpoSecureStoreAdapter = {
  getItem:    (key: string) => SecureStore.getItemAsync(key),
  setItem:    (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(url, key, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ── Database types (matches migration) ─────────────────────────
export interface DbHousehold {
  id: string;
  name: string;
  created_at: string;
}

export interface DbProfile {
  id: string;
  household_id: string;
  display_name: string;
  short_id: 'M' | 'A';
  role_label: string | null;
  tagline: string | null;
  created_at: string;
}

export interface DbEvent {
  id: string;
  household_id: string;
  owner_id: string;
  title: string;
  location: string;
  start_time: string;   // 'HH:MM:SS'
  end_time: string;
  event_date: string;   // 'YYYY-MM-DD'
  who: 'M' | 'A' | 'B';
  is_private: boolean;
  reminder_offset_min: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbTodo {
  id: string;
  household_id: string;
  owner_id: string;
  short_id?: string;     // joined from profiles
  text: string;
  is_shared: boolean;
  shared_with: string[] | null;
  is_done: boolean;
  due_label: string;
  priority: 1 | 2 | 3;
  created_at: string;
  updated_at: string;
}

export interface DbAlarm {
  id: string;
  household_id: string;
  owner_id: string;
  short_id?: string;     // joined from profiles
  alarm_time: string;   // 'HH:MM:SS'
  label: string;
  days_label: string;
  is_on: boolean;
  is_shared: boolean;
  sound: string;
  created_at: string;
}

export interface DbActivity {
  id: string;
  household_id: string;
  actor_id: string;
  actor_short: 'M' | 'A' | 'B';
  verb: string;
  obj: string;
  badge: string;
  created_at: string;
}

export interface DbNotification {
  id: string;
  household_id: string;
  for_user: string;
  kind: string;
  title: string;
  body: string;
  urgent: boolean;
  is_read: boolean;
  created_at: string;
}

export interface DbFocusSession {
  id: string;
  household_id: string;
  owner_id: string;
  label: string;
  duration_min: number;
  started_at: string;
  ended_at: string | null;
  created_at: string;
}

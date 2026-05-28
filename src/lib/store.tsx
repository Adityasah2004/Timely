import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { UserId, CalEvent, Alarm, Todo, ModalKind, TabName, ActivityItem, Notification, FocusSession, ChatMessage, StartupDoc } from './types';
import { USER_SLOTS } from './types';
import { supabase } from './supabase';
import type { DbNotification } from './supabase';
import { useRealtime } from './useRealtime';

export interface ProfileInfo {
  displayName: string;
  shortId: UserId;
  roleLabel: string;
  tagline: string;
  preferences?: Record<string, string>;
}
export type ProfileMap = Partial<Record<UserId, ProfileInfo>>;

interface AppState {
  tab: TabName;
  viewer: UserId;
  alarms: Alarm[];
  todos: Todo[];
  events: CalEvent[];
  activity: ActivityItem[];
  notifications: Notification[];
  focusSessions: FocusSession[];
  messages: ChatMessage[];
  docs: StartupDoc[];
  modal: ModalKind;
  showOnboarding: boolean;
  clock: Date;
  // auth
  session: Session | null;
  userId: string | null;
  householdId: string | null;
  authReady: boolean;
  profiles: ProfileMap;
}

type Action =
  | { t: 'tab'; tab: TabName }
  | { t: 'setViewer'; u: UserId }
  | { t: 'openEvent'; ev: CalEvent }
  | { t: 'openAdd' }
  | { t: 'openNewAlarm' }
  | { t: 'openNewTodo' }
  | { t: 'openNewDoc' }
  | { t: 'openDoc'; doc: StartupDoc }
  | { t: 'closeModal' }
  | { t: 'onboard' }
  | { t: 'finishOnboard' }
  | { t: 'toggleAlarm'; id: string; v: boolean }
  | { t: 'toggleTodo'; id: string }
  | { t: 'addTodo'; todo: Omit<Todo, 'id' | 'done'> }
  | { t: 'addAlarm'; alarm: Omit<Alarm, 'id' | 'on'> }
  | { t: 'togglePriv'; v: boolean }
  | { t: 'tick'; clock: Date }
  | { t: 'setSession'; session: Session | null; userId: string | null }
  | { t: 'setHousehold'; householdId: string | null }
  | { t: 'setAuthReady' }
  | { t: 'setEvents'; events: CalEvent[] }
  | { t: 'setTodos'; todos: Todo[] }
  | { t: 'setAlarms'; alarms: Alarm[] }
  | { t: 'setActivity'; activity: ActivityItem[] }
  | { t: 'setNotifications'; notifications: Notification[] }
  | { t: 'setFocusSessions'; sessions: FocusSession[] }
  | { t: 'setMessages'; messages: ChatMessage[] }
  | { t: 'setDocs'; docs: StartupDoc[] }
  | { t: 'markNotifRead'; id: string }
  | { t: 'setProfiles'; profiles: ProfileMap };

const INITIAL_STATE: AppState = {
  tab: 'today',
  viewer: '1',
  alarms: [],
  todos: [],
  events: [],
  activity: [],
  notifications: [],
  focusSessions: [],
  messages: [],
  docs: [],
  modal: null,
  showOnboarding: false,
  clock: new Date(),
  session: null,
  userId: null,
  householdId: null,
  authReady: false,
  profiles: {},
};

function reducer(s: AppState, a: Action): AppState {
  switch (a.t) {
    case 'tab':           return { ...s, tab: a.tab, modal: null };
    case 'setViewer':     return { ...s, viewer: a.u };
    case 'openEvent':     return { ...s, modal: { kind: 'event', ev: a.ev } };
    case 'openAdd':       return { ...s, modal: { kind: 'addEvent' } };
    case 'openNewAlarm':  return { ...s, modal: { kind: 'addAlarm' } };
    case 'openNewTodo':   return { ...s, modal: { kind: 'addTodo' } };
    case 'openNewDoc':    return { ...s, modal: { kind: 'addDoc' } };
    case 'openDoc':       return { ...s, modal: { kind: 'doc', doc: a.doc } };
    case 'closeModal':    return { ...s, modal: null };
    case 'onboard':       return { ...s, showOnboarding: true };
    case 'finishOnboard': return { ...s, showOnboarding: false };
    case 'toggleAlarm':   return { ...s, alarms: s.alarms.map(al => al.id === a.id ? { ...al, on: a.v } : al) };
    case 'toggleTodo':    return { ...s, todos: s.todos.map(td => td.id === a.id ? { ...td, done: !td.done } : td) };
    case 'addTodo':       return {
      ...s,
      todos: [{ id: 'tn' + Date.now(), done: false, ...a.todo } as Todo, ...s.todos],
      modal: null,
    };
    case 'addAlarm':      return {
      ...s,
      alarms: [{ id: 'an' + Date.now(), on: true, who: s.viewer, ...a.alarm, days: a.alarm.days || 'EVERY DAY' } as Alarm, ...s.alarms],
      modal: null,
    };
    case 'togglePriv': {
      if (s.modal?.kind !== 'event') return s;
      return { ...s, modal: { ...s.modal, ev: { ...s.modal.ev, priv: a.v } } };
    }
    case 'tick':               return { ...s, clock: a.clock };
    case 'setSession':         return { ...s, session: a.session, userId: a.userId };
    case 'setHousehold':       return { ...s, householdId: a.householdId };
    case 'setAuthReady':       return { ...s, authReady: true };
    case 'setEvents':          return { ...s, events: a.events };
    case 'setTodos':           return { ...s, todos: a.todos };
    case 'setAlarms':          return { ...s, alarms: a.alarms };
    case 'setActivity':        return { ...s, activity: a.activity };
    case 'setNotifications':   return { ...s, notifications: a.notifications };
    case 'setFocusSessions':   return { ...s, focusSessions: a.sessions };
    case 'setMessages':        return { ...s, messages: a.messages };
    case 'setDocs':            return { ...s, docs: a.docs };
    case 'markNotifRead':      return { ...s, notifications: s.notifications.map(n => n.id === a.id ? { ...n, read: true } : n) };
    case 'setProfiles':        return { ...s, profiles: a.profiles };
    default: return s;
  }
}

const StoreContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action>; refresh: () => Promise<void> } | null>(null);

// Helper: write an activity row + optional notification to Supabase
export async function writeActivity(
  householdId: string,
  actorId: string,
  actorSlot: UserId,
  verb: string,
  obj: string,
  badge: string,
  notif?: { title: string; body: string; forUser: UserId | 'B'; urgent?: boolean }
) {
  await supabase.from('activity').insert({
    household_id: householdId,
    actor_id:     actorId,
    actor_short:  actorSlot,
    verb,
    obj,
    badge,
  });
  if (notif) {
    await supabase.from('notifications').insert({
      household_id: householdId,
      for_user:     notif.forUser,
      kind:         badge,
      title:        notif.title,
      body:         notif.body,
      urgent:       notif.urgent ?? false,
    });
  }
}

function dbNotif(r: DbNotification): Notification {
  return {
    id:     r.id,
    when:   new Date(r.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }),
    kind:   r.kind,
    title:  r.title,
    body:   r.body,
    urgent: r.urgent,
    read:   r.is_read,
  };
}

function RealtimeBridge({ householdId, dispatch, refreshRef }: { householdId: string | null; dispatch: React.Dispatch<Action>; refreshRef: React.MutableRefObject<() => Promise<void>> }) {
  const onEvents        = useCallback((evs: CalEvent[])      => dispatch({ t: 'setEvents',        events: evs }),        [dispatch]);
  const onTodos         = useCallback((ts: Todo[])            => dispatch({ t: 'setTodos',         todos: ts }),          [dispatch]);
  const onAlarms        = useCallback((as: Alarm[])           => dispatch({ t: 'setAlarms',        alarms: as }),         [dispatch]);
  const onActivity      = useCallback((a: ActivityItem[])     => dispatch({ t: 'setActivity',      activity: a }),        [dispatch]);
  const onNotifications = useCallback((ns: DbNotification[])  => dispatch({ t: 'setNotifications', notifications: ns.map(dbNotif) }), [dispatch]);
  const onMessages      = useCallback((msgs: ChatMessage[])   => dispatch({ t: 'setMessages',       messages: msgs }),      [dispatch]);
  const onDocs          = useCallback((docs: StartupDoc[])   => dispatch({ t: 'setDocs',           docs: docs }),          [dispatch]);

  const { refresh } = useRealtime({ householdId, onEvents, onTodos, onAlarms, onActivity, onNotifications, onMessages, onDocs });
  refreshRef.current = refresh;
  return null;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const refreshRef = React.useRef<() => Promise<void>>(async () => {});

  // Clock tick
  useEffect(() => {
    const id = setInterval(() => dispatch({ t: 'tick', clock: new Date() }), 60_000);
    return () => clearInterval(id);
  }, []);

  // Auth state
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        dispatch({ t: 'setSession', session: data.session, userId: data.session?.user.id ?? null });
      })
      .catch(() => {})
      .finally(() => {
        dispatch({ t: 'setAuthReady' });
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch({ t: 'setSession', session, userId: session?.user.id ?? null });
      if (!session) dispatch({ t: 'setHousehold', householdId: null });
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Load household + all profiles for current user
  useEffect(() => {
    if (!state.userId) return;
    supabase
      .from('profiles')
      .select('id, household_id, short_id, display_name, role_label, tagline, preferences')
      .eq('id', state.userId)
      .single()
      .then(({ data: me }) => {
        if (!me) return;
        dispatch({ t: 'setHousehold', householdId: me.household_id });
        dispatch({ t: 'setViewer', u: me.short_id as UserId });
        return supabase
          .from('profiles')
          .select('short_id, display_name, role_label, tagline, preferences')
          .eq('household_id', me.household_id)
          .then(({ data: all }) => {
            if (!all) return;
            const map: ProfileMap = {};
            all.forEach((p: { short_id: string; display_name: string; role_label: string | null; tagline: string | null; preferences: Record<string, string> | null }) => {
              map[p.short_id as UserId] = {
                displayName:  p.display_name,
                shortId:      p.short_id as UserId,
                roleLabel:    p.role_label ?? '',
                tagline:      p.tagline ?? '',
                preferences:  p.preferences ?? undefined,
              };
            });
            dispatch({ t: 'setProfiles', profiles: map });
          });
      });
  }, [state.userId]);

  // Persist todo toggles to Supabase
  const prevTodos = React.useRef(state.todos);
  useEffect(() => {
    if (!state.householdId) { prevTodos.current = state.todos; return; }
    const prev = prevTodos.current;
    state.todos.forEach(td => {
      const old = prev.find(p => p.id === td.id);
      if (old && old.done !== td.done) {
        supabase.from('todos').update({ is_done: td.done }).eq('id', td.id);
        if (state.userId && state.householdId) {
          writeActivity(state.householdId, state.userId, state.viewer,
            td.done ? 'completed' : 'unchecked', td.text, 'todo');
        }
      }
    });
    prevTodos.current = state.todos;
  }, [state.todos]);

  // Persist alarm toggles to Supabase
  const prevAlarms = React.useRef(state.alarms);
  useEffect(() => {
    if (!state.householdId) { prevAlarms.current = state.alarms; return; }
    const prev = prevAlarms.current;
    state.alarms.forEach(al => {
      const old = prev.find(p => p.id === al.id);
      if (old && old.on !== al.on) {
        supabase.from('alarms').update({ is_on: al.on }).eq('id', al.id);
      }
    });
    prevAlarms.current = state.alarms;
  }, [state.alarms]);

  const refresh = useCallback(() => refreshRef.current(), []);

  return (
    <StoreContext.Provider value={{ state, dispatch, refresh }}>
      <RealtimeBridge householdId={state.householdId} dispatch={dispatch} refreshRef={refreshRef} />
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be inside StoreProvider');
  return ctx;
}

export function useRefresh() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useRefresh must be inside StoreProvider');
  return ctx.refresh;
}

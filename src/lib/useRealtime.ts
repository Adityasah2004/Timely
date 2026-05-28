import { useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import type { DbEvent, DbTodo, DbAlarm, DbActivity, DbNotification } from './supabase';
import type { UserId, CalEvent, Todo, Alarm, ActivityItem, ChatMessage, StartupDoc } from './types';

interface DbMessage {
  id: string;
  household_id: string;
  sender_id: string | null;
  sender_short: string;
  content: string;
  is_system: boolean;
  created_at: string;
}

interface DbDoc {
  id: string;
  household_id: string;
  title: string;
  content: string;
  tags: string[];
  attachments?: any[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function dbEvent(r: DbEvent): CalEvent {
  return {
    id: r.id,
    start: r.start_time.slice(0, 5),
    end: r.end_time.slice(0, 5),
    title: r.title,
    loc: r.location,
    who: r.who as UserId | 'B',
    priv: r.is_private,
    day: r.event_date,
    reminderOffsetMin: r.reminder_offset_min ?? null,
  };
}

function dbTodo(r: DbTodo): Todo {
  return {
    id: r.id,
    text: r.text,
    who: (r.short_id ?? '1') as UserId,
    shared: r.is_shared,
    sharedWith: Array.isArray(r.shared_with) && r.shared_with.length > 0 ? r.shared_with as UserId[] : null,
    done: r.is_done,
    due: r.due_label,
    p: r.priority as 1 | 2 | 3,
  };
}

function dbAlarm(r: DbAlarm): Alarm {
  return {
    id: r.id,
    time: r.alarm_time.slice(0, 5),
    label: r.label,
    days: r.days_label,
    on: r.is_on,
    shared: r.is_shared,
    who: r.short_id as UserId | undefined,
    sound: r.sound,
  };
}

function dbMessage(r: DbMessage): ChatMessage {
  return {
    id: r.id,
    senderShort: r.sender_short as UserId | 'S',
    content: r.content,
    isSystem: r.is_system,
    timestamp: new Date(r.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }),
    createdAt: r.created_at,
  };
}

function dbDoc(r: DbDoc): StartupDoc {
  return {
    id: r.id,
    title: r.title,
    content: r.content,
    tags: Array.isArray(r.tags) ? r.tags : [],
    attachments: Array.isArray(r.attachments) ? r.attachments : [],
    createdBy: r.created_by,
    updatedAt: r.updated_at,
  };
}

export type { DbNotification };

interface RealtimeCallbacks {
  householdId: string | null;
  onEvents:        (evs: CalEvent[]) => void;
  onTodos:         (ts: Todo[]) => void;
  onAlarms:        (as: Alarm[]) => void;
  onActivity:      (a: ActivityItem[]) => void;
  onNotifications: (n: DbNotification[]) => void;
  onMessages:      (msgs: ChatMessage[]) => void;
  onDocs:          (docs: StartupDoc[]) => void;
}

// Returns Mon and Sun ISO dates for the week containing `date`
function weekRange(date: Date): { from: string; to: string } {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const fmt = (dt: Date) => {
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { from: fmt(mon), to: fmt(sun) };
}

export function useRealtime({ householdId, onEvents, onTodos, onAlarms, onActivity, onNotifications, onMessages, onDocs }: RealtimeCallbacks): { refresh: () => Promise<void> } {
  const fetchAll = useCallback(async () => {
    if (!householdId) return;

    const { from, to } = weekRange(new Date());

    const [{ data: evs }, { data: todos }, { data: alarms }, { data: acts }, { data: notifs }, { data: msgs }, { data: docs }] = await Promise.all([
      // Fetch entire current week's events
      supabase
        .from('events')
        .select('*')
        .eq('household_id', householdId)
        .gte('event_date', from)
        .lte('event_date', to)
        .order('start_time'),
      supabase
        .from('todos')
        .select('*, profiles!todos_owner_id_fkey(short_id)')
        .eq('household_id', householdId)
        .order('created_at'),
      supabase
        .from('alarms')
        .select('*, profiles!alarms_owner_id_fkey(short_id)')
        .eq('household_id', householdId)
        .order('alarm_time'),
      supabase
        .from('activity')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('notifications')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('messages')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true })
        .limit(100),
      supabase
        .from('docs')
        .select('*')
        .eq('household_id', householdId)
        .order('updated_at', { ascending: false }),
    ]);

    if (evs)    onEvents(evs.map(dbEvent));
    if (todos)  onTodos(todos.map(r => dbTodo({ ...r, short_id: r.profiles?.short_id })));
    if (alarms) onAlarms(alarms.map(r => dbAlarm({ ...r, short_id: r.profiles?.short_id })));
    if (acts)   onActivity(acts.map(r => ({
      t:     new Date(r.created_at).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }),
      who:   r.actor_short,
      verb:  r.verb,
      obj:   r.obj,
      badge: r.badge,
    })));
    if (notifs) onNotifications(notifs as DbNotification[]);
    if (msgs)   onMessages(msgs.map(dbMessage));
    if (docs)   onDocs(docs.map(dbDoc));
  }, [householdId]);

  useEffect(() => {
    if (!householdId) return;
    fetchAll();

    const channel = supabase
      .channel(`household:${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events',        filter: `household_id=eq.${householdId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos',         filter: `household_id=eq.${householdId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alarms',        filter: `household_id=eq.${householdId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity',      filter: `household_id=eq.${householdId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `household_id=eq.${householdId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages',      filter: `household_id=eq.${householdId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'docs',          filter: `household_id=eq.${householdId}` }, fetchAll)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [householdId, fetchAll]);

  return { refresh: fetchAll };
}

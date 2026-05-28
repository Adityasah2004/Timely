export type UserId = '1' | '2' | '3' | '4';
export const USER_SLOTS: UserId[] = ['1', '2', '3', '4'];
export const MAX_HOUSEHOLD_MEMBERS = 4;

export interface User {
  id: UserId;
  name: string;
  full: string;
  role: string;
  tagline: string;
}

export interface CalEvent {
  id: string;
  start: string; // 'HH:MM'
  end: string;
  title: string;
  loc: string;
  who: UserId | 'B'; // B = Both
  priv: boolean;
  day?: string; // YYYY-MM-DD
  reminderOffsetMin: number | null;
}

export interface Alarm {
  id: string;
  time: string; // 'HH:MM'
  label: string;
  days: string;
  on: boolean;
  shared: boolean;
  who?: UserId;
  sound: string;
}

export interface Todo {
  id: string;
  text: string;
  who: UserId;
  shared: boolean;
  sharedWith: UserId[] | null; // null = everyone; array = specific slots
  done: boolean;
  due: string;
  p: 1 | 2 | 3;
}

export interface ActivityItem {
  t: string;
  who: UserId | 'B';
  verb: string;
  obj: string;
  badge: string;
}

export interface Notification {
  id: string;
  when: string;   // formatted time string
  kind: string;
  title: string;
  body: string;
  urgent: boolean;
  read: boolean;
}

export interface FocusSession {
  id: string;
  ownerId: string;
  ownerSlot: UserId;
  label: string;
  durationMin: number;
  startedAt: string;   // ISO
  endedAt: string | null;
}

export interface WorldClock {
  city: string;
  tz: string;
  time: string;
  delta: string;
  note: string;
}

export interface ChatMessage {
  id: string;
  senderShort: UserId | 'S'; // '1'..'4' or 'S' for system/AI
  content: string;
  isSystem: boolean;
  timestamp: string; // HH:MM
  createdAt?: string; // ISO date string
}

export interface DocAttachment {
  name: string;
  size: number;
  mimeType: string;
  uri: string; // Public Supabase Storage URL
}

export interface StartupDoc {
  id: string;
  title: string;
  content: string;
  tags: string[];
  attachments: DocAttachment[];
  createdBy: string | null;
  updatedAt: string; // ISO
}

export type TabName = 'today' | 'plan' | 'todos' | 'chat' | 'docs' | 'you' | 'notifications';

export type ModalKind =
  | { kind: 'event'; ev: CalEvent }
  | { kind: 'addEvent' }
  | { kind: 'addTodo' }
  | { kind: 'addAlarm' }
  | { kind: 'addDoc' }
  | { kind: 'doc'; doc: StartupDoc }
  | null;

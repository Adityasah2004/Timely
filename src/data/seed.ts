import type { User, UserId, CalEvent, Alarm, Todo, ActivityItem, Notification, WorldClock } from '../lib/types';
import { USER_SLOTS } from '../lib/types';

export const USERS: Record<UserId, User> = {
  '1': { id: '1', name: 'Member 1', full: 'Member 1', role: '', tagline: '' },
  '2': { id: '2', name: 'Member 2', full: 'Member 2', role: '', tagline: '' },
  '3': { id: '3', name: 'Member 3', full: 'Member 3', role: '', tagline: '' },
  '4': { id: '4', name: 'Member 4', full: 'Member 4', role: '', tagline: '' },
};

export const USER_LIST: UserId[] = USER_SLOTS;

// Static demo data below — never shown at runtime (Supabase data takes over on launch).
// Uses legacy M/A who-slots; cast to silence TS.

export const TODAY_EVENTS: CalEvent[] = [] as any[];

export const WEEK_EVENTS: Record<string, CalEvent[]> = {} as any;

export const ALARMS_INIT: Alarm[] = [] as any[];

export const TODOS_INIT: Todo[] = [] as any[];

export const ACTIVITY: ActivityItem[] = [] as any[];

export const NOTIFICATIONS: Notification[] = [];

export const WORLD_CLOCKS: WorldClock[] = [];

export const FOCUS_STATS = {
  weekMinutes: 0,
  goal: 20 * 60,
  streak: 0,
  longest: 0,
  byUser: { '1': 0, '2': 0, '3': 0, '4': 0 } as Record<UserId, number>,
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Vibration, AppState as RNAppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Circle, Line } from 'react-native-svg';
import { scheduleNotif, cancelNotif, VIBRATE_PATTERN } from '../../lib/notifications';
import { useStore } from '../../lib/store';
import { colors } from '../../lib/tokens';
import { fmtHM } from '../../lib/utils';
import { USER_LIST } from '../../data/seed';
import { ScreenHeader, CardAlt, Card, SecLabel, UserChip, styles } from '../../components/Primitives';
import { Icon } from '../../components/Icon';
import type { UserId } from '../../lib/types';

type FocusMode = 'focus' | 'stopwatch' | 'timer';

// Per-mode persisted state
interface ModeState {
  elapsed: number;       // seconds accumulated before the last start
  startedAt: number | null; // Date.now() when last started, null if paused/stopped
  timerMinutes: number;  // only used by 'timer' mode
}

const STORAGE_KEY = 'focus_mode_state_v1';

const DEFAULT_MODE_STATE: Record<FocusMode, ModeState> = {
  focus:     { elapsed: 0, startedAt: null, timerMinutes: 25 },
  stopwatch: { elapsed: 0, startedAt: null, timerMinutes: 25 },
  timer:     { elapsed: 0, startedAt: null, timerMinutes: 25 },
};

function liveElapsed(ms: ModeState): number {
  if (ms.startedAt === null) return ms.elapsed;
  return ms.elapsed + Math.floor((Date.now() - ms.startedAt) / 1000);
}

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

function fmtLocalTime(tz: string, clock: Date): string {
  try {
    return clock.toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

const WORLD_CLOCKS = [
  { city: 'UTC',       tz: 'UTC',                 note: 'universal' },
  { city: 'Mumbai',    tz: 'Asia/Kolkata',         note: 'home'      },
  { city: 'London',    tz: 'Europe/London',        note: 'uk'        },
  { city: 'New York',  tz: 'America/New_York',     note: 'us east'   },
  { city: 'San Fran',  tz: 'America/Los_Angeles',  note: 'us west'   },
  { city: 'Tokyo',     tz: 'Asia/Tokyo',           note: 'japan'     },
];

const TIMER_PRESETS = [5, 10, 15, 20, 25, 30, 45, 60, 90];


export function FocusScreen() {
  const { state } = useStore();
  const [mode, setMode] = useState<FocusMode>('focus');
  const [modeStates, setModeStates] = useState<Record<FocusMode, ModeState>>(DEFAULT_MODE_STATE);
  const [tick, setTick] = useState(0); // force re-render every second while running
  const [timerPickerVisible, setTimerPickerVisible] = useState(false);
  const [sessionLabel, setSessionLabel] = useState('');
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // one scheduled notification id per mode (focus + timer; stopwatch has no fixed end)
  const notifIds = useRef<Partial<Record<FocusMode, string | null>>>({});

  const viewer = state.viewer;
  const partners = USER_LIST.filter(u => u !== viewer && state.profiles[u]);
  const myName = state.profiles[viewer]?.displayName ?? viewer;

  const ms = modeStates[mode];
  const isRunning = ms.startedAt !== null;
  const focusGoal = 50 * 60;
  const timerGoal = ms.timerMinutes * 60;

  // Load persisted state on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { modeStates: Record<FocusMode, ModeState>; mode: FocusMode };
          setModeStates(parsed.modeStates);
          setMode(parsed.mode);
        } catch {}
      }
      setHydrated(true);
    });
  }, []);

  // Persist whenever modeStates or mode changes (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ modeStates, mode }));
  }, [modeStates, mode, hydrated]);

  // When app comes back to foreground, force a re-render so displayed time is fresh
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', s => {
      if (s === 'active') setTick(t => t + 1);
    });
    return () => sub.remove();
  }, []);

  // Tick interval — only runs while something is active
  useEffect(() => {
    const anyRunning = Object.values(modeStates).some(m => m.startedAt !== null);
    if (!anyRunning) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    if (intervalRef.current) return; // already ticking
    intervalRef.current = setInterval(() => {
      setTick(t => t + 1);

      setModeStates(prev => {
        const next = { ...prev };
        let changed = false;

        // Check focus auto-stop
        const fms = prev.focus;
        if (fms.startedAt !== null) {
          const fe = fms.elapsed + Math.floor((Date.now() - fms.startedAt) / 1000);
          if (fe >= focusGoal) {
            next.focus = { ...fms, elapsed: focusGoal, startedAt: null };
            Vibration.vibrate(VIBRATE_PATTERN);
            changed = true;
          }
        }

        // Check timer auto-stop
        const tms = prev.timer;
        if (tms.startedAt !== null) {
          const te = tms.elapsed + Math.floor((Date.now() - tms.startedAt) / 1000);
          if (te >= tms.timerMinutes * 60) {
            next.timer = { ...tms, elapsed: tms.timerMinutes * 60, startedAt: null };
            Vibration.vibrate(VIBRATE_PATTERN);
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [modeStates, focusGoal]);

  const updateMode = (updater: (prev: ModeState) => ModeState) => {
    setModeStates(prev => ({ ...prev, [mode]: updater(prev[mode]) }));
  };

  const toggleRunning = () => {
    updateMode(prev => {
      if (prev.startedAt !== null) {
        // pausing — cancel the scheduled notification
        cancelNotif(notifIds.current[mode] ?? null);
        notifIds.current[mode] = null;
        return { ...prev, elapsed: prev.elapsed + Math.floor((Date.now() - prev.startedAt) / 1000), startedAt: null };
      } else {
        // starting — schedule a notification at the exact expiry time (focus + timer only)
        const alreadyElapsed = prev.elapsed;
        if (mode === 'focus') {
          const secsLeft = Math.max(1, focusGoal - alreadyElapsed);
          scheduleNotif(secsLeft, '🎯 Focus session complete', '50 minutes done — great work.').then(id => {
            notifIds.current.focus = id;
          });
        } else if (mode === 'timer') {
          const secsLeft = Math.max(1, prev.timerMinutes * 60 - alreadyElapsed);
          scheduleNotif(secsLeft, '⏱ Timer finished', `${prev.timerMinutes} minute timer is up.`).then(id => {
            notifIds.current.timer = id;
          });
        }
        return { ...prev, startedAt: Date.now() };
      }
    });
  };

  const resetCurrent = () => {
    cancelNotif(notifIds.current[mode] ?? null);
    notifIds.current[mode] = null;
    updateMode(() => ({ ...DEFAULT_MODE_STATE[mode], timerMinutes: ms.timerMinutes }));
    setTimerPickerVisible(false);
  };

  const elapsed = liveElapsed(ms);

  const fmtTime = (s: number) => {
    let display: number;
    if (mode === 'focus')      display = Math.max(0, focusGoal - s);
    else if (mode === 'timer') display = Math.max(0, timerGoal - s);
    else                       display = s;
    const m = Math.floor(display / 60);
    const sec = display % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const activeGoal = mode === 'focus' ? focusGoal : mode === 'timer' ? timerGoal : 0;
  const pct = activeGoal > 0 ? Math.min(1, elapsed / activeGoal) : 0;
  const R = 96;
  const C = 2 * Math.PI * R;
  const size = 240;

  const weekStats = useMemo(() => {
    const now = new Date();
    const dow = now.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const weekSessions = state.focusSessions.filter(s => {
      const d = new Date(s.startedAt);
      return d >= monday && d <= sunday;
    });

    const byUser: Record<string, number> = {};
    weekSessions.forEach(s => {
      byUser[s.ownerSlot] = (byUser[s.ownerSlot] ?? 0) + s.durationMin;
    });

    const total = weekSessions.reduce((a, s) => a + s.durationMin, 0);

    const dayMap = new Set(weekSessions.map(s => s.startedAt.slice(0, 10)));
    let streak = 0;
    const check = new Date(now);
    while (true) {
      const localDay = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(check.getDate()).padStart(2, '0')}`;
      if (dayMap.has(localDay)) { streak++; check.setDate(check.getDate() - 1); }
      else break;
    }

    return { total, byUser, streak };
  }, [state.focusSessions]);

  const partnerSessions = partners.map(p => ({
    slot: p,
    name: state.profiles[p]?.displayName ?? p,
    session: state.focusSessions.find(s => s.ownerSlot === p && !s.endedAt) ?? null,
  }));

  const weekNum = getISOWeek(state.clock);
  const goalMinutes = 20 * 60;

  // Running indicator for non-active modes (dot in mode selector)
  const modeRunning: Record<FocusMode, boolean> = {
    focus:     modeStates.focus.startedAt !== null || modeStates.focus.elapsed > 0,
    stopwatch: modeStates.stopwatch.startedAt !== null || modeStates.stopwatch.elapsed > 0,
    timer:     modeStates.timer.startedAt !== null || modeStates.timer.elapsed > 0,
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18, paddingBottom: 130 }}>
      <ScreenHeader
        eyebrow={`FOCUS · WEEK ${weekNum}`}
        title="Quiet"
        ghost="hours, together."
        sub="Pick a mode. Press start. Your partner sees a 'heads-down' status."
      />

      {/* Mode selector */}
      <Card style={{ padding: 4, marginBottom: 22 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {([
            { id: 'focus',     label: 'Focus',     icon: 'bolt'  },
            { id: 'stopwatch', label: 'Stopwatch', icon: 'timer' },
            { id: 'timer',     label: 'Timer',     icon: 'flag'  },
          ] as const).map(m => (
            <TouchableOpacity key={m.id}
              onPress={() => { setMode(m.id); setTimerPickerVisible(false); }}
              style={{ flex: 1, height: 38, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                backgroundColor: mode === m.id ? colors.foreground : 'transparent' }}>
              <Icon name={m.icon} size={13} color={mode === m.id ? '#fff' : colors.fg3} />
              <Text style={{ fontFamily: 'Courier', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.8, color: mode === m.id ? '#fff' : colors.fg3 }}>{m.label}</Text>
              {/* Dot indicator: this mode has an active/paused session */}
              {mode !== m.id && modeRunning[m.id] && (
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: modeStates[m.id].startedAt !== null ? '#22c55e' : colors.fg5, position: 'absolute', top: 6, right: 8 }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Ring */}
      <CardAlt style={{ padding: 24, marginBottom: 22, alignItems: 'center' }}>
        <View style={[styles.between, { width: '100%', marginBottom: 14 }]}>
          {mode === 'timer' ? (
            <TouchableOpacity onPress={() => { if (!isRunning) setTimerPickerVisible(v => !v); }}
              style={[styles.row, { gap: 6 }]}>
              <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fg5 }}>
                {ms.timerMinutes} MIN COUNTDOWN
              </Text>
              {!isRunning && <Icon name="chev" size={10} color={colors.fg5} />}
            </TouchableOpacity>
          ) : (
            <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fg5 }}>
              {mode === 'focus' ? '50 MIN POMODORO' : 'STOPWATCH'}
            </Text>
          )}
          <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>
            {isRunning ? '· LIVE' : elapsed > 0 ? '· PAUSED' : '· READY'}
          </Text>
        </View>

        {/* Timer duration picker */}
        {mode === 'timer' && timerPickerVisible && !isRunning && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, width: '100%' }}>
            {TIMER_PRESETS.map(min => (
              <TouchableOpacity key={min}
                onPress={() => {
                  cancelNotif(notifIds.current.timer ?? null);
                  notifIds.current.timer = null;
                  setModeStates(prev => ({ ...prev, timer: { elapsed: 0, startedAt: null, timerMinutes: min } }));
                  setTimerPickerVisible(false);
                }}
                style={{ height: 34, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: ms.timerMinutes === min ? colors.foreground : colors.bgTint04,
                  borderWidth: 1, borderColor: ms.timerMinutes === min ? colors.foreground : colors.border08 }}>
                <Text style={{ fontFamily: 'Courier', fontSize: 11, letterSpacing: 1, color: ms.timerMinutes === min ? '#fff' : colors.fg3 }}>{min}m</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={2} />
            <Circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={colors.foreground} strokeWidth={3}
              strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
              strokeLinecap="round" />
            {Array.from({ length: 60 }, (_, i) => {
              const a = (i / 60) * 2 * Math.PI;
              const r1 = R - 8, r2 = R - (i % 5 === 0 ? 14 : 11);
              const x1 = size / 2 + Math.cos(a) * r1, y1 = size / 2 + Math.sin(a) * r1;
              const x2 = size / 2 + Math.cos(a) * r2, y2 = size / 2 + Math.sin(a) * r2;
              return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={colors.fg8} strokeWidth={i % 5 === 0 ? 1.5 : 0.8} />;
            })}
          </Svg>
          <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5, marginBottom: 6 }}>
              {mode === 'focus' ? 'REMAINING' : mode === 'timer' ? 'COUNTDOWN' : 'ELAPSED'}
            </Text>
            <Text style={{ fontWeight: '900', fontSize: 56, lineHeight: 50, letterSpacing: -2.5, color: colors.fg1 }}>{fmtTime(elapsed)}</Text>
            <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: colors.fg5, marginTop: 8 }}>
              {myName.toUpperCase()} · {sessionLabel ? sessionLabel.toUpperCase() : 'DEEP WORK'}
            </Text>
          </View>
        </View>

        <View style={[styles.row, { gap: 10, marginTop: 22 }]}>
          <TouchableOpacity onPress={resetCurrent}
            style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border08, backgroundColor: colors.bgTint04 }}>
            <Icon name="reset" size={18} />
          </TouchableOpacity>
          <TouchableOpacity onPress={toggleRunning}
            style={{ minWidth: 150, height: 48, borderRadius: 16, backgroundColor: colors.foreground, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Icon name={isRunning ? 'pause' : 'play'} size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{isRunning ? 'Pause' : 'Start session'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setLabelDraft(sessionLabel); setLabelModalVisible(true); }}
            style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
              borderColor: sessionLabel ? colors.foreground : colors.border08,
              backgroundColor: sessionLabel ? colors.foreground : colors.bgTint04 }}>
            <Icon name="note" size={18} color={sessionLabel ? '#fff' : colors.fg2} />
          </TouchableOpacity>
        </View>
      </CardAlt>

      {/* Partner statuses */}
      {partnerSessions.map(({ slot, name, session }) => {
        const secsLeft = session
          ? Math.max(0, session.durationMin * 60 - Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000))
          : null;
        return (
          <React.Fragment key={slot}>
            <SecLabel>Partner · {name}</SecLabel>
            <Card style={{ padding: 14, marginBottom: 22 }}>
              <View style={[styles.row, { gap: 12, alignItems: 'center' }]}>
                <UserChip id={slot} size="lg" />
                <View style={{ flex: 1 }}>
                  {session ? (
                    <>
                      <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.2 }}>{name} · Heads-down</Text>
                      <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 3 }}>
                        FOCUS · {session.durationMin} MIN{session.label ? ` · ${session.label.toUpperCase()}` : ''}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: -0.2 }}>{name} · Free</Text>
                      <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 3 }}>NO ACTIVE SESSION</Text>
                    </>
                  )}
                </View>
                {secsLeft !== null && (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: 'Courier', fontSize: 14, fontWeight: '700', color: colors.fg1 }}>
                      {String(Math.floor(secsLeft / 60)).padStart(2, '0')}:{String(secsLeft % 60).padStart(2, '0')}
                    </Text>
                    <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 2 }}>LEFT</Text>
                  </View>
                )}
              </View>
              <View style={{ height: 1, backgroundColor: colors.border06, marginVertical: 14 }} />
              <View style={styles.between}>
                <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5 }}>
                  {session ? 'DO-NOT-DISTURB · ACTIVE' : 'AVAILABLE'}
                </Text>
                {!session && (
                  <TouchableOpacity onPress={toggleRunning}
                    style={{ height: 24, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: colors.bgTint04, borderWidth: 1, borderColor: colors.border08, justifyContent: 'center' }}>
                    <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: colors.fg2 }}>Start together</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          </React.Fragment>
        );
      })}

      {/* Week stats */}
      <SecLabel>This week</SecLabel>
      <Card style={{ padding: 18, marginBottom: 22 }}>
        <View style={[styles.between, { alignItems: 'flex-end', marginBottom: 16 }]}>
          <View>
            <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fg5 }}>FOCUSED · WK {weekNum}</Text>
            <Text style={{ fontWeight: '900', fontSize: 52, lineHeight: 47, letterSpacing: -2, marginTop: 4, color: colors.fg1 }}>
              {Math.floor(weekStats.total / 60)}<Text style={{ color: colors.fg9 }}>h</Text>
              {' '}{weekStats.total % 60}<Text style={{ color: colors.fg9 }}>m</Text>
            </Text>
            <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 6 }}>
              GOAL · {fmtHM(goalMinutes).toUpperCase()} · {goalMinutes > 0 ? Math.round((weekStats.total / goalMinutes) * 100) : 0}%
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontWeight: '900', fontSize: 36, lineHeight: 32, letterSpacing: -1.5, color: colors.fg1 }}>{weekStats.streak}</Text>
            <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 4 }}>DAY STREAK</Text>
          </View>
        </View>
        {USER_LIST.filter(u => state.profiles[u]).map(u => {
          const m = weekStats.byUser[u] ?? 0;
          const mx = Math.max(1, ...Object.values(weekStats.byUser));
          return (
            <View key={u} style={[styles.row, { gap: 10, marginBottom: 12 }]}>
              <UserChip id={u} />
              <View style={{ flex: 1, height: 6, backgroundColor: colors.bgTint06, borderRadius: 3 }}>
                <View style={{ width: `${(m / mx) * 100}%`, height: '100%', backgroundColor: colors.foreground, borderRadius: 3 }} />
              </View>
              <Text style={{ fontFamily: 'Courier', fontSize: 12, color: colors.fg2, minWidth: 56, textAlign: 'right' }}>{fmtHM(m)}</Text>
            </View>
          );
        })}
      </Card>

      {/* World clocks */}
      <SecLabel count={WORLD_CLOCKS.length}>World · clocks</SecLabel>
      <Card style={{ padding: 0 }}>
        {WORLD_CLOCKS.map((w, i) => (
          <View key={w.city} style={[styles.row, { padding: 14, gap: 12, borderBottomWidth: i < WORLD_CLOCKS.length - 1 ? 1 : 0, borderBottomColor: colors.border06 }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', letterSpacing: -0.1 }}>{w.city}</Text>
              <Text style={{ fontFamily: 'Courier', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.6, color: colors.fg5, marginTop: 3 }}>{w.tz.split('/')[1]?.replace('_', ' ') ?? w.tz} · {w.note.toUpperCase()}</Text>
            </View>
            <Text style={{ fontWeight: '800', fontSize: 24, letterSpacing: -1, color: colors.fg1 }}>{fmtLocalTime(w.tz, state.clock)}</Text>
          </View>
        ))}
      </Card>

      {/* Session label modal */}
      <Modal visible={labelModalVisible} transparent animationType="fade" onRequestClose={() => setLabelModalVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 28 }} activeOpacity={1} onPress={() => setLabelModalVisible(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24 }}>
              <Text style={{ fontFamily: 'Courier', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.fg5, marginBottom: 6 }}>SESSION LABEL</Text>
              <Text style={{ fontSize: 13, color: colors.fg5, marginBottom: 14 }}>What are you working on? Shown in the ring and to your partner.</Text>
              <TextInput
                value={labelDraft}
                onChangeText={setLabelDraft}
                autoFocus
                placeholder="e.g. Roadmap doc, Deep review…"
                placeholderTextColor={colors.fg7}
                style={{ height: 48, borderWidth: 1, borderColor: colors.border12, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, color: colors.fg1 }}
              />
              <View style={[styles.row, { gap: 10, marginTop: 18 }]}>
                <TouchableOpacity onPress={() => setLabelModalVisible(false)}
                  style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1, borderColor: colors.border12, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: colors.fg3 }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setSessionLabel(labelDraft.trim()); setLabelModalVisible(false); }}
                  style={{ flex: 1, height: 44, borderRadius: 12, backgroundColor: colors.foreground, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Set label</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

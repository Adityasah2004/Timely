export function toMins(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function mins(start: string, end: string): number {
  return toMins(end) - toMins(start);
}

export function fmtHM(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function fmtClock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtTopDate(d: Date): string {
  return d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function padNum(n: number): string {
  return String(n).padStart(2, '0');
}

// Returns 'AM' or 'PM' from a 'HH:MM' string
export function amPm(time: string): string {
  return Number(time.split(':')[0]) < 12 ? 'AM' : 'PM';
}

import { WEEKDAYS, type Hours, type Weekday } from './fields';

export interface OpenState {
  open: boolean;
  /** Next change (HH:MM, hotel local time) when known. */
  until?: string;
  opensAt?: string;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Current weekday + minutes-since-midnight in the hotel's timezone. */
export function localClock(timezone: string, at: Date = new Date()): { day: Weekday; minutes: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  } catch {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  }
  const wd = (parts.find((p) => p.type === 'weekday')?.value ?? 'Mon').slice(0, 3).toLowerCase() as Weekday;
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return { day: wd, minutes: h * 60 + m };
}

/**
 * Evaluates a weekly schedule. Ranges whose close is earlier than open span
 * midnight (e.g. 18:00–02:00) and are honoured on the following day.
 */
export function evaluateHours(hours: Hours | undefined | null, timezone: string, at: Date = new Date()): OpenState {
  if (!hours || hours.mode === 'always') return { open: true };
  const { day, minutes } = localClock(timezone, at);
  const idx = WEEKDAYS.indexOf(day);
  const prev = WEEKDAYS[(idx + 6) % 7];
  const today = hours.days?.[day] ?? [];
  const yesterday = hours.days?.[prev] ?? [];

  for (const r of yesterday) {
    const o = toMin(r.open);
    const c = toMin(r.close);
    if (c < o && minutes < c) return { open: true, until: r.close };
  }
  for (const r of today) {
    const o = toMin(r.open);
    const c = toMin(r.close);
    if (c === o) return { open: true };
    if (c > o ? minutes >= o && minutes < c : minutes >= o) return { open: true, until: r.close };
  }
  const next = today.map((r) => r.open).filter((t) => toMin(t) > minutes).sort()[0];
  return { open: false, opensAt: next };
}

export function isAvailableNow(
  statusOverride: string | undefined,
  hours: Hours | undefined | null,
  timezone: string,
  at?: Date
): OpenState {
  if (statusOverride === 'open') return { open: true };
  if (statusOverride === 'closed') return { open: false };
  return evaluateHours(hours, timezone, at);
}

export function summarizeHours(hours: Hours | undefined | null, lang: 'en' | 'ar'): string {
  if (!hours || hours.mode === 'always') return lang === 'ar' ? 'على مدار الساعة' : 'Open 24 hours';
  const note = lang === 'ar' ? hours.note_ar : hours.note_en;
  if (note) return note;
  const ranges = WEEKDAYS.map((d) => (hours.days?.[d] ?? []).map((r) => `${r.open}–${r.close}`).join(', '));
  const uniform = ranges.every((r) => r === ranges[0]);
  if (uniform && ranges[0]) return (lang === 'ar' ? 'يومياً ' : 'Daily ') + ranges[0];
  const firstOpen = ranges.find(Boolean);
  return firstOpen ? (lang === 'ar' ? 'حسب الجدول' : 'See schedule') : lang === 'ar' ? 'مغلق' : 'Closed';
}

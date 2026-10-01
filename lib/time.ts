// All demo time math is done in IST (+05:30) regardless of the machine's timezone.
export const IST_OFFSET_MIN = 330;
const DAY = 1440;

export const DEMO_DEFAULT_NOW = "2026-10-01T08:30:00+05:30";

export function ms(iso: string): number {
  return new Date(iso).getTime();
}

/** Minutes since local (IST) midnight. */
export function minutesOfDay(t: number): number {
  return ((Math.floor(t / 60000) + IST_OFFSET_MIN) % DAY + DAY) % DAY;
}

export function parseHM(hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Epoch ms of IST midnight for the day containing t. */
export function dayStart(t: number): number {
  return Math.floor(t / 60000) * 60000 - minutesOfDay(t) * 60000;
}

export function toISO(t: number): string {
  const local = new Date(t + IST_OFFSET_MIN * 60000);
  return local.toISOString().replace(/\.\d{3}Z$/, "+05:30");
}

export function fmtHM(iso: string): string {
  const m = minutesOfDay(ms(iso));
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function inWindow(minute: number, start: string, end: string): boolean {
  const s = parseHM(start);
  const e = parseHM(end);
  return s <= e ? minute >= s && minute < e : minute >= s || minute < e;
}

export function ago(fromMs: number, nowMs: number): string {
  const m = Math.max(0, Math.round((nowMs - fromMs) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

/** Human label for an upcoming time relative to now: "today 17:00", "tomorrow 10:00", "Fri 15:00". */
export function relDay(iso: string, nowMs: number): string {
  const t = ms(iso);
  const diffDays = Math.round((dayStart(t) - dayStart(nowMs)) / 86400000);
  const hm = fmtHM(iso);
  if (diffDays === 0) return `today ${hm}`;
  if (diffDays === 1) return `tomorrow ${hm}`;
  if (diffDays === -1) return `yesterday ${hm}`;
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(t + IST_OFFSET_MIN * 60000).getUTCDay()];
  return `${wd} ${hm}`;
}

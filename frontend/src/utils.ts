import type { Granularity } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Date -> "YYYY-MM-DD" using local time. */
export function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseIso(iso: string): Date {
  return new Date(`${iso}T00:00:00`);
}

export function todayLocal(): string {
  return toIso(new Date());
}

/** True only for real dates written exactly as YYYY-MM-DD (the database format). */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = parseIso(value);
  return !Number.isNaN(d.getTime()) && toIso(d) === value;
}

export function addDays(iso: string, days: number): string {
  const d = parseIso(iso);
  d.setDate(d.getDate() + days);
  return toIso(d);
}

/** Monday = 0 ... Sunday = 6 */
export function weekdayIndex(iso: string): number {
  return (parseIso(iso).getDay() + 6) % 7;
}

/** "2026-10-12" -> "12 Oct 2026" */
export function formatDate(iso: string): string {
  return parseIso(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** "2026-10-12" -> "Monday, 12 October 2026" */
export function formatDateLong(iso: string): string {
  return parseIso(iso).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

/** The server sends UTC times; some arrive without a "Z", so add it before converting to local time. */
export function formatDateTime(iso: string): string {
  const hasZone = /([zZ]|[+-]\d{2}:\d{2})$/.test(iso);
  return new Date(hasZone ? iso : `${iso}Z`).toLocaleString("en-GB");
}

/** "Mozilla/5.0 (Windows NT 10.0; ...) Chrome/120 ..." -> "Chrome on Windows" */
export function describeUserAgent(ua: string): string {
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatCompact(n: number): string {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** 12.34 -> "+12.3%"   null -> "–" */
export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "–";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

/** Short axis label for a chart point. */
export function periodLabel(iso: string, g: Granularity): string {
  if (g === "year") return iso.slice(0, 4);
  if (g === "month") return parseIso(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  return parseIso(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** Long label for tooltips. */
export function periodFull(iso: string, g: Granularity): string {
  if (g === "year") return iso.slice(0, 4);
  if (g === "month") return parseIso(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  if (g === "week") return `Week of ${formatDate(iso)}`;
  return parseIso(iso).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}

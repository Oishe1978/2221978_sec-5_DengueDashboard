import type { Division } from "./constants";

export type Source = "dghs" | "synthetic" | "manual";

export interface DailyReport {
  id: string;
  division: Division;
  report_date: string; // YYYY-MM-DD
  admitted: number;
  deaths: number;
  source: Source;
  created_at: string;
  updated_at: string;
}

export type ReportInput = Pick<DailyReport, "division" | "report_date" | "admitted" | "deaths">;

export interface ReportFilters {
  division?: Division | "";
  date_from?: string;
  date_to?: string;
  source?: Source | "";
}

export interface ReportPage {
  items: DailyReport[];
  total: number;
  offset: number;
  limit: number;
}

/* ---------- analytics (/api/v1/stats) ---------- */

export type Granularity = "day" | "week" | "month" | "year";

export interface DateRange {
  min_date: string | null;
  max_date: string | null;
}

export interface Summary {
  date_from: string;
  date_to: string;
  days: number;
  admitted: number;
  deaths: number;
  fatality_rate: number;
  avg_daily: number;
  peak_date: string | null;
  peak_admitted: number;
  previous_admitted: number;
  previous_deaths: number;
  admitted_change_pct: number | null;
  deaths_change_pct: number | null;
}

export interface TimePoint {
  period_start: string;
  admitted: number;
  deaths: number;
  days: number;
  admitted_avg7: number | null;
}

export interface DivisionStat {
  division: string;
  admitted: number;
  deaths: number;
  fatality_rate: number;
  share_pct: number;
}

export interface MonthsByYear {
  year: number;
  months: (number | null)[];
  total: number;
}

export interface WeekdayStat {
  weekday: string;
  admitted_avg: number;
  deaths_avg: number;
  days: number;
}

export interface DayDivision {
  division: string;
  admitted: number;
  deaths: number;
}

export interface DayReport {
  report_date: string;
  division: string | null;
  admitted: number;
  deaths: number;
  fatality_rate: number;
  avg_prev_7_days: number | null;
  change_vs_avg_pct: number | null;
  prev_day_admitted: number | null;
  change_vs_prev_day_pct: number | null;
  divisions: DayDivision[];
}

/* ---------- authentication (/api/v1/auth) ---------- */

export type Role = "user" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  admin_code?: string;
}

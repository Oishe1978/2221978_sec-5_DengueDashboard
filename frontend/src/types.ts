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

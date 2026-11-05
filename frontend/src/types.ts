export type Severity = "low" | "medium" | "high";

export interface DengueCase {
  id: string;
  district: string;
  report_date: string;
  cases: number;
  deaths: number;
  recovered: number;
  severity: Severity;
  created_at: string;
}

export type CaseInput = Omit<DengueCase, "id" | "created_at">;

export interface CaseFilters {
  district?: string;
  severity?: Severity | "";
  date_from?: string;
  date_to?: string;
}

export interface DengueStats {
  total_cases: number;
  active_cases: number;
  recovered: number;
  deaths: number;
}

export type Severity = "Low" | "Medium" | "High";

export interface DengueCase {
  id: number;
  patient_name: string;
  age: number;
  district: string;
  hospital_name: string;
  severity: Severity;
  status: string;
  date?: number | null;
  month?: string | null;
  year?: number | null;
}

export type CaseInput = Omit<DengueCase, "id">;

export interface CaseFilters {
  district?: string;
}

export interface DengueStats {
  total_cases: number;
  active_cases: number;
  recovered: number;
  deaths: number;
}

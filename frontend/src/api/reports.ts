import type { Division } from "../constants";
import type { DailyReport, ReportFilters, ReportInput, ReportPage } from "../types";

const BASE = "/api/v1/reports";

/** FastAPI sends either a string or a list of validation problems. */
function formatDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = Array.isArray(item?.loc) ? item.loc.slice(1).join(".") : "";
        const message = typeof item?.msg === "string" ? item.msg : "Invalid value";
        return field ? `${field}: ${message}` : message;
      })
      .join("; ");
  }
  return "";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = "";
    try {
      const body = await res.json();
      message = formatDetail(body.detail);
    } catch {
      /* the response had no JSON body */
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function listReports(filters: ReportFilters, offset: number, limit: number): Promise<ReportPage> {
  const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return request<ReportPage>(`?${params.toString()}`);
}

/** Exact-date search: every division reported on that day. */
export function listReportsByDate(date: string, division?: Division): Promise<DailyReport[]> {
  const query = division ? `?division=${encodeURIComponent(division)}` : "";
  return request<DailyReport[]>(`/by-date/${date}${query}`);
}

export const getReport = (id: string) => request<DailyReport>(`/${id}`);

export const createReport = (data: ReportInput) =>
  request<DailyReport>("", { method: "POST", body: JSON.stringify(data) });

export const updateReport = (id: string, data: Partial<ReportInput>) =>
  request<DailyReport>(`/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteReport = (id: string) => request<void>(`/${id}`, { method: "DELETE" });

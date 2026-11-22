import type { Division } from "../constants";
import type { DailyReport, ReportFilters, ReportInput, ReportPage } from "../types";
import { query, request } from "./http";

// READ LIST   GET /api/v1/reports
export function listReports(filters: ReportFilters, offset: number, limit: number): Promise<ReportPage> {
  return request<ReportPage>(`/api/v1/reports${query({ ...filters, offset, limit })}`);
}

// SEARCH BY DATE   GET /api/v1/reports/by-date/{date}
export function listReportsByDate(date: string, division?: Division): Promise<DailyReport[]> {
  return request<DailyReport[]>(`/api/v1/reports/by-date/${date}${query({ division })}`);
}

// READ SINGLE   GET /api/v1/reports/{id}
export function getReport(id: string): Promise<DailyReport> {
  return request<DailyReport>(`/api/v1/reports/${id}`);
}

// CREATE   POST /api/v1/reports   (admin only)
export function createReport(data: ReportInput): Promise<DailyReport> {
  return request<DailyReport>("/api/v1/reports", { method: "POST", body: JSON.stringify(data) });
}

// UPDATE   PATCH /api/v1/reports/{id}   (admin only)
export function updateReport(id: string, data: Partial<ReportInput>): Promise<DailyReport> {
  return request<DailyReport>(`/api/v1/reports/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

// DELETE   DELETE /api/v1/reports/{id}   (admin only)
export function deleteReport(id: string): Promise<void> {
  return request<void>(`/api/v1/reports/${id}`, { method: "DELETE" });
}

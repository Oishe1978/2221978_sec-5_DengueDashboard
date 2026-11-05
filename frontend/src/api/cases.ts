import type { CaseFilters, CaseInput, DengueCase, DengueStats } from "../types";

const BASE = "/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* response had no JSON body */
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function listCases(filters: CaseFilters = {}): Promise<DengueCase[]> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = params.toString();
  return request<DengueCase[]>(`/cases${query ? `?${query}` : ""}`);
}

export const getCase = (id: string) => request<DengueCase>(`/cases/${id}`);

export const createCase = (data: CaseInput) =>
  request<DengueCase>("/cases", { method: "POST", body: JSON.stringify(data) });

export const updateCase = (id: string, data: Partial<CaseInput>) =>
  request<DengueCase>(`/cases/${id}`, { method: "PATCH", body: JSON.stringify(data) });

export const deleteCase = (id: string) => request<void>(`/cases/${id}`, { method: "DELETE" });

export const getStats = () => request<DengueStats>("/dengue-stats");

import type {
  CaseFilters,
  CaseInput,
  DengueCase,
} from "../types";

const BASE = "/api";

// Common function for sending API requests
async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;

    try {
      const body = await res.json();
      detail =
        typeof body.detail === "string"
          ? body.detail
          : JSON.stringify(body.detail);
    } catch {
      // Response does not contain JSON
    }

    throw new Error(detail || `Request failed (${res.status})`);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

// READ: Get all patient reports
export function listCases(
  filters: CaseFilters = {}
): Promise<DengueCase[]> {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  const query = params.toString();

  return request<DengueCase[]>(
    `/cases${query ? `?${query}` : ""}`
  );
}

// READ: Get one patient report by ID
export function getCase(id: string): Promise<DengueCase> {
  return request<DengueCase>(`/cases/${id}`);
}

// CREATE: Add a new patient report
export function createCase(
  data: CaseInput
): Promise<DengueCase> {
  return request<DengueCase>("/cases", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// UPDATE: Update an existing patient report
export function updateCase(
  id: string,
  data: Partial<CaseInput>
): Promise<DengueCase> {
  return request<DengueCase>(`/cases/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// DELETE: Remove a patient report
export function deleteCase(
  id: string
): Promise<{ message: string }> {
  return request<{ message: string }>(`/cases/${id}`, {
    method: "DELETE",
  });
}


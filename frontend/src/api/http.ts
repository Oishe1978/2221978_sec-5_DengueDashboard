import { clearToken, getToken } from "../auth/tokenStore";

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

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    if (res.status === 401 && token) {
      // The saved login is no longer valid (expired or removed).
      clearToken();
      window.dispatchEvent(new Event("auth-expired"));
    }
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

/** Builds "?a=1&b=2" from the values that are set. */
export function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

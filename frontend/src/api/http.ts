import { clearToken, getToken, setToken } from "../auth/tokenStore";

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

let refreshing: Promise<string | null> | null = null;

/**
 * Ask the server for a new access token. The browser sends the httpOnly refresh cookie by itself.
 * Calls made at the same moment share one request, because every refresh replaces the cookie.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch("/api/v1/auth/refresh", { method: "POST" });
        if (!res.ok) {
          clearToken();
          return null;
        }
        const data = (await res.json()) as { access_token: string };
        setToken(data.access_token);
        return data.access_token;
      } catch {
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

// These calls handle their own 401 (wrong password, no session) and must not trigger a refresh.
const NO_REFRESH = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
];

export async function request<T>(url: string, init?: RequestInit, retry = true): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers });

  if (res.status === 401 && retry && !NO_REFRESH.includes(url)) {
    // The access token probably expired (15 minutes): get a new one and repeat the call once.
    const fresh = await refreshAccessToken();
    if (fresh) return request<T>(url, init, false);
    window.dispatchEvent(new Event("auth-expired")); // the session is really over
  }

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

/** Builds "?a=1&b=2" from the values that are set. */
export function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const text = search.toString();
  return text ? `?${text}` : "";
}

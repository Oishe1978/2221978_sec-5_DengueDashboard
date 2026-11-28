import { getToken } from "../auth/tokenStore";
import { query, refreshAccessToken, request } from "./http";

export interface Paged<T> { items: T[]; total: number; page: number; size: number }

export interface AdminUser {
  id: string; name: string; email: string; role: "user" | "admin"; is_active: boolean;
  banned_at: string | null; ban_reason: string | null; last_login_at: string | null; created_at: string;
}
export interface Overview {
  users: number; admins: number; banned_users: number; reports: number; watch_items: number; teams: number;
  new_users_7d: number; new_watch_items_7d: number; new_teams_7d: number; failed_logins_24h: number; active_sessions: number;
}
export interface AuditRow {
  id: string; created_at: string; event: string; email: string | null; user_id: string | null;
  ip_address: string; user_agent: string; details: string | null; success: boolean;
}
export interface UserDetail {
  user: AdminUser;
  watch_items: { id: string; division: string; threshold: number; note: string | null; created_at: string }[];
  teams: { id: string; name: string; is_owner: boolean; can_create: boolean; can_update: boolean; can_assign: boolean }[];
  sessions: { id: string; user_agent: string; ip_address: string; created_at: string; last_used_at: string }[];
  activity: AuditRow[];
}
export interface ReportRow { id: string; division: string; report_date: string; admitted: number; deaths: number; source: string }
export interface WatchRow { id: string; owner_email: string; division: string; threshold: number; note: string | null; created_at: string }
export interface TeamRow { id: string; name: string; owner_email: string; members: number; items: number; created_at: string }
export interface SecurityView {
  days: number; total_failed: number;
  by_ip: { ip_address: string; failures: number; accounts: number }[];
  by_account: { email: string; failures: number; ips: number }[];
  locked_accounts: { id: string; email: string; locked_until: string }[];
}
export interface BulkResult { done: string[]; failed: { id: string; reason: string }[] }
export type Params = Record<string, string | number | undefined | null>;

const A = "/api/v1/admin";
const post = <T>(url: string, body?: unknown) => request<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

export const getOverview = () => request<Overview>(`${A}/overview`);
export const listUsers = (p: Params) => request<Paged<AdminUser>>(`${A}/users${query(p)}`);
export const getUserDetail = (id: string) => request<UserDetail>(`${A}/users/${id}`);
export const banUser = (id: string, reason: string) => post<AdminUser>(`${A}/users/${id}/ban`, { reason });
export const unbanUser = (id: string) => post<AdminUser>(`${A}/users/${id}/unban`);
export const changeRole = (id: string, role: "user" | "admin") =>
  request<AdminUser>(`${A}/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
export const revokeSessions = (id: string) => post<{ revoked: number }>(`${A}/users/${id}/revoke-sessions`);
export const bulkBan = (ids: string[], reason: string) => post<BulkResult>(`${A}/users/bulk-ban`, { user_ids: ids, reason });
export const bulkUnban = (ids: string[]) => post<BulkResult>(`${A}/users/bulk-unban`, { user_ids: ids });

export const listContent = <T>(kind: "reports" | "watch-items" | "teams", p: Params) =>
  request<Paged<T>>(`${A}/content/${kind}${query(p)}`);
export const deleteContent = (kind: string, ids: string[]) => post<{ deleted: number }>(`${A}/content/${kind}/delete`, { ids });

export const listAudit = (p: Params) => request<Paged<AuditRow>>(`${A}/audit${query(p)}`);
export const listAuditEvents = () => request<string[]>(`${A}/audit/events`);
export const getSecurity = () => request<SecurityView>(`${A}/security`);

/** Downloads a CSV from the API. The request needs the Authorization header, so a plain link would not work. */
export async function downloadCsv(path: string, params: Params): Promise<void> {
  const url = `${A}/export/${path}${query(params)}`;
  const send = (token: string | null) => fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  let res = await send(getToken());
  if (res.status === 401) {
    const fresh = await refreshAccessToken();
    if (fresh) res = await send(fresh);
  }
  if (!res.ok) {
    let message = `Export failed (${res.status})`;
    try { message = (await res.json()).detail ?? message; } catch { /* no JSON body */ }
    throw new Error(typeof message === "string" ? message : "Export failed");
  }
  const match = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(await res.blob());
  link.download = match?.[1] ?? "export.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

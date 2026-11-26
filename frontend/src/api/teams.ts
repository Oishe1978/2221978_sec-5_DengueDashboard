import type { Division } from "../constants";
import type { MemberFlags, TeamDetail, TeamItem, TeamMember, TeamSummary } from "../types";
import { request } from "./http";

// ---- teams
// READ LIST   GET /api/v1/teams   (teams you own or belong to)
export function listTeams(): Promise<TeamSummary[]> {
  return request<TeamSummary[]>("/api/v1/teams");
}

// READ SINGLE   GET /api/v1/teams/{id}   (members only)
export function getTeam(id: string): Promise<TeamDetail> {
  return request<TeamDetail>(`/api/v1/teams/${id}`);
}

// CREATE   POST /api/v1/teams
export function createTeam(name: string): Promise<TeamSummary> {
  return request<TeamSummary>("/api/v1/teams", { method: "POST", body: JSON.stringify({ name }) });
}

// RENAME   PATCH /api/v1/teams/{id}   (owner only)
export function renameTeam(id: string, name: string): Promise<TeamSummary> {
  return request<TeamSummary>(`/api/v1/teams/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
}

// DELETE   DELETE /api/v1/teams/{id}   (owner only)
export function deleteTeam(id: string): Promise<void> {
  return request<void>(`/api/v1/teams/${id}`, { method: "DELETE" });
}

// ---- members (owner only, except leaving)
// ADD MEMBER   POST /api/v1/teams/{id}/members
export function addMember(id: string, email: string, flags: MemberFlags): Promise<TeamMember[]> {
  return request<TeamMember[]>(`/api/v1/teams/${id}/members`, {
    method: "POST",
    body: JSON.stringify({ email, ...flags }),
  });
}

// CHANGE MEMBER PERMISSIONS   PATCH /api/v1/teams/{id}/members/{userId}
export function updateMember(id: string, userId: string, flags: Partial<MemberFlags>): Promise<TeamMember[]> {
  return request<TeamMember[]>(`/api/v1/teams/${id}/members/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(flags),
  });
}

// REMOVE MEMBER (or leave)   DELETE /api/v1/teams/{id}/members/{userId}
export function removeMember(id: string, userId: string): Promise<void> {
  return request<void>(`/api/v1/teams/${id}/members/${userId}`, { method: "DELETE" });
}

// ---- items
// CREATE ITEM   POST /api/v1/teams/{id}/items   (needs can_create)
export function createTeamItem(id: string, data: { division: Division; threshold: number; note?: string }): Promise<TeamItem[]> {
  return request<TeamItem[]>(`/api/v1/teams/${id}/items`, { method: "POST", body: JSON.stringify(data) });
}

// UPDATE ITEM   PATCH /api/v1/teams/{id}/items/{itemId}   (needs can_update)
export function updateTeamItem(id: string, itemId: string, data: { threshold?: number; note?: string }): Promise<TeamItem[]> {
  return request<TeamItem[]>(`/api/v1/teams/${id}/items/${itemId}`, { method: "PATCH", body: JSON.stringify(data) });
}

// ASSIGN ITEM   POST /api/v1/teams/{id}/items/{itemId}/assign   (needs can_assign)
export function assignTeamItem(id: string, itemId: string, userId: string | null): Promise<TeamItem[]> {
  return request<TeamItem[]>(`/api/v1/teams/${id}/items/${itemId}/assign`, {
    method: "POST",
    body: JSON.stringify({ user_id: userId }),
  });
}

// DELETE ITEM   DELETE /api/v1/teams/{id}/items/{itemId}   (owner only)
export function deleteTeamItem(id: string, itemId: string): Promise<void> {
  return request<void>(`/api/v1/teams/${id}/items/${itemId}`, { method: "DELETE" });
}

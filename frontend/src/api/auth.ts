import type {
  AuthUser,
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  SessionInfo,
  TokenResponse,
  UpdateProfileInput,
} from "../types";
import { request } from "./http";

// REGISTER   POST /api/v1/auth/register
export function register(data: RegisterInput): Promise<TokenResponse> {
  return request<TokenResponse>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(data) });
}

// LOG IN   POST /api/v1/auth/login
export function login(data: LoginInput): Promise<TokenResponse> {
  return request<TokenResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(data) });
}

// LOG OUT   POST /api/v1/auth/logout   (ends the session on the server and removes the cookie)
export function logout(): Promise<void> {
  return request<void>("/api/v1/auth/logout", { method: "POST" });
}

// CURRENT USER   GET /api/v1/auth/me
export function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/api/v1/auth/me");
}

// UPDATE PROFILE   PATCH /api/v1/auth/me
export function updateProfile(data: UpdateProfileInput): Promise<AuthUser> {
  return request<AuthUser>("/api/v1/auth/me", { method: "PATCH", body: JSON.stringify(data) });
}

// CHANGE PASSWORD   POST /api/v1/auth/change-password
export function changePassword(data: ChangePasswordInput): Promise<void> {
  return request<void>("/api/v1/auth/change-password", { method: "POST", body: JSON.stringify(data) });
}

// MY SESSIONS   GET /api/v1/auth/sessions
export function listSessions(): Promise<SessionInfo[]> {
  return request<SessionInfo[]>("/api/v1/auth/sessions");
}

// SIGN OUT A DEVICE   DELETE /api/v1/auth/sessions/{id}
export function revokeSession(id: string): Promise<void> {
  return request<void>(`/api/v1/auth/sessions/${id}`, { method: "DELETE" });
}

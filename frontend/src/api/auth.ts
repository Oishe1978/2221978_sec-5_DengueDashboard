import type { AuthUser, LoginInput, RegisterInput, TokenResponse } from "../types";
import { request } from "./http";

// REGISTER   POST /api/v1/auth/register
export function register(data: RegisterInput): Promise<TokenResponse> {
  return request<TokenResponse>("/api/v1/auth/register", { method: "POST", body: JSON.stringify(data) });
}

// LOG IN   POST /api/v1/auth/login
export function login(data: LoginInput): Promise<TokenResponse> {
  return request<TokenResponse>("/api/v1/auth/login", { method: "POST", body: JSON.stringify(data) });
}

// CURRENT USER   GET /api/v1/auth/me
export function getMe(): Promise<AuthUser> {
  return request<AuthUser>("/api/v1/auth/me");
}

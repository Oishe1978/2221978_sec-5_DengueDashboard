/**
 * The short-lived access token is kept in memory only (not in localStorage or sessionStorage),
 * so a script injected into the page cannot read it from storage. A page reload starts without a token
 * and the app asks the server for a new one using the httpOnly refresh cookie.
 */
let accessToken: string | null = null;

export function getToken(): string | null {
  return accessToken;
}

export function setToken(token: string): void {
  accessToken = token;
}

export function clearToken(): void {
  accessToken = null;
}

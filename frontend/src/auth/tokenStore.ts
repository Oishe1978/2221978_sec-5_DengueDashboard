const KEY = "dengue_access_token";

/** The token lives in sessionStorage: it survives a page refresh but not closing the tab. */
export function getToken(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    /* storage unavailable: the login only lasts until the page is reloaded */
  }
}

export function clearToken(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

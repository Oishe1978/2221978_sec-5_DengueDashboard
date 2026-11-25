import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMe, login as loginRequest, logout as logoutRequest, register as registerRequest } from "../api/auth";
import { refreshAccessToken } from "../api/http";
import type { AuthUser, LoginInput, RegisterInput } from "../types";
import { clearToken, setToken } from "./tokenStore";

interface AuthContextValue {
  user: AuthUser | null;
  /** True while the saved session is being restored, so the page does not flash guest content. */
  loading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // On every page load: use the refresh cookie (if there is one) to get an access token and the user.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshAccessToken();
      if (token) {
        try {
          const me = await getMe();
          if (!cancelled) setUser(me);
        } catch {
          /* the session could not be restored: stay logged out */
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // An API call found out that the session is over (refresh failed).
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("auth-expired", onExpired);
    return () => window.removeEventListener("auth-expired", onExpired);
  }, []);

  async function login(input: LoginInput): Promise<AuthUser> {
    const response = await loginRequest(input);
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }

  async function register(input: RegisterInput): Promise<AuthUser> {
    const response = await registerRequest(input);
    setToken(response.access_token);
    setUser(response.user);
    return response.user;
  }

  async function logout(): Promise<void> {
    try {
      await logoutRequest();
    } catch {
      /* even if the server cannot be reached, forget the login here */
    }
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser: setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

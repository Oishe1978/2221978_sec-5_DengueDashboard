import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getMe, login as loginRequest, register as registerRequest } from "../api/auth";
import type { AuthUser, LoginInput, RegisterInput } from "../types";
import { clearToken, getToken, setToken } from "./tokenStore";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(getToken() !== null);

  // Restore the login after a page refresh.
  useEffect(() => {
    if (!getToken()) return;
    getMe()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  // An API call reported that the saved login expired.
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

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

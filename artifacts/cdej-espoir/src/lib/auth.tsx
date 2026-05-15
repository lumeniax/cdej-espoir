import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { User } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { setApiClientTokenGetter } from "./apiClient";

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function AuthProvider({ children }: { children: ReactNode }) {
  const tokenRef = useRef<string | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = sessionStorage.getItem("cdej_user");
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleRefresh(expiresIn: number) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = Math.max(0, expiresIn - 60_000);
    refreshTimerRef.current = setTimeout(() => {
      void refreshAccessToken();
    }, delay);
  }

  async function refreshAccessToken(): Promise<string | null> {
    try {
      const res = await fetch(`${BASE}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        handleLogout();
        return null;
      }
      const data = (await res.json()) as { access_token: string; user: User };
      const newToken = data.access_token;
      tokenRef.current = newToken;
      setToken(newToken);
      setUser(data.user);
      sessionStorage.setItem("cdej_user", JSON.stringify(data.user));
      scheduleRefresh(14 * 60 * 1000);
      return newToken;
    } catch {
      handleLogout();
      return null;
    }
  }

  function login(newToken: string, newUser: User) {
    tokenRef.current = newToken;
    setToken(newToken);
    setUser(newUser);
    sessionStorage.setItem("cdej_user", JSON.stringify(newUser));
    scheduleRefresh(14 * 60 * 1000);
  }

  function handleLogout() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    sessionStorage.removeItem("cdej_user");
  }

  async function logout(): Promise<void> {
    try {
      await fetch(`${BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {},
      });
    } catch {}
    handleLogout();
  }

  useEffect(() => {
    if (user && !tokenRef.current) {
      void refreshAccessToken();
    }
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current);
    setApiClientTokenGetter(() => tokenRef.current);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        logout,
        refreshAccessToken,
        isAuthenticated: !!token && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

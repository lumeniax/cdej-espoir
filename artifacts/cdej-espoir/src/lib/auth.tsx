import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { User } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { setApiClientTokenGetter } from "./apiClient";

interface AuthContextType {
  token: string | null;
  user: User | null;
  /** Vrai pendant la phase de bootstrap (tentative de refresh silencieux). */
  initializing: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");

// Le token d'accès expire au bout de 15 min côté serveur. On programme le
// refresh ~1 min avant l'expiration pour avoir une marge confortable.
const ACCESS_TOKEN_LIFETIME_MS = 15 * 60 * 1000;
const REFRESH_BEFORE_EXPIRY_MS = 60 * 1000;

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
  const [initializing, setInitializing] = useState<boolean>(true);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref qui pointe toujours sur la dernière version de `refreshAccessToken`.
  // Cela permet à `scheduleRefresh` de l'appeler sans dépendance circulaire
  // ni problème de "used before declaration".
  const refreshFnRef = useRef<() => Promise<string | null>>(async () => null);

  const handleLogout = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    tokenRef.current = null;
    setToken(null);
    setUser(null);
    try {
      sessionStorage.removeItem("cdej_user");
    } catch {
      // ignore (mode privé / quota)
    }
  }, []);

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = Math.max(0, expiresIn - REFRESH_BEFORE_EXPIRY_MS);
    refreshTimerRef.current = setTimeout(() => {
      void refreshFnRef.current();
    }, delay);
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
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
      try {
        sessionStorage.setItem("cdej_user", JSON.stringify(data.user));
      } catch {
        // ignore
      }
      scheduleRefresh(ACCESS_TOKEN_LIFETIME_MS);
      return newToken;
    } catch {
      handleLogout();
      return null;
    }
  }, [handleLogout, scheduleRefresh]);

  // Garde le ref à jour pour que scheduleRefresh appelle toujours la version
  // la plus récente, sans avoir besoin de la mettre en dépendance.
  useEffect(() => {
    refreshFnRef.current = refreshAccessToken;
  }, [refreshAccessToken]);

  const login = useCallback(
    (newToken: string, newUser: User) => {
      tokenRef.current = newToken;
      setToken(newToken);
      setUser(newUser);
      try {
        sessionStorage.setItem("cdej_user", JSON.stringify(newUser));
      } catch {
        // ignore
      }
      scheduleRefresh(ACCESS_TOKEN_LIFETIME_MS);
    },
    [scheduleRefresh],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await fetch(`${BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: tokenRef.current
          ? { Authorization: `Bearer ${tokenRef.current}` }
          : {},
      });
    } catch {
      // best-effort logout — on nettoie quand même l'état local
    }
    handleLogout();
  }, [handleLogout]);

  // Bootstrap : tente un refresh silencieux au montage. On garde `initializing`
  // à true le temps de la tentative pour éviter de rediriger l'utilisateur
  // vers /login juste parce que le token n'est pas encore en mémoire.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshAccessToken();
      if (!cancelled) setInitializing(false);
    })();
    return () => {
      cancelled = true;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
    // refreshAccessToken est stable (deps stables) — on n'exécute qu'une fois.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Branche les "getter" globaux (api-client-react + apiClient interne).
  useEffect(() => {
    setAuthTokenGetter(() => tokenRef.current);
    setApiClientTokenGetter(() => tokenRef.current);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        initializing,
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

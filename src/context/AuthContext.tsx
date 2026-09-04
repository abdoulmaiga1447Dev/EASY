import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthState, User, UserRole } from "../types";

interface AuthContextProps extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (
    name: string,
    email: string,
    phone: string,
    password: string,
    role: UserRole,
    extra?: any
  ) => Promise<{ success: boolean; error?: string; status?: string }>;
  logout: () => void;
  clearError: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    accessToken: localStorage.getItem("ev_access_token"),
    refreshToken: localStorage.getItem("ev_refresh_token"),
    user: null,
    isAuthenticated: false,
    isLoading: true
  });

  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  // Parse JWT payload safely without external dependencies
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  // Check current session from /api/me using token
  const fetchCurrentUser = async (token: string) => {
    try {
      const res = await fetch("/api/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setState((prev) => ({
          ...prev,
          user: data.user,
          isAuthenticated: true,
          isLoading: false
        }));
      } else {
        // If access token failed, try to refresh
        await handleTokenRefresh();
      }
    } catch (err) {
      console.error("Fetch current user error:", err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleTokenRefresh = async () => {
    const rawRefresh = localStorage.getItem("ev_refresh_token");
    if (!rawRefresh) {
      logout();
      return;
    }

    try {
      const res = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rawRefresh })
      });

      if (res.ok) {
        const data = await res.json();
        const newAccess = data.accessToken;
        localStorage.setItem("ev_access_token", newAccess);
        
        setState((prev) => ({
          ...prev,
          accessToken: newAccess
        }));

        await fetchCurrentUser(newAccess);
      } else {
        logout();
      }
    } catch (refreshErr) {
      console.error("Token refresh failed:", refreshErr);
      logout();
    }
  };

  useEffect(() => {
    if (state.accessToken) {
      // Validate token expiry (optional, fetchCurrentUser handles bad tokens)
      const payload = parseJwt(state.accessToken);
      if (payload && payload.exp * 1000 > Date.now()) {
        fetchCurrentUser(state.accessToken);
      } else {
        // Expired, try parsing/refreshing
        handleTokenRefresh();
      }
    } else {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [state.accessToken]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error?.fr || data.error?.en || "Inconnu error";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      localStorage.setItem("ev_access_token", data.accessToken);
      localStorage.setItem("ev_refresh_token", data.refreshToken);

      setState({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        isAuthenticated: true,
        isLoading: false
      });

      return { success: true, user: data.user };
    } catch (err) {
      const fallbackErr = "Connexion impossible. Erreur réseau.";
      setError(fallbackErr);
      return { success: false, error: fallbackErr };
    }
  };

  const register = async (
    name: string,
    email: string,
    phone: string,
    password: string,
    role: UserRole,
    extra?: any
  ) => {
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, password, role, ...extra })
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg = data.error?.fr || data.error?.en || "Inconnu error";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // If pending validation, do NOT login automatically
      if (data.status === "pending_validation") {
        return { success: true, status: "pending_validation" };
      }

      localStorage.setItem("ev_access_token", data.accessToken);
      localStorage.setItem("ev_refresh_token", data.refreshToken);

      setState({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user,
        isAuthenticated: true,
        isLoading: false
      });

      return { success: true };
    } catch (err) {
      const fallbackErr = "Création de compte impossible. Erreur réseau.";
      setError(fallbackErr);
      return { success: false, error: fallbackErr };
    }
  };

  const logout = () => {
    localStorage.removeItem("ev_access_token");
    localStorage.removeItem("ev_refresh_token");
    setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ ...state, error, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

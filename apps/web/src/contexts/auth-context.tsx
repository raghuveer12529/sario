"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { API_BASE, getAuthHeader } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  name: string | null;
  avatarUrl?: string;
  isVerified: boolean;
  role?: "CUSTOMER" | "VENDOR" | "SUPER_ADMIN" | "SUPPORT";
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: { user: User }) => void;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; avatarUrl?: string }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(async () => {
    // The Next.js proxy reads the httpOnly refresh_token cookie, revokes it server-side,
    // and clears both auth cookies. We just clear local state.
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch { /* non-fatal — still clear local state */ }

    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  }, [router]);

  const login = useCallback(
    (data: { user: User }) => {
      // Both access_token and refresh_token are set as httpOnly cookies by the
      // Next.js proxy route — JS never touches the tokens.
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
      // Merge any items added as a guest into the now-authenticated cart.
      void fetch(`${API_BASE}/cart/merge`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: "{}",
      }).catch(() => {});
    },
    [],
  );

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        const data = (await res.json()) as User;
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      } else if (res.status === 401) {
        // Clear stale state without navigating — let route guards handle redirects.
        // The httpOnly cookies are cleared by the logout/refresh proxy routes.
        localStorage.removeItem("user");
        setUser(null);
      }
    } catch {
      // network error — keep localStorage user
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser) as User);
      } catch {
        localStorage.removeItem("user");
      }
    }

    // Always attempt to verify session via httpOnly cookie (access_token is not readable by JS)
    void fetchUser();
  }, [fetchUser]);

  const updateProfile = async (data: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  }): Promise<User> => {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const updated = (await res.json()) as User;
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    }

    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "Failed to update profile");
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, loading, login, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

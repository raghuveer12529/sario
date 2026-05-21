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
import Cookies from "js-cookie";
import { API_BASE } from "@/lib/api";

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: { refreshToken: string; user: User }) => void;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; avatarUrl?: string }) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(async () => {
    // Tell the Next.js proxy to delete the httpOnly access_token cookie
    try {
      const refreshToken = Cookies.get("refresh_token");
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
        credentials: "include",
      });
    } catch { /* non-fatal — still clear local state */ }

    Cookies.remove("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  }, [router]);

  const login = useCallback(
    (data: { refreshToken: string; user: User }) => {
      // access_token is set as httpOnly cookie by the Next.js proxy route — do not set it here
      Cookies.set("refresh_token", data.refreshToken, { expires: 30, sameSite: "lax" });
      localStorage.setItem("user", JSON.stringify(data.user));
      setUser(data.user);
    },
    [],
  );

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = (await res.json()) as User;
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      } else if (res.status === 401) {
        logout();
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

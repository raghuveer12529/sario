import { useState, useEffect, useCallback } from "react";
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
      } else if (res.status === 401) {
        logout();
      }
    } catch (error) {
      console.error("Failed to fetch user:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = Cookies.get("access_token");
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("user");
      }
    }

    if (token) {
      void fetchUser(token);
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const logout = useCallback(() => {
    Cookies.remove("access_token");
    Cookies.remove("refresh_token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/");
  }, [router]);

  const updateProfile = async (data: { name?: string; email?: string; avatarUrl?: string }) => {
    const token = Cookies.get("access_token");
    if (!token) throw new Error("No authentication token found");

    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      const updatedUser = await res.json();
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    } else {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Failed to update profile");
    }
  };

  return {
    user,
    isAuthenticated: !!user,
    loading,
    logout,
    updateProfile,
  };
}

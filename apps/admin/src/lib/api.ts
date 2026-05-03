const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/v1";

let adminToken: string | null = null;

export function setAdminToken(token: string) {
  adminToken = token;
  if (typeof window !== "undefined") localStorage.setItem("admin_token", token);
}

export function getAdminToken(): string | null {
  if (adminToken) return adminToken;
  if (typeof window !== "undefined") return localStorage.getItem("admin_token");
  return null;
}

export async function adminFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

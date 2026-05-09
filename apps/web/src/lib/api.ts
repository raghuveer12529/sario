import Cookies from "js-cookie";

export const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/v1";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = Cookies.get("access_token");
  
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(error.message ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

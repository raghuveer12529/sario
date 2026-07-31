const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/v1";

let vendorToken: string | null = null;

export function setVendorToken(token: string) {
  vendorToken = token;
  if (typeof window !== "undefined") localStorage.setItem("vendor_token", token);
}

export function getVendorToken(): string | null {
  if (vendorToken) return vendorToken;
  if (typeof window !== "undefined") return localStorage.getItem("vendor_token");
  return null;
}

export function clearVendorToken() {
  vendorToken = null;
  if (typeof window !== "undefined") localStorage.removeItem("vendor_token");
}

export async function vendorFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getVendorToken();
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

export { API_BASE };

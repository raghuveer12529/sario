export const API_BASE = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:4000/v1";

// Reads the access_token cookie when it is JS-accessible (non-httpOnly dev mode)
// and returns an Authorization header. Falls back to empty object in production
// where the cookie is httpOnly and sent automatically by the browser (same domain).
export function getAuthHeader(): Record<string, string> {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
  const token = match ? decodeURIComponent(match[1] ?? "") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const hasBody = options?.body != null;
  // Pull headers out of options so the merged set below can't be clobbered by a
  // later `...options` spread. (A caller passing its own `headers` — e.g. an
  // Idempotency-Key — must NOT drop Content-Type/Authorization, or the JSON body
  // goes unparsed and the request silently fails validation.)
  const { headers: callerHeaders, ...restOptions } = options ?? {};
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...restOptions,
    headers: {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...getAuthHeader(),
      ...callerHeaders,
    },
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(error.message ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

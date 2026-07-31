import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000/v1";

type ApiUser = { id: string; email: string; phone?: string | null; name: string | null; isVerified: boolean };
type ApiAuthResponse = { accessToken: string; refreshToken: string; user: ApiUser };

function setAccessTokenCookie(res: NextResponse, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("access_token", token, {
    // In dev the cookie must be JS-readable so apiFetch can send it as a
    // Bearer header when web and API run on different tunnel domains.
    httpOnly: isProd,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 15 * 60,
    path: "/",
  });
}

// The 30-day refresh token is httpOnly in every environment — JS never reads it,
// so XSS cannot exfiltrate it. It is only sent to same-origin /api/auth/* routes.
function setRefreshTokenCookie(res: NextResponse, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("refresh_token", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/api/auth",
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string; password?: string };

  // Try vendor login first — if the user has a vendor record they get VENDOR role
  const vendorAttempt = await fetch(`${API_URL}/auth/vendor/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (vendorAttempt.ok) {
    const data = (await vendorAttempt.json()) as ApiAuthResponse;
    const res = NextResponse.json({ user: { ...data.user, role: "VENDOR" } });
    setAccessTokenCookie(res, data.accessToken);
    setRefreshTokenCookie(res, data.refreshToken);
    return res;
  }

  // Fall back to customer login
  const upstream = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({ message: "Auth failed" }));
    return NextResponse.json(err, { status: upstream.status });
  }

  const data = (await upstream.json()) as ApiAuthResponse;
  const res = NextResponse.json({ user: { ...data.user, role: "CUSTOMER" } });
  setAccessTokenCookie(res, data.accessToken);
  setRefreshTokenCookie(res, data.refreshToken);
  return res;
}

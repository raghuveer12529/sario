import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000/v1";
const isProd = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  // The refresh token is httpOnly — read it from the cookie, never from the body.
  const refreshToken = req.cookies.get("refresh_token")?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const upstream = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!upstream.ok) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    res.cookies.delete("access_token");
    res.cookies.delete({ name: "refresh_token", path: "/api/auth" });
    return res;
  }

  const data = (await upstream.json()) as { accessToken: string; refreshToken: string };
  const res = NextResponse.json({ ok: true });
  res.cookies.set("access_token", data.accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 15 * 60,
    path: "/",
  });
  // Rotate the refresh token (the API revokes the old one on every refresh).
  res.cookies.set("refresh_token", data.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/api/auth",
  });
  return res;
}

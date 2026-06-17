import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000/v1";
const isProd = process.env.NODE_ENV === "production";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { email?: string; password?: string };

  const upstream = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({ message: "Registration failed" }));
    return NextResponse.json(err, { status: upstream.status });
  }

  const data = (await upstream.json()) as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; phone?: string | null; name: string | null; isVerified: boolean };
  };

  const res = NextResponse.json({ user: { ...data.user, role: "CUSTOMER" } });
  res.cookies.set("access_token", data.accessToken, {
    httpOnly: isProd,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge: 15 * 60,
    path: "/",
  });
  res.cookies.set("refresh_token", data.refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60,
    path: "/api/auth",
  });
  return res;
}

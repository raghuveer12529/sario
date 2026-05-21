import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000/v1";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ message: "Not available in production" }, { status: 403 });
  }

  const body = await req.json();
  const upstream = await fetch(`${API_URL}/auth/dev`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({ message: "Dev login failed" }));
    return NextResponse.json(err, { status: upstream.status });
  }

  const data = (await upstream.json()) as {
    accessToken: string;
    refreshToken: string;
    user: { id: string; phone: string; name: string | null; isVerified: boolean };
  };

  const res = NextResponse.json({ user: data.user, refreshToken: data.refreshToken });
  res.cookies.set("access_token", data.accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  });
  return res;
}

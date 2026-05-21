import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000/v1";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { refreshToken: string };
  const upstream = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: body.refreshToken }),
  });

  if (!upstream.ok) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    res.cookies.delete("access_token");
    return res;
  }

  const data = (await upstream.json()) as { accessToken: string; refreshToken: string };
  const res = NextResponse.json({ refreshToken: data.refreshToken });
  res.cookies.set("access_token", data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  });
  return res;
}

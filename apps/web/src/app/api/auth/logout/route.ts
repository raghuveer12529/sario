import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000/v1";

export async function POST(req: NextRequest) {
  // Optionally tell NestJS to revoke the refresh token
  const body = await req.json().catch(() => ({}) as { refreshToken?: string });
  if (body.refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: body.refreshToken }),
    }).catch(() => {}); // non-fatal
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete("access_token");
  return res;
}

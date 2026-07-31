import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000/v1";

export async function POST(req: NextRequest) {
  // Revoke the refresh token server-side. It is httpOnly, so read it from the cookie.
  const refreshToken = req.cookies.get("refresh_token")?.value;
  const accessToken = req.cookies.get("access_token")?.value;
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {}); // non-fatal
  }

  const res = NextResponse.json({ success: true });
  res.cookies.delete("access_token");
  res.cookies.delete({ name: "refresh_token", path: "/api/auth" });
  return res;
}

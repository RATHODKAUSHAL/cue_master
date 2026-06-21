import { NextResponse } from "next/server";
import { clearAdminCookie, revokeAdminToken } from "@/lib/admin/auth";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  await revokeAdminToken(token);
  const response = NextResponse.json({ ok: true });
  clearAdminCookie(response);
  return response;
}

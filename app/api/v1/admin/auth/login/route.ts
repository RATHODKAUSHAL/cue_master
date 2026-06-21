import { NextResponse } from "next/server";
import { loginAdmin, setAdminCookie } from "@/lib/admin/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await loginAdmin(String(body.email ?? ""), String(body.password ?? ""));
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }
    const response = NextResponse.json({
      token: result.token,
      expiresAt: result.expiresAt,
      admin: result.admin,
    });
    setAdminCookie(response, result.token);
    return response;
  } catch (error) {
    console.error("Admin login failed", error);
    return NextResponse.json({ message: "Unable to login." }, { status: 500 });
  }
}

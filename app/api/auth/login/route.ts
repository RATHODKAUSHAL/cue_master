import { NextResponse } from "next/server";
import { createSessionCookie } from "@/lib/auth/session";
import { loginUser } from "@/lib/controllers/auth.controller";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await loginUser({
      email: String(body.email ?? ""),
      password: String(body.password ?? ""),
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    const response = NextResponse.json({ user: result.user });
    await createSessionCookie(response, {
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
    });

    return response;
  } catch {
    return NextResponse.json({ message: "Unable to login." }, { status: 500 });
  }
}

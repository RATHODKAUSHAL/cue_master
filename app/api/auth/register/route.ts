import { NextResponse } from "next/server";
import { registerUser } from "@/lib/controllers/auth.controller";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await registerUser({
      name: String(body.name ?? ""),
      email: String(body.email ?? ""),
      mobileNumber: String(body.mobileNumber ?? ""),
      password: String(body.password ?? ""),
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json({ user: result.user }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Unable to register user." }, { status: 500 });
  }
}

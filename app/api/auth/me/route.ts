import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/controllers/auth.controller";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await getAuthenticatedUser(session.userId);

  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ user });
}

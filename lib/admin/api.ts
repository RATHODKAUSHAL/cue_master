import { NextResponse } from "next/server";
import { requireAdminToken } from "@/lib/admin/auth";

export async function requireAdminApi(request: Request) {
  const auth = await requireAdminToken(request);
  if (!auth.ok) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }
  return auth;
}

export function adminError(error: unknown, fallback: string) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
  if (code === "P2002") {
    return NextResponse.json({ message: "This email or mobile number is already in use." }, { status: 409 });
  }
  if (code === "P2025") {
    return NextResponse.json({ message: "Record not found." }, { status: 404 });
  }
  if (code === "P2003") {
    return NextResponse.json(
      { message: "This record has game or payment history and cannot be deleted." },
      { status: 409 },
    );
  }
  console.error(fallback, error);
  return NextResponse.json({ message: fallback }, { status: 500 });
}

import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { updateSessionAddOnForUser } from "@/lib/controllers/session.controller";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON request body." }, { status: 400 });
  }

  const { id } = await params;
  const result = await updateSessionAddOnForUser(auth.session.userId, id, body.delta);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ addOnAmount: result.addOnAmount });
}

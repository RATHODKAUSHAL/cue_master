import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { pauseSessionForUser } from "@/lib/controllers/session.controller";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(_request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const result = await pauseSessionForUser(auth.session.userId, id);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ session: result.session });
}

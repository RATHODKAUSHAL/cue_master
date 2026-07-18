import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { notifySessionCompletedForUser } from "@/lib/controllers/session.controller";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const result = await notifySessionCompletedForUser(auth.session.userId, id);

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.message,
        ...("detail" in result ? { detail: result.detail } : {}),
      },
      { status: result.status },
    );
  }

  return NextResponse.json({
    sent: result.sent,
    alreadySent: result.alreadySent,
    result: "result" in result ? result.result : undefined,
    reason: "reason" in result ? result.reason : undefined,
  });
}

import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { finalizeSessionForUser } from "@/lib/controllers/session.controller";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const startedAt = performance.now();
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json();
  const result = await finalizeSessionForUser(auth.session.userId, id, {
    ownerResult: body.ownerResult,
    players: Array.isArray(body.players) ? body.players : [],
    payments: Array.isArray(body.payments) ? body.payments : [],
    addOnAmount: body.addOnAmount === undefined ? undefined : Number(body.addOnAmount),
    extraPaymentAction: body.extraPaymentAction,
    extraAmount: body.extraAmount === undefined ? undefined : Number(body.extraAmount),
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.message,
        ...("detail" in result ? { detail: result.detail } : {}),
      },
      {
        status: result.status,
        headers: {
          "Server-Timing": `application;dur=${(performance.now() - startedAt).toFixed(1)}`,
        },
      },
    );
  }

  return NextResponse.json(
    { session: result.session },
    {
      headers: {
        "Server-Timing": `application;dur=${(performance.now() - startedAt).toFixed(1)}`,
      },
    },
  );
}

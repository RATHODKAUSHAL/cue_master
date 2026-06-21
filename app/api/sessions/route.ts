import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { listSessionsForUser, startSessionForUser } from "@/lib/controllers/session.controller";

export async function GET(request: Request) {
  const startedAt = performance.now();
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const url = new URL(request.url);
    const result = await listSessionsForUser(auth.session.userId, url.searchParams.get("status"));

    return NextResponse.json(
      { sessions: result.sessions },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Server-Timing": `application;dur=${(performance.now() - startedAt).toFixed(1)}`,
        },
      },
    );
  } catch (error) {
    console.error("Unable to load sessions", error);

    return NextResponse.json(
      {
        message: "Unable to load sessions.",
        ...(process.env.NODE_ENV === "development" && error instanceof Error
          ? { detail: error.message }
          : {}),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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

  const result = await startSessionForUser(auth.session.userId, {
    customerName: String(body.customerName ?? body.name ?? ""),
    customerMobileNumber: String(body.customerMobileNumber ?? body.mobileNumber ?? ""),
    tableId: String(body.tableId ?? ""),
    durationMinutes: body.durationMinutes === undefined ? undefined : Number(body.durationMinutes),
    gameCount: body.gameCount === undefined ? undefined : Number(body.gameCount),
    ownerPlaying: Boolean(body.ownerPlaying),
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.message,
        ...("detail" in result ? { detail: result.detail } : {}),
      },
      { status: result.status },
    );
  }

  return NextResponse.json({ session: result.session }, { status: 201 });
}

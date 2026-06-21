import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import {
  deleteSessionForUser,
  getSessionForUser,
  updateSessionForUser,
} from "@/lib/controllers/session.controller";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(_request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const result = await getSessionForUser(auth.session.userId, id);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ session: result.session });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json();
  const result = await updateSessionForUser(auth.session.userId, id, {
    customerName: String(body.customerName ?? ""),
    customerMobileNumber: String(body.customerMobileNumber ?? ""),
    tableId: String(body.tableId ?? ""),
    durationMinutes: body.durationMinutes === undefined ? undefined : Number(body.durationMinutes),
    gameCount: body.gameCount === undefined ? undefined : Number(body.gameCount),
    ownerPlaying: Boolean(body.ownerPlaying),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ session: result.session });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const result = await deleteSessionForUser(auth.session.userId, id);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ message: "Session deleted." });
}

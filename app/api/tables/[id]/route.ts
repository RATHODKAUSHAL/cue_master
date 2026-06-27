import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { deleteTableForUser, updateTableForUser } from "@/lib/controllers/table.controller";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const body = await request.json();
  const result = await updateTableForUser(auth.session.userId, id, {
    name: String(body.name ?? ""),
    category: String(body.category ?? ""),
    pricingMode: String(body.pricingMode ?? ""),
    price: Number(body.price),
    durationHours: Number(body.durationHours || 0),
    durationMinutes: Number(body.durationMinutes || 0),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ table: result.table });
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
  const result = await deleteTableForUser(auth.session.userId, id);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}

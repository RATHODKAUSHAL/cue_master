import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { deleteTableForUser, updateTableForUser } from "@/lib/controllers/table.controller";

async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return session;
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const result = await updateTableForUser(session.userId, id, {
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
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const result = await deleteTableForUser(session.userId, id);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}

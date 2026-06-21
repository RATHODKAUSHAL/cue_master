import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { payCustomerPendingForUser } from "@/lib/controllers/customer.controller";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);

  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await payCustomerPendingForUser(auth.session.userId, id, body.amount);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ pendingAmount: result.pendingAmount });
}

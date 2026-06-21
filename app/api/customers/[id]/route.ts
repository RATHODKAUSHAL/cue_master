import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { getCustomerProfileForUser } from "@/lib/controllers/customer.controller";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiSession(request);

  if (!auth.ok) return auth.response;

  const { id } = await params;
  const result = await getCustomerProfileForUser(auth.session.userId, id);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json(
    { customer: result.customer },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

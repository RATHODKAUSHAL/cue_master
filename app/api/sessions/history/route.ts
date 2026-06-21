import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { listSessionHistoryForUser } from "@/lib/controllers/session.controller";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const result = await listSessionHistoryForUser(auth.session.userId, {
    customerName: url.searchParams.get("name"),
    mobileNumber: url.searchParams.get("mobile"),
    date: url.searchParams.get("date"),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json(
    { sessions: result.sessions },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

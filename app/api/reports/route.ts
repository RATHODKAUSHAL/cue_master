import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { getReportsForUser } from "@/lib/controllers/report.controller";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const result = await getReportsForUser(auth.session.userId, {
    date: url.searchParams.get("date"),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json(
    { report: result.report },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

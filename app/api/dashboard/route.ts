import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { getDashboardAnalyticsForUser } from "@/lib/controllers/dashboard.controller";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const result = await getDashboardAnalyticsForUser(
    auth.session.userId,
    url.searchParams.get("period"),
    url.searchParams.get("date"),
  );

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json(
    { analytics: result.analytics },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

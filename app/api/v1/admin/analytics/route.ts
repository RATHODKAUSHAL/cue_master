import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/api";
import { getAdminAnalytics } from "@/lib/admin/data";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const userId = new URL(request.url).searchParams.get("userId");
  return NextResponse.json({ analytics: await getAdminAnalytics(userId) });
}

import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/api";
import { listAdminGames } from "@/lib/admin/data";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ games: await listAdminGames() });
}

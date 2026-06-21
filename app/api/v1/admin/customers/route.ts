import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/api";
import { listAdminCustomers } from "@/lib/admin/data";

export async function GET(request: Request) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ customers: await listAdminCustomers() });
}

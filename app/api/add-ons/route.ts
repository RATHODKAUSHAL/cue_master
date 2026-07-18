import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { createAddOnForUser, listAddOnsForUser } from "@/lib/controllers/add-on.controller";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const result = await listAddOnsForUser(auth.session.userId);
  return NextResponse.json({ addOns: result.addOns });
}

export async function POST(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON request body." }, { status: 400 });
  }

  const result = await createAddOnForUser(auth.session.userId, body.amount);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ addOn: result.addOn }, { status: 201 });
}

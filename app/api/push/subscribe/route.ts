import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { subscribe, unsubscribe, validateSubscription } from "@/lib/push";

export async function POST(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON request body." }, { status: 400 });
  }

  const subscription = validateSubscription(body);

  if (!subscription) {
    return NextResponse.json({ message: "Invalid push subscription." }, { status: 400 });
  }

  const saved = await subscribe(auth.session.userId, subscription);

  return NextResponse.json({
    subscribed: true,
    subscriptionId: saved.id,
  });
}

export async function DELETE(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  let endpoint = "";

  try {
    const body = await request.json();
    endpoint = String(body.endpoint || "");
  } catch {
    return NextResponse.json({ message: "Invalid JSON request body." }, { status: 400 });
  }

  if (!endpoint.startsWith("https://")) {
    return NextResponse.json({ message: "Invalid push endpoint." }, { status: 400 });
  }

  await unsubscribe(auth.session.userId, endpoint);

  return NextResponse.json({ subscribed: false });
}

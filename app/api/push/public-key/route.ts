import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { getPublicVapidKey, PushConfigError } from "@/lib/push";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    return NextResponse.json({ publicKey: getPublicVapidKey() });
  } catch (error) {
    if (error instanceof PushConfigError) {
      return NextResponse.json({ message: error.message }, { status: 503 });
    }

    console.error("Unable to load VAPID public key", error);
    return NextResponse.json({ message: "Unable to load push configuration." }, { status: 500 });
  }
}

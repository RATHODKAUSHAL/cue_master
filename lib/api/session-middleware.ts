import { NextResponse } from "next/server";
import { getCurrentSessionFromRequest } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/api/rate-limit";

export async function requireApiSession(request: Request) {
  const session = await getCurrentSessionFromRequest(request);

  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const isRead = !request || request.method === "GET";
  const rateLimit = checkRateLimit(
    `${session.userId}:${isRead ? "read" : "write"}`,
    isRead ? 180 : 60,
  );

  if (!rateLimit.allowed) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Too many requests. Please try again shortly." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000))),
          },
        },
      ),
    };
  }

  return { ok: true as const, session };
}

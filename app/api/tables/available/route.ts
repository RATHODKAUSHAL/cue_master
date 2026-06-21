import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { getAvailableTablesForUser } from "@/lib/controllers/table.controller";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const tables = await getAvailableTablesForUser(auth.session.userId);
    return NextResponse.json({ tables });
  } catch (error) {
    console.error("Unable to load available tables", error);

    return NextResponse.json(
      {
        message: "Unable to load available tables.",
        ...(process.env.NODE_ENV === "development" && error instanceof Error
          ? { detail: error.message }
          : {}),
      },
      { status: 500 },
    );
  }
}

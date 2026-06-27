import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import { createTableForUser, getTablesForUser } from "@/lib/controllers/table.controller";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  try {
    const tables = await getTablesForUser(auth.session.userId);
    return NextResponse.json({ tables });
  } catch (error) {
    console.error("Unable to load tables", error);

    return NextResponse.json(
      {
        message: "Unable to load tables.",
        ...(process.env.NODE_ENV === "development" ? { detail: getErrorMessage(error) } : {}),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const result = await createTableForUser(auth.session.userId, {
    name: String(body.name ?? ""),
    category: String(body.category ?? ""),
    pricingMode: String(body.pricingMode ?? ""),
    price: Number(body.price),
    durationHours: Number(body.durationHours || 0),
    durationMinutes: Number(body.durationMinutes || 0),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ table: result.table }, { status: 201 });
}

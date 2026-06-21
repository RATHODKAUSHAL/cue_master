import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";
import { createTableForUser, getTablesForUser } from "@/lib/controllers/table.controller";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return session;
}

export async function GET() {
  const session = await requireSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const tables = await getTablesForUser(session.userId);
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
  const session = await requireSession();

  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const result = await createTableForUser(session.userId, {
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

import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api/session-middleware";
import {
  createCustomerForUser,
  listCustomersForUser,
  searchCustomerForUser,
} from "@/lib/controllers/customer.controller";

export async function GET(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const mobile = url.searchParams.get("mobile");
  const search = url.searchParams.get("search");

  if (!mobile) {
    const result = await listCustomersForUser(auth.session.userId, search);
    return NextResponse.json({ customers: result.customers });
  }

  const result = await searchCustomerForUser(auth.session.userId, mobile);

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ customer: result.customer });
}

export async function POST(request: Request) {
  const auth = await requireApiSession(request);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const result = await createCustomerForUser(auth.session.userId, {
    name: String(body.name ?? ""),
    mobileNumber: String(body.mobileNumber ?? ""),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json({ customer: result.customer }, { status: 201 });
}

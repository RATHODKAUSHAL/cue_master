import { NextResponse } from "next/server";
import { adminError, requireAdminApi } from "@/lib/admin/api";
import { deleteAdminCustomer, updateAdminCustomer } from "@/lib/admin/data";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const mobileNumber = String(body.mobileNumber ?? "").replace(/\D/g, "").slice(-10);
    if (!name || mobileNumber.length !== 10) {
      return NextResponse.json({ message: "Enter valid customer details." }, { status: 400 });
    }
    return NextResponse.json({ customer: await updateAdminCustomer(id, { name, mobileNumber }) });
  } catch (error) {
    return adminError(error, "Unable to update customer.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    await deleteAdminCustomer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminError(error, "Unable to delete customer.");
  }
}

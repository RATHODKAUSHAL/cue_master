import { NextResponse } from "next/server";
import { adminError, requireAdminApi } from "@/lib/admin/api";
import { deleteAdminUser, updateAdminUser } from "@/lib/admin/data";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const mobileNumber = String(body.mobileNumber ?? "").replace(/\D/g, "").slice(-10);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || mobileNumber.length !== 10) {
      return NextResponse.json({ message: "Enter valid user details." }, { status: 400 });
    }
    return NextResponse.json({ user: await updateAdminUser(id, { name, email, mobileNumber }) });
  } catch (error) {
    return adminError(error, "Unable to update user.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    await deleteAdminUser(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminError(error, "Unable to delete user.");
  }
}

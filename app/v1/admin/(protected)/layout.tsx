import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentAdmin } from "@/lib/admin/auth";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/v1/admin/login");
  return <AdminShell admin={admin}>{children}</AdminShell>;
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardAppShell } from "@/components/dashboard/dashboard-shell";
import { TableManager } from "@/components/tables/table-manager";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/controllers/auth.controller";

export const metadata: Metadata = {
  title: "Tables | CueDesk CRM",
  description: "Create, edit, delete, and price pool and snooker tables.",
};

export default async function TablesPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?redirect=/tables");
  }

  const user = await getAuthenticatedUser(session.userId);

  if (!user) {
    redirect("/login?redirect=/tables");
  }

  return (
    <DashboardAppShell title="Tables" userName={user.name} greeting="Manage your venue tables">
      <TableManager />
    </DashboardAppShell>
  );
}

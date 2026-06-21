import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CustomerManager } from "@/components/customers/customer-manager";
import { DashboardAppShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/controllers/auth.controller";

export const metadata: Metadata = {
  title: "Customers | CueDesk CRM",
  description: "Search, add, and review customer balances.",
};

export default async function CustomersPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?redirect=/customers");
  }

  const user = await getAuthenticatedUser(session.userId);

  if (!user) {
    redirect("/login?redirect=/customers");
  }

  return (
    <DashboardAppShell title="Customers" userName={user.name} greeting="Customer management">
      <CustomerManager />
    </DashboardAppShell>
  );
}

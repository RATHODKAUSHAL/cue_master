import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardAppShell } from "@/components/dashboard/dashboard-shell";
import { ReportsManager } from "@/components/reports/reports-manager";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/controllers/auth.controller";

export const metadata: Metadata = {
  title: "Reports | CueDesk CRM",
  description: "Export customer and completed session reports by date.",
};

export default async function ReportsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?redirect=/reports");
  }

  const user = await getAuthenticatedUser(session.userId);

  if (!user) {
    redirect("/login?redirect=/reports");
  }

  return (
    <DashboardAppShell title="Reports" userName={user.name} userEmail={user.email} greeting="Exports and totals">
      <ReportsManager />
    </DashboardAppShell>
  );
}

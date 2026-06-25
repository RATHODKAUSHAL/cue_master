import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardAppShell } from "@/components/dashboard/dashboard-shell";
import { SessionHistory } from "@/components/sessions/session-history";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/controllers/auth.controller";

export const metadata: Metadata = {
  title: "Session History | CueDesk CRM",
  description: "Search completed sessions by date, customer name, or mobile number.",
};

export default async function HistoryPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?redirect=/history");
  }

  const user = await getAuthenticatedUser(session.userId);

  if (!user) {
    redirect("/login?redirect=/history");
  }

  return (
    <DashboardAppShell title="History" userName={user.name} userEmail={user.email} greeting="Completed session history">
      <SessionHistory />
    </DashboardAppShell>
  );
}

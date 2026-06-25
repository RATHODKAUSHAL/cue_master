import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardAppShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/controllers/auth.controller";
import SessionManager from "@/components/sessions/session-manager";

export const metadata: Metadata = {
  title: "Sessions | CueDesk CRM",
  description: "Create live table sessions, track timers, and finalize billing.",
};

export default async function SessionsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?redirect=/sessions");
  }

  const user = await getAuthenticatedUser(session.userId);

  if (!user) {
    redirect("/login?redirect=/sessions");
  }

  return (
    <DashboardAppShell title="Sessions" userName={user.name} userEmail={user.email} greeting="Create and bill sessions">
      <div className="font-sans">
        <SessionManager />
      </div>
    </DashboardAppShell>
  );
}

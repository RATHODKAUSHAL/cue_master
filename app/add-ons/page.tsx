import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AddOnManager } from "@/components/add-ons/add-on-manager";
import { DashboardAppShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/controllers/auth.controller";

export const metadata: Metadata = {
  title: "Add-on | CueDesk CRM",
  description: "Create quick add-on amounts for session billing.",
};

export default async function AddOnsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?redirect=/add-ons");
  }

  const user = await getAuthenticatedUser(session.userId);

  if (!user) {
    redirect("/login?redirect=/add-ons");
  }

  return (
    <DashboardAppShell title="Add-on" userName={user.name} userEmail={user.email} greeting="Quick bill add-ons">
      <AddOnManager />
    </DashboardAppShell>
  );
}

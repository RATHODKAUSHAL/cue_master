import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/controllers/auth.controller";

export const metadata: Metadata = {
  title: "Dashboard | CueDesk CRM",
  description:
    "Pool and snooker CRM dashboard UI for live sessions, tables, customers, pending amount, analytics, and revenue.",
};

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?redirect=/dashboard");
  }

  const user = await getAuthenticatedUser(session.userId);

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return <DashboardShell userName={user.name} greeting={greeting} />;
}

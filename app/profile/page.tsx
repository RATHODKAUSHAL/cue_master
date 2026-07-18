import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileText, User } from "lucide-react";
import { DashboardAppShell } from "@/components/dashboard/dashboard-shell";
import { getCurrentSession } from "@/lib/auth/session";
import { getAuthenticatedUser } from "@/lib/controllers/auth.controller";

export const metadata: Metadata = {
  title: "Profile | CueDesk CRM",
  description: "View your CueDesk CRM account profile.",
};

export default async function ProfilePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login?redirect=/profile");
  }

  const user = await getAuthenticatedUser(session.userId);

  if (!user) {
    redirect("/login?redirect=/profile");
  }

  const details = [
    { label: "Full name", value: user.name },
    { label: "Email address", value: user.email },
    { label: "Mobile number", value: user.mobileNumber },
    {
      label: "Member since",
      value: new Date(user.createdAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    },
  ];

  return (
    <DashboardAppShell title="Profile" userName={user.name} userEmail={user.email} greeting="Account details">
      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="grid size-16 place-items-center rounded-2xl bg-zinc-950 text-lg font-bold text-white">
            {user.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-normal text-zinc-950">{user.name}</h1>
          <p className="mt-2 text-sm text-zinc-500">{user.email}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#3195EF]/20 bg-[#3195EF]/10 px-3 py-1 text-xs font-semibold text-[#126ec1]">
            <User aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
            Venue owner profile
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
            <span className="grid size-10 place-items-center rounded-xl bg-zinc-100 text-zinc-700">
              <FileText aria-hidden="true" strokeWidth={1.8} className="size-5 shrink-0" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-zinc-950">Account information</h2>
              <p className="text-sm text-zinc-500">Your registered CueDesk CRM details.</p>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {details.map((item) => (
              <div key={item.label} className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  {item.label}
                </dt>
                <dd className="mt-2 break-words text-sm font-semibold text-zinc-950">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </DashboardAppShell>
  );
}

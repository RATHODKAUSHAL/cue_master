"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { DashboardIcon } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { adminFetch, clearAdminToken } from "@/lib/admin/client";
import { cn } from "@/lib/utils";

const items = [
  { label: "Home", href: "/v1/admin/home", icon: "home" },
  { label: "Users", href: "/v1/admin/User", icon: "users" },
  { label: "Customers", href: "/v1/admin/customer", icon: "receipt" },
  { label: "Games", href: "/v1/admin/game", icon: "clock" },
];

export function AdminShell({
  admin,
  children,
}: {
  admin: { name: string; email: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    try {
      await adminFetch("/api/v1/admin/auth/logout", { method: "POST" });
    } finally {
      clearAdminToken();
      window.location.replace("/v1/admin/login");
    }
  }

  const nav = (
    <nav className="mt-8 grid gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
            pathname === item.href
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
          )}
        >
          <DashboardIcon name={item.icon} className="size-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200 bg-white p-5 lg:flex">
        <Link href="/v1/admin/home" className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-slate-950 text-sm font-bold text-white">CA</span>
          <div>
            <p className="font-bold">CueDesk Admin</p>
            <p className="text-xs text-slate-500">Management console</p>
          </div>
        </Link>
        {nav}
        <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="truncate text-sm font-bold">{admin.name}</p>
          <p className="truncate text-xs text-slate-500">{admin.email}</p>
          <Button className="mt-4 w-full rounded-xl" variant="outline" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[min(19rem,86vw)] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="font-bold">CueDesk Admin</p>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <DashboardIcon name="close" />
              </Button>
            </div>
            {nav}
          </aside>
        </div>
      ) : null}

      <section className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
                <DashboardIcon name="menu" />
              </Button>
              <div>
                <p className="text-sm font-bold">Administration</p>
                <p className="text-xs text-slate-500">Platform-wide overview and controls</p>
              </div>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-blue-600 text-xs font-bold text-white">
              {admin.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-[1680px] p-4 sm:p-6 lg:p-8">{children}</div>
      </section>
    </main>
  );
}

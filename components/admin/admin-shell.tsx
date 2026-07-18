"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Clock, Home, Menu, Receipt, Users, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetch, clearAdminToken } from "@/lib/admin/client";
import { cn } from "@/lib/utils";

const items: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Home", href: "/v1/admin/home", icon: Home },
  { label: "Users", href: "/v1/admin/User", icon: Users },
  { label: "Customers", href: "/v1/admin/customer", icon: Receipt },
  { label: "Games", href: "/v1/admin/game", icon: Clock },
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
    <nav className="grid gap-2 lg:mt-8">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            aria-current={pathname === item.href ? "page" : undefined}
            className={cn(
              "group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
              pathname === item.href
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-lg transition",
                pathname === item.href ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-950",
              )}
            >
              <Icon aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
            </span>
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
          </Link>
        );
      })}
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
          <button className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[min(21rem,88vw)] flex-col overflow-hidden border-r border-slate-200 bg-white shadow-2xl shadow-slate-950/25">
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-700 p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <Link href="/v1/admin/home" onClick={() => setMobileOpen(false)} className="flex min-w-0 items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-sm font-bold text-slate-950 shadow-lg shadow-slate-950/20">CA</span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">CueDesk Admin</span>
                    <span className="block truncate text-xs text-white/70">Management console</span>
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close admin sidebar"
                  onClick={() => setMobileOpen(false)}
                  className="size-10 rounded-xl text-white hover:bg-white/15 hover:text-white"
                >
                  <X aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
                </Button>
              </div>
              <div className="mt-5 rounded-xl border border-white/15 bg-white/10 p-3 shadow-inner shadow-white/5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/60">Admin Menu</p>
                <p className="mt-1 text-sm font-semibold">Review users, customers and game activity.</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{nav}</div>
            <div className="m-4 mt-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
              <p className="truncate text-sm font-bold">{admin.name}</p>
              <p className="truncate text-xs text-slate-500">{admin.email}</p>
              <Button className="mt-4 w-full rounded-xl" variant="outline" onClick={logout}>
                Sign out
              </Button>
            </div>
          </aside>
        </div>
      ) : null}

      <section className="min-h-screen lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button className="lg:hidden" variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
                <Menu aria-hidden="true" strokeWidth={1.8} className="size-5 shrink-0" />
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

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  BadgePlus,
  ChartNoAxesColumn,
  Clock,
  FileText,
  History,
  Home,
  Menu,
  Plus,
  Table2,
  Timer,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";
import { PwaInstallButton } from "@/components/pwa-install-button";
import { PushNotificationSettings } from "@/components/push-notification-settings";
import { clearUserSession, userFetch } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

const navItems: Array<{ label: string; icon: LucideIcon; href: string }> = [
  { label: "Dashboard", icon: Home, href: "/dashboard" },
  { label: "Tables", icon: Table2, href: "/tables" },
  { label: "Sessions", icon: Clock, href: "/sessions" },
  { label: "History", icon: History, href: "/history" },
  { label: "Customers", icon: Users, href: "/customers" },
  { label: "Add-on", icon: BadgePlus, href: "/add-ons" },
  { label: "Reports", icon: ChartNoAxesColumn, href: "/reports" },
];

const mobileNavItems: Array<{ label: string; icon: LucideIcon; href: string }> = [
  { label: "Dashboard", icon: Home, href: "/dashboard" },
  { label: "Tables", icon: Table2, href: "/tables" },
  { label: "Session", icon: Plus, href: "/sessions" },
  { label: "History", icon: Timer, href: "/history" },
  { label: "Customers", icon: Users, href: "/customers" },
];

function Sidebar({
  collapsed,
  setCollapsed,
  activePath,
  className,
}: {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  activePath: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/10 bg-[#0F0F0F] p-4 text-white shadow-[18px_0_50px_rgba(0,0,0,0.28)] transition-[width] duration-300 lg:flex",
        collapsed ? "w-[84px]" : "w-[280px]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#337418]/20 bg-[#337418]/10 text-sm font-extrabold text-[#337418] shadow-[0_12px_28px_rgba(51,116,24,0.12)]">
            CD
          </span>
          {!collapsed ? <span className="truncate font-semibold text-white">CueDesk CRM</span> : null}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
          onClick={() => setCollapsed(!collapsed)}
          className="size-9 rounded-xl text-white hover:bg-white/10 hover:text-white"
        >
          <Menu aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
        </Button>
      </div>

      <nav className="mt-7 grid gap-1">
        {navItems.map((item) => {
          const active = item.href === activePath;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                active ? "bg-[#337418]/12 text-[#337418]" : "text-white/55 hover:bg-white/10 hover:text-white",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon aria-hidden="true" strokeWidth={1.8} className="size-5 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-auto rounded-2xl border border-white/10 bg-[#202020]/80 p-3",
          collapsed && "grid place-items-center p-2",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#337418] text-xs font-extrabold text-white">
            BP
          </div>
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <p className="truncate text-sm font-semibold text-white">Break Point Club</p>
            <p className="truncate text-xs text-white/45" suppressHydrationWarning>
              CueDesk CRM
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileBottomNav({ activePath }: { activePath: string }) {
  return (
    <nav
      aria-label="Mobile dashboard navigation"
      className="fixed inset-x-0 bottom-0 z-40 bg-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+0.6rem)] lg:hidden"
    >
      <div className="mx-auto flex max-w-[26rem] items-center justify-between gap-1 rounded-[1.8rem] border border-zinc-200/80 bg-white/95 px-4 py-2.5 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-2xl">
        {mobileNavItems.map((item) => {
          const active = item.href === activePath;
          const isMiddle = item.href === "/sessions";
          const Icon = item.icon;

          if (isMiddle) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Create Session"
                className="relative -translate-y-6 flex size-12 shrink-0 items-center justify-center rounded-full bg-[#337418] text-white shadow-[0_6px_20px_rgba(51,116,24,0.35)] transition-all hover:scale-105 active:scale-95"
              >
                <Plus aria-hidden="true" strokeWidth={1.8} className="size-6 shrink-0" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-all min-w-[3.5rem]",
                active ? "text-[#337418]" : "text-zinc-400 hover:text-zinc-550",
              )}
            >
              <span
                className={cn(
                  "grid place-items-center transition-all",
                  active ? "bg-[#337418]/10 text-[#337418] rounded-xl px-3 py-1" : "size-7 text-zinc-400",
                )}
              >
                <Icon aria-hidden="true" strokeWidth={1.8} className="size-4.5 shrink-0" />
              </span>
              <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function getInitials(name?: string) {
  return (name || "VO")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function UserMenu({ userName, userEmail }: { userName?: string; userEmail?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const displayName = userName || "Venue Owner";
  const displayEmail = userEmail || "No email available";

  async function logout() {
    setLoggingOut(true);
    try {
      window.localStorage.removeItem("cuedesk_admin_token");
      await userFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      clearUserSession();
      router.replace("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open user menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative grid size-10 shrink-0 place-items-center rounded-full border-2 border-[#337418] bg-[#337418]/10 text-[#337418] shadow-sm transition hover:bg-[#337418]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#337418]"
      >
        <User aria-hidden="true" strokeWidth={1.8} className="size-5 shrink-0" />
        <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white bg-[#337418]" />
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-[#202020] p-3 text-left text-white shadow-xl shadow-black/40 z-50">
          <div className="flex items-center gap-3 border-b border-white/10 pb-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#337418] text-xs font-bold text-[#F8F8F8]">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{displayName}</p>
              <p className="truncate text-xs text-white/50">{displayEmail}</p>
            </div>
          </div>
          <div className="mt-3 grid gap-1 border-b border-white/10 pb-3 animate-slide-up">
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex min-h-10 items-center gap-3 rounded-xl px-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <User aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
              Profile
            </Link>
            <Link
              href="/reports"
              onClick={() => setOpen(false)}
              className="flex min-h-10 items-center gap-3 rounded-xl px-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <FileText aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
              Reports
            </Link>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full justify-center border-white/10 bg-white/10 text-white hover:bg-white/15 hover:text-white"
            onClick={logout}
            disabled={loggingOut}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function DashboardAppShell({
  children,
  title,
  userName,
  userEmail,
  greeting,
}: {
  children: ReactNode;
  title: string;
  userName?: string;
  userEmail?: string;
  greeting?: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <main className="h-screen overflow-hidden bg-[#F8F9FA] text-zinc-900">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activePath={pathname} />
      <MobileBottomNav activePath={pathname} />

      {/* Mobile left-slide menu drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex w-[280px] animate-slide-up flex-col bg-white p-4 text-zinc-800 shadow-2xl h-full border-r border-zinc-200">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 mb-4">
              <div>
                <p className="text-lg font-extrabold text-zinc-950">CueDesk CRM</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="grid size-8 place-items-center rounded-lg bg-zinc-100 text-zinc-800 hover:bg-zinc-200 transition"
              >
                <X aria-hidden="true" strokeWidth={1.8} className="size-4 shrink-0" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <nav className="grid gap-1">
                {navItems.map((item) => {
                  const active = item.href === pathname;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all",
                        active
                          ? "bg-[#337418]/15 text-[#337418] font-bold border border-[#337418]/10"
                        : "text-zinc-500 hover:bg-[#337418]/5 hover:text-[#337418]"
                      )}
                    >
                      <Icon aria-hidden="true" strokeWidth={1.8} className="size-4.5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-zinc-100 pt-4">
              <PwaInstallButton alwaysVisible className="w-full bg-[#337418] hover:bg-[#265912]" />
            </div>
          </aside>
        </div>
      )}

      <section
        className={cn(
          "h-screen overflow-y-auto transition-[padding] duration-300 lg:pl-[280px]",
          collapsed && "lg:pl-[84px]",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/95 backdrop-blur-xl max-lg:border-b-0">
          <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              {/* Hamburger Button on Mobile screen */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="grid size-10 place-items-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 transition lg:hidden"
                aria-label="Toggle Navigation Drawer"
              >
                <span className="flex w-4.5 flex-col gap-1">
                  <span className="h-0.5 w-full rounded-full bg-zinc-800" />
                  <span className="h-0.5 w-[75%] rounded-full bg-zinc-800" />
                  <span className="h-0.5 w-full rounded-full bg-zinc-800" />
                </span>
              </button>

              <div className="min-w-0">
                <p className="truncate text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl lg:text-sm lg:font-semibold">{title}</p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <PushNotificationSettings />
              <PwaInstallButton compact className="sm:hidden" />
              <div className="hidden min-w-0 text-right sm:block">
                <p className="truncate text-sm font-semibold text-zinc-800">
                  {userName || "Venue Owner"}
                </p>
                <p className="truncate text-xs text-zinc-400 font-medium">{greeting || "CueDesk CRM"}</p>
              </div>
              <UserMenu userName={userName} userEmail={userEmail} />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1680px] p-4 pb-32 sm:p-6 sm:pb-36 lg:p-8">{children}</div>
      </section>
    </main>
  );
}

export function DashboardShell({
  userName,
  userEmail,
  greeting,
}: {
  userName: string;
  userEmail: string;
  greeting: string;
}) {
  return (
    <DashboardAppShell title="Dashboard" userName={userName} userEmail={userEmail} greeting={greeting}>
      <DashboardAnalytics userName={userName} greeting={greeting} />
    </DashboardAppShell>
  );
}

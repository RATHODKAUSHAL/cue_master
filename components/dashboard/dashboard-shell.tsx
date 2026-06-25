"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DashboardAnalytics } from "@/components/dashboard/dashboard-analytics";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: "home", href: "/dashboard" },
  { label: "Tables", icon: "table", href: "/tables" },
  { label: "Sessions", icon: "clock", href: "/sessions" },
  { label: "History", icon: "history", href: "/history" },
  { label: "Customers", icon: "users", href: "/customers" },
  { label: "Invoices", icon: "receipt", href: "#" },
  { label: "Payments", icon: "card", href: "#" },
  { label: "Reports", icon: "chart", href: "#" },
  { label: "Settings", icon: "settings", href: "#" },
];

export function DashboardIcon({ name, className }: { name: string; className?: string }) {
  const common = "fill-none stroke-current stroke-[1.8] stroke-linecap-round stroke-linejoin-round";
  const paths: Record<string, ReactNode> = {
    home: <path className={common} d="M3.5 10.5 12 3l8.5 7.5M5.5 9v10h13V9M9 19v-6h6v6" />,
    table: <path className={common} d="M7 4h10v16H7zM9.5 8h5M9.5 12h5M9.5 16h2" />,
    clock: <path className={common} d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2" />,
    history: (
      <>
        <path className={common} d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4.5V10H9" />
        <path className={common} d="M12 7.5V12l3 2" />
      </>
    ),
    users: (
      <>
        <path className={common} d="M16 20v-1.5c0-2-1.8-3.5-4-3.5H8c-2.2 0-4 1.5-4 3.5V20" />
        <path className={common} d="M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 20v-1.5c0-1.6-1.1-2.9-2.7-3.3M16 4.4a3.5 3.5 0 0 1 0 6.8" />
      </>
    ),
    receipt: <path className={common} d="M7 3h10v18l-2-1-2 1-2-1-2 1-2-1V3Zm3 5h4M10 12h4M10 16h2" />,
    card: <path className={common} d="M4 7h16v10H4zM4 10h16M7 15h3" />,
    chart: <path className={common} d="M5 19V5M5 19h14M9 16v-5M13 16V8M17 16v-8" />,
    settings: (
      <>
        <path className={common} d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
        <path className={common} d="m19 13 .5 2-2 3.4-2.1-.6-1.7 1.1-.5 2h-4l-.5-2-1.7-1.1-2.1.6-2-3.4.5-2L2 11.4 4 8l2.1.6 1.7-1.1.5-2h4l.5 2 1.7 1.1L17 8l2 3.4L17.6 13Z" />
      </>
    ),
    menu: <path className={common} d="M4 7h16M4 12h16M4 17h16" />,
    close: <path className={common} d="m6 6 12 12M18 6 6 18" />,
    plus: <path className={common} d="M12 5v14M5 12h14" />,
    calendar: <path className={common} d="M7 3v4M17 3v4M4 8h16M5 5h14v15H5z" />,
    chevron: <path className={common} d="m8 10 4 4 4-4" />,
    user: (
      <>
        <path className={common} d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        <path className={common} d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("size-5 shrink-0", className)}>
      {paths[name]}
    </svg>
  );
}

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
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-zinc-200 bg-white p-4 shadow-sm transition-[width] duration-300 lg:flex",
        collapsed ? "w-[84px]" : "w-[280px]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-zinc-950 text-sm font-semibold text-white">
            CD
          </span>
          {!collapsed ? <span className="truncate font-semibold">CueDesk CRM</span> : null}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
          onClick={() => setCollapsed(!collapsed)}
          className="size-9"
        >
          <DashboardIcon name="menu" className="size-4" />
        </Button>
      </div>

      <nav className="mt-7 grid gap-1">
        {navItems.map((item) => {
          const active = item.href === activePath;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                active ? "bg-[#3195EF]/10 text-[#126ec1]" : "text-zinc-600 hover:bg-zinc-100",
                collapsed && "justify-center px-0",
              )}
            >
              <DashboardIcon name={item.icon} />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn("mt-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3", collapsed && "grid place-items-center p-2")}>
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-md bg-zinc-950 text-xs font-semibold text-white">
            BP
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Break Point Club</p>
              <p className="truncate text-xs text-zinc-500">Ahmedabad</p>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function MobileSidebar({
  activePath,
  open,
  onClose,
}: {
  activePath: string;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close navigation backdrop"
        className="absolute inset-0 bg-zinc-950/30"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 flex h-full w-[min(20rem,86vw)] flex-col border-r border-zinc-200 bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" onClick={onClose} className="flex min-w-0 items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-zinc-950 text-sm font-semibold text-white">
              CD
            </span>
            <span className="truncate font-semibold">CueDesk CRM</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close sidebar"
            onClick={onClose}
            className="size-9"
          >
            <DashboardIcon name="close" className="size-4" />
          </Button>
        </div>

        <nav className="mt-7 grid gap-1">
          {navItems.map((item) => {
            const active = item.href === activePath;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition",
                  active ? "bg-[#3195EF]/10 text-[#126ec1]" : "text-zinc-600 hover:bg-zinc-100",
                )}
              >
                <DashboardIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-lg border border-zinc-200 bg-zinc-50 p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-md bg-zinc-950 text-xs font-semibold text-white">
              BP
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Break Point Club</p>
              <p className="truncate text-xs text-zinc-500">Ahmedabad</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
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
      await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
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
        className="grid size-10 shrink-0 place-items-center rounded-md bg-zinc-950 text-xs font-semibold text-white transition hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
      >
        <span className="hidden sm:inline">{getInitials(displayName)}</span>
        <DashboardIcon name="user" className="size-5 sm:hidden" />
      </button>

      {open ? (
        <div className="absolute right-0 mt-3 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-xl shadow-zinc-950/10">
          <div className="flex items-center gap-3 border-b border-zinc-100 pb-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-md bg-zinc-950 text-xs font-semibold text-white">
              {getInitials(displayName)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-950">{displayName}</p>
              <p className="truncate text-xs text-zinc-500">{displayEmail}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full justify-center"
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
    <main className="h-screen overflow-hidden bg-zinc-50 text-zinc-950">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activePath={pathname} />
      <MobileSidebar activePath={pathname} open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <section
        className={cn(
          "h-screen overflow-y-auto transition-[padding] duration-300 lg:pl-[280px]",
          collapsed && "lg:pl-[84px]",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open sidebar"
                onClick={() => setMobileOpen(true)}
                className="size-9 lg:hidden"
              >
                <DashboardIcon name="menu" className="size-4" />
              </Button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-zinc-950">{title}</p>
                <p className="truncate text-xs text-zinc-500">Break Point Club</p>
              </div>
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="truncate text-sm font-semibold text-zinc-950">
                  {userName || "Venue Owner"}
                </p>
                <p className="truncate text-xs text-zinc-500">{greeting || "CueDesk CRM"}</p>
              </div>
              <UserMenu userName={userName} userEmail={userEmail} />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1680px] p-4 sm:p-6 lg:p-8">{children}</div>
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

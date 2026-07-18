"use client";

import Link from "next/link";
import { useState } from "react";
import { PwaInstallButton } from "@/components/pwa-install-button";

type NavItem = {
  label: string;
  href: string;
};

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-md border border-zinc-300 bg-white text-zinc-950"
      >
        <span className="flex w-4 flex-col gap-1">
          <span className="h-0.5 rounded-full bg-zinc-950" />
          <span className="h-0.5 rounded-full bg-zinc-950" />
          <span className="h-0.5 rounded-full bg-zinc-950" />
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[999] h-dvh w-screen overflow-hidden bg-zinc-950/60 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close navigation backdrop"
            className="absolute inset-0"
            onClick={closeMenu}
          />
          <aside className="absolute inset-y-0 right-0 z-[1000] flex h-dvh w-[86vw] max-w-[22rem] flex-col overflow-hidden border-l border-zinc-200 bg-white text-zinc-950 shadow-2xl shadow-zinc-950/30">
            <div className="border-b border-zinc-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <Link href="/" onClick={closeMenu} className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-zinc-950 text-sm font-bold text-white">
                    CD
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-zinc-950">CueDesk CRM</span>
                    <span className="block truncate text-xs font-medium text-zinc-500">
                      Pool and snooker CRM
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label="Close navigation menu"
                  onClick={closeMenu}
                  className="grid size-10 shrink-0 place-items-center rounded-lg border border-zinc-300 bg-white text-xl font-semibold leading-none text-zinc-700 shadow-sm transition hover:bg-zinc-100"
                >
                  X
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white p-4">
              <div className="grid gap-2">
                {items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex min-h-12 items-center rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-[#3195EF]/40 hover:bg-[#3195EF]/10 hover:text-[#126ec1]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="grid gap-3 border-t border-zinc-200 bg-white p-4">
              <PwaInstallButton className="h-11 w-full rounded-lg" />
              <Link
                href="/login"
                onClick={closeMenu}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 bg-white text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-100"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={closeMenu}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[#3195EF] text-sm font-semibold text-white shadow-sm shadow-[#3195EF]/25 transition hover:opacity-90"
              >
                Try Our Free Tier
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

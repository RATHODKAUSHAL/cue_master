"use client";

import Link from "next/link";
import { useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

export function MobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

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
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close navigation backdrop"
            className="absolute inset-0 bg-zinc-950/25"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[min(22rem,86vw)] flex-col border-l border-zinc-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-950">CueDesk CRM</p>
                <p className="text-xs text-zinc-500">Pool and snooker CRM</p>
              </div>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-md border border-zinc-300 text-2xl leading-none text-zinc-700"
              >
                x
              </button>
            </div>

            <div className="mt-8 flex flex-col gap-1">
              {items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-base font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="mt-auto grid gap-3 border-t border-zinc-200 pt-5">
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 text-sm font-semibold text-zinc-800"
              >
                Login
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-md bg-[#3195EF] text-sm font-semibold text-white"
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

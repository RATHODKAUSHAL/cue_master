"use client";

import { useState } from "react";
import { Bell, BellOff, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotification } from "@/hooks/usePushNotification";

const DISMISSED_STORAGE_KEY = "cuedesk_push_prompt_dismissed";

export function PushNotificationSettings() {
  const {
    status,
    loading,
    message,
    deniedBefore,
    isSupported,
    requestPermission,
    unsubscribe,
  } = usePushNotification();
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "1",
  );

  function dismissPrompt() {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "1");
    setDismissed(true);
  }

  const enabled = status === "subscribed";
  const blocked = status === "denied" || deniedBefore;
  const showPrompt = isSupported && status === "default" && !dismissed && !blocked;

  return (
    <>
      <div className="hidden items-center gap-2 rounded-full border border-[#337418]/15 bg-white px-3 py-2 text-xs font-extrabold text-zinc-600 shadow-sm md:flex">
        {loading ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin text-[#337418]" />
        ) : enabled ? (
          <Bell aria-hidden="true" className="size-4 text-[#337418]" />
        ) : (
          <BellOff aria-hidden="true" className="size-4 text-zinc-400" />
        )}
        <span>{enabled ? "Notifications On" : blocked ? "Notifications Blocked" : "Notifications Off"}</span>
        {enabled ? (
          <button
            type="button"
            onClick={() => void unsubscribe()}
            className="ml-1 rounded-full px-2 py-1 text-[11px] text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            Turn off
          </button>
        ) : null}
      </div>

      {showPrompt ? (
        <div className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#337418]/20 bg-white p-4 text-zinc-900 shadow-2xl shadow-zinc-950/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#337418]/10 text-[#337418]">
                <Bell aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-extrabold">Enable session alerts?</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  CueDesk can notify you when a session timer completes and is ready to finalise.
                </p>
                {message ? <p className="mt-2 text-xs font-semibold text-red-600">{message}</p> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={dismissPrompt}
              className="grid size-8 shrink-0 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              aria-label="Dismiss notification prompt"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl"
              onClick={dismissPrompt}
            >
              Not now
            </Button>
            <Button
              type="button"
              className="h-11 rounded-xl bg-[#337418] text-white hover:bg-[#265912]"
              disabled={loading}
              onClick={() => void requestPermission()}
            >
              {loading ? "Enabling..." : "Allow"}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

const DISMISSED_STORAGE_KEY = "cuedesk_pwa_install_prompt_dismissed";

export function PwaInstallButton({
  className,
  compact = false,
  alwaysVisible = false,
}: {
  className?: string;
  compact?: boolean;
  alwaysVisible?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [canShowGuide, setCanShowGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const installReady = Boolean(deferredPrompt || canShowGuide);

  useEffect(() => {
    const mountTimer = window.setTimeout(() => {
      setDismissed(window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "1");
      setMounted(true);
    }, 0);

    function detectStandalone() {
      const navigatorWithStandalone = window.navigator as NavigatorWithStandalone;
      setInstalled(
        window.matchMedia("(display-mode: standalone)").matches ||
          Boolean(navigatorWithStandalone.standalone),
      );
      setCanShowGuide(/iphone|ipad|ipod/i.test(window.navigator.userAgent));
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstalled(false);
    }

    function handleAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    detectStandalone();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.clearTimeout(mountTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (installed) return;

    if (!deferredPrompt) {
      const isLocalhost = ["localhost", "127.0.0.1", "::1"].includes(
        window.location.hostname,
      );

      if (!window.isSecureContext && !isLocalhost) {
        window.alert(
          "A standalone PWA cannot be installed from this HTTP address. Open CueDesk from its HTTPS production URL, then tap Install again.",
        );
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        window.alert(
          "PWA installation is disabled in next dev to prevent invalid Workbox watch builds. Test a production build served over HTTPS.",
        );
        return;
      }

      if (canShowGuide) {
        window.alert(
          "On iPhone or iPad, tap Share, then choose Add to Home Screen to install CueDesk CRM.",
        );
        return;
      }

      window.alert(
        "This browser has not made CueDesk installable. Open the HTTPS site directly in Chrome, Edge, or Samsung Internet (not an in-app browser), wait a few seconds, then tap Install again.",
      );
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
    }
    setDismissed(true);
    setDeferredPrompt(null);
  }

  function dismissPrompt() {
    window.localStorage.setItem(DISMISSED_STORAGE_KEY, "1");
    setDismissed(true);
  }

  if (!mounted) {
    return null;
  }

  if (installed) {
    return null;
  }

  if (!alwaysVisible && !deferredPrompt && !canShowGuide) {
    return null;
  }

  if (compact) {
    if (dismissed) {
      return null;
    }

    return (
      <div
        className={cn(
          "fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] z-50 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl shadow-zinc-950/20 md:hidden",
          className,
        )}
      >
        <div className="flex items-center gap-3">
          <Image
            src="/icons/cue-master-logo.png"
            alt="CueDesk CRM logo"
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-2xl object-cover"
            priority
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-zinc-950">
              Want to download the PWA?
            </p>
            <p className="mt-0.5 text-xs font-medium leading-5 text-zinc-500">
              Install the app for faster access on your phone.
            </p>
          </div>
          <button
            type="button"
            onClick={dismissPrompt}
            className="grid size-8 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            aria-label="Cancel PWA install"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={dismissPrompt}
            className="h-11 rounded-xl border border-zinc-200 bg-white text-sm font-extrabold text-zinc-700 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={installApp}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#337418] text-sm font-extrabold text-white shadow-sm transition hover:bg-[#265912] disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            <Download aria-hidden="true" strokeWidth={2} className="size-4 shrink-0" />
            {installReady ? "Install" : "Check install"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={installApp}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#337418]/20 bg-[#337418] px-4 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#265912] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#337418]/35 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-200 disabled:text-zinc-500",
        compact && "size-10 rounded-full px-0",
        className,
      )}
      aria-label="Install CueDesk CRM app"
      title="Install App"
    >
      <Download aria-hidden="true" strokeWidth={2} className="size-4 shrink-0" />
      {compact ? null : <span>{installReady ? "Install PWA App" : "Check PWA install"}</span>}
    </button>
  );
}

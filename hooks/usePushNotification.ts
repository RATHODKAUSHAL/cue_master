"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { userFetch } from "@/lib/auth/client";

type PushStatus =
  | "unsupported"
  | "checking"
  | "default"
  | "denied"
  | "granted"
  | "subscribed"
  | "error";

const DENIED_STORAGE_KEY = "cuedesk_push_denied";

function hasPushSupport() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    output[index] = rawData.charCodeAt(index);
  }

  return output;
}

async function getServiceWorkerRegistration() {
  if (!("serviceWorker" in navigator)) return null;

  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;

  return navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
}

export function usePushNotification() {
  const [status, setStatus] = useState<PushStatus>(() =>
    hasPushSupport() ? "checking" : "unsupported",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isSupported = useMemo(() => hasPushSupport(), []);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setStatus("unsupported");
      return false;
    }

    setLoading(true);
    setMessage("");

    try {
      const registration = await getServiceWorkerRegistration();
      if (!registration) {
        setStatus("unsupported");
        return false;
      }

      const keyResponse = await userFetch("/api/push/public-key", { cache: "no-store" });
      const keyData = await keyResponse.json().catch(() => ({}));
      if (!keyResponse.ok || !keyData.publicKey) {
        throw new Error(keyData.message || "Push notification keys are not configured.");
      }

      const subscription =
        (await registration.pushManager.getSubscription()) ||
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(String(keyData.publicKey)),
        }));

      const response = await userFetch("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription.toJSON()),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Unable to save push subscription.");
      }

      setStatus("subscribed");
      setMessage("Notifications enabled.");
      return true;
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to enable notifications.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      setStatus("unsupported");
      return false;
    }

    setLoading(true);
    setMessage("");

    try {
      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        window.localStorage.setItem(DENIED_STORAGE_KEY, "1");
        setStatus("denied");
        setMessage("Notifications are blocked in this browser.");
        return false;
      }

      if (permission !== "granted") {
        setStatus("default");
        return false;
      }

      return subscribe();
    } finally {
      setLoading(false);
    }
  }, [isSupported, subscribe]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    setLoading(true);
    setMessage("");

    try {
      const registration = await getServiceWorkerRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      const endpoint = subscription?.endpoint || "";

      if (subscription) {
        await subscription.unsubscribe();
      }

      if (endpoint) {
        await userFetch("/api/push/subscribe", {
          method: "DELETE",
          body: JSON.stringify({ endpoint }),
        }).catch(() => undefined);
      }

      setStatus(Notification.permission === "granted" ? "granted" : "default");
      setMessage("Notifications disabled on this device.");
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) {
      return;
    }

    let active = true;

    async function check() {
      if (Notification.permission === "denied") {
        window.localStorage.setItem(DENIED_STORAGE_KEY, "1");
        if (active) setStatus("denied");
        return;
      }

      if (Notification.permission === "default") {
        if (active) setStatus("default");
        return;
      }

      const registration = await getServiceWorkerRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (!active) return;

      if (subscription) {
        setStatus("subscribed");
      } else {
        setStatus("granted");
        void subscribe();
      }
    }

    void check();

    return () => {
      active = false;
    };
  }, [isSupported, subscribe]);

  return {
    status,
    loading,
    message,
    deniedBefore:
      typeof window !== "undefined" && window.localStorage.getItem(DENIED_STORAGE_KEY) === "1",
    isSupported,
    subscribe,
    requestPermission,
    unsubscribe,
  };
}

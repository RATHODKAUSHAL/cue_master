import webPush, { type PushSubscription as WebPushSubscription } from "web-push";
import { prisma } from "@/lib/prisma";

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  sessionId?: string;
  tableId?: string;
  customerName?: string;
};

export type PushSubscriptionInput = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export class PushConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PushConfigError";
  }
}

function getVapidConfig() {
  const publicKey = process.env.PUBLIC_VAPID_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.PRIVATE_VAPID_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@cuedesk.local";

  if (!publicKey || !privateKey) {
    throw new PushConfigError("VAPID keys are not configured.");
  }

  webPush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey, subject };
}

function cleanText(value: unknown, fallback = "") {
  return String(value ?? fallback)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

export function sanitizePushPayload(payload: PushPayload) {
  return {
    title: cleanText(payload.title, "CueDesk CRM"),
    body: cleanText(payload.body, "You have a CueDesk update."),
    icon: payload.icon || "/icons/cuedesk-icon-192.png",
    badge: payload.badge || "/icons/cuedesk-icon-192.png",
    image: payload.image || "/pool-crm-dashboard.png",
    url: payload.url?.startsWith("/") ? payload.url : "/sessions",
    sessionId: cleanText(payload.sessionId),
    tableId: cleanText(payload.tableId),
    customerName: cleanText(payload.customerName),
  };
}

export function getPublicVapidKey() {
  return getVapidConfig().publicKey;
}

export function validateSubscription(input: unknown): PushSubscriptionInput | null {
  if (!input || typeof input !== "object") return null;

  const record = input as Record<string, unknown>;
  const keys = record.keys as Record<string, unknown> | undefined;
  const endpoint = cleanText(record.endpoint);
  const p256dh = cleanText(keys?.p256dh);
  const auth = cleanText(keys?.auth);

  if (!endpoint.startsWith("https://") || !p256dh || !auth) {
    return null;
  }

  return { endpoint, keys: { p256dh, auth } };
}

export async function subscribe(userId: string, input: PushSubscriptionInput) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: {
      userId,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    },
    create: {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
    },
  });
}

export async function unsubscribe(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
}

export async function sendNotification(
  subscription: WebPushSubscription,
  payload: PushPayload,
) {
  getVapidConfig();
  return webPush.sendNotification(subscription, JSON.stringify(sanitizePushPayload(payload)));
}

export async function sendToAllDevices(
  subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
  payload: PushPayload,
) {
  const sent: string[] = [];
  const removed: string[] = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );
        sent.push(subscription.id);
      } catch (error) {
        const statusCode =
          typeof error === "object" && error && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;

        if (statusCode === 404 || statusCode === 410) {
          removed.push(subscription.id);
        } else {
          console.error("Unable to send push notification", error);
        }
      }
    }),
  );

  if (removed.length) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: removed } },
    });
  }

  return { sent: sent.length, removed: removed.length };
}

export async function sendToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  return sendToAllDevices(subscriptions, payload);
}

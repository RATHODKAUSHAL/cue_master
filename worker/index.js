self.__WB_DISABLE_DEV_LOGS = true;

function getNotificationPayload(event) {
  if (!event.data) {
    return {
      title: "CueDesk CRM",
      body: "You have a CueDesk update.",
      url: "/sessions",
      icon: "/icons/cuedesk-icon-192.png",
      badge: "/icons/cuedesk-icon-192.png",
    };
  }

  try {
    return event.data.json();
  } catch {
    return {
      title: "CueDesk CRM",
      body: event.data.text(),
      url: "/sessions",
      icon: "/icons/cuedesk-icon-192.png",
      badge: "/icons/cuedesk-icon-192.png",
    };
  }
}

self.addEventListener("push", (event) => {
  const payload = getNotificationPayload(event);
  const url = payload.url || "/sessions";

  event.waitUntil(
    self.registration.showNotification(payload.title || "CueDesk CRM", {
      body: payload.body || "You have a CueDesk update.",
      icon: payload.icon || "/icons/cuedesk-icon-192.png",
      badge: payload.badge || "/icons/cuedesk-icon-192.png",
      image: payload.image,
      tag: payload.sessionId ? `session-completed-${payload.sessionId}` : "cuedesk-notification",
      renotify: false,
      data: {
        url,
        sessionId: payload.sessionId,
        tableId: payload.tableId,
        customerName: payload.customerName,
      },
      actions: [
        {
          action: "finalize",
          title: "Finalize Bill",
        },
      ],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "/sessions", self.location.origin);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === targetUrl.origin) {
          return client.focus().then(() => client.navigate(targetUrl.href));
        }
      }

      return self.clients.openWindow(targetUrl.href);
    }),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "cuedesk-background-sync") {
    event.waitUntil(Promise.resolve());
  }
});

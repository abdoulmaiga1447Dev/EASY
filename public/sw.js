/* Service worker EASY : affiche les notifications push (appel entrant, demande, paiement)
   même quand l'application est fermée, et rouvre l'application au toucher. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { titre: "EASY", message: e.data ? e.data.text() : "" }; }
  const appel = d.type === "appel";
  e.waitUntil(self.registration.showNotification(d.titre || "EASY", {
    body: d.message || "",
    tag: d.tag,
    renotify: !!d.tag,
    requireInteraction: appel, // un appel reste affiché jusqu'à ce qu'on le touche
    vibrate: appel ? [500, 250, 500, 250, 500, 250, 500, 250, 500] : [200, 100, 200],
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: d.url || "/" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});

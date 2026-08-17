/* global self */
self.addEventListener('push', (event) => {
  let title = 'Hampas admin';
  let body = 'You have a new request';
  let url = '/admin/requests';
  try {
    if (event.data) {
      const data = event.data.json();
      if (data.title) title = data.title;
      if (data.body) body = data.body;
      if (data.url) url = data.url;
    }
  } catch {
    /* ignore malformed payload */
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) ||
    '/admin/requests';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const c of clients) {
          if ('focus' in c) {
            c.navigate(url);
            return c.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});

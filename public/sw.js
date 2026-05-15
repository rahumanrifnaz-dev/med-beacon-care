/* Service Worker: handle push events */
self.addEventListener('push', function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'Notification', body: event.data ? event.data.text() : 'You have a notification' };
  }

  const title = data.title || 'MediCare+';
  const options = {
    body: data.body || '',
    data: data.url || '/',
    icon: '/icons/icon-192.svg',
    badge: '/icons/badge-72.svg',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const url = event.notification.data || '/';
  event.waitUntil(clients.openWindow(url));
});

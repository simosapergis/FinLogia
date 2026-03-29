// Firebase Messaging Service Worker
// This handles background push notifications when the app is not in foreground

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Listen for config from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    initializeFirebase(event.data.config);
  }
});

function initializeFirebase(config) {
  // Check if already initialized
  if (firebase.apps.length > 0) {
    console.log('[firebase-messaging-sw.js] Firebase already initialized, skipping');
    return;
  }

  // Validate config
  if (!config || !config.apiKey || !config.projectId || !config.appId) {
    console.error('[firebase-messaging-sw.js] Invalid Firebase config:', config);
    return;
  }

  try {
    firebase.initializeApp(config);
    const messaging = firebase.messaging();

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message:', payload);

      const data = payload.data || {};
      const notificationTitle = data.supplierName
        ? `Τιμολόγιο από ${data.supplierName}`
        : data.errorMessage
          ? 'Σφάλμα επεξεργασίας'
          : 'Ενημέρωση τιμολογίου';

      const notificationOptions = {
        body: data.errorMessage || `Τιμολόγιο ${data.invoiceNumber || data.invoiceId} επεξεργάστηκε`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        tag: `invoice-${data.invoiceId}`,
        data: {
          invoiceId: data.invoiceId,
          supplierId: data.supplierId,
          url: `/invoices/${data.invoiceId}`,
        },
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });

    console.log('[firebase-messaging-sw.js] Firebase initialized successfully');
  } catch (err) {
    // Handle duplicate app error gracefully
    if (err.code === 'app/duplicate-app') {
      console.log('[firebase-messaging-sw.js] Firebase app already exists, continuing');
      return;
    }
    console.error('[firebase-messaging-sw.js] Firebase initialization error:', err);
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: event.notification.data,
          });
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

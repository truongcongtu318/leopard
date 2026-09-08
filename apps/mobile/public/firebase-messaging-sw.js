/* eslint-disable no-undef */
// Firebase Web Messaging service worker for the LEOPARD customer PWA.
//
// This file is served as-is from the web build root (see
// apps/mobile/public/), so it is NOT processed by Metro/Babel and cannot
// read `process.env.EXPO_PUBLIC_FIREBASE_*`. The app registers this worker
// with its (public, client-safe) Firebase Web config passed as URL query
// params — see `push-token-provider.ts#buildServiceWorkerUrl` — which this
// file reads back below.
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

const queryParams = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: queryParams.get('apiKey'),
  authDomain: queryParams.get('authDomain'),
  projectId: queryParams.get('projectId'),
  storageBucket: queryParams.get('storageBucket'),
  messagingSenderId: queryParams.get('messagingSenderId'),
  appId: queryParams.get('appId'),
});

const messaging = firebase.messaging();

// Foreground messages are handled in-app via `onMessage` (not this file);
// this only fires when the PWA tab is not focused/visible.
messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'LEOPARD';
  const body = (payload.notification && payload.notification.body) || '';
  const data = payload.data || {};

  self.registration.showNotification(title, {
    body,
    icon: '/assets/brand/leopard-emblem.png',
    data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const orderId = event.notification.data && event.notification.data.orderId;
  const targetUrl = orderId ? `/customer/orders/${orderId}` : '/customer/notifications';
  event.waitUntil(self.clients.openWindow(targetUrl));
});

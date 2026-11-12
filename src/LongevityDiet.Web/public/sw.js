/* LongevityDiet: notification-only service worker; no offline cache and no
 * cross-origin fetch interception. Push is enabled only with explicit consent
 * and a registered VAPID subscription in the authenticated application. */
self.addEventListener('push', event => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    // Never interpret remote payload as HTML or executable code.
  }
  const id = typeof data.id === 'string' && /^[a-f0-9]{32}$/.test(data.id)
    ? data.id : 'generic'
  event.waitUntil(self.registration.showNotification(
    'LongevityDiet có thông báo mới', {
      body: 'Mở ứng dụng để xem lời nhắc.',
      tag: 'longevity-reminder-' + id,
      renotify: false,
      data: { url: '/notifications' }
    }
  ))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL('/notifications', self.registration.scope).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({
      type: 'window', includeUncontrolled: true
    })
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        if (typeof client.navigate === 'function') await client.navigate(target)
        if (typeof client.focus === 'function') await client.focus()
        return
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target)
  })())
})

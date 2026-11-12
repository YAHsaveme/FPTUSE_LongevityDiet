import { expect, test } from '@playwright/test'

test('service worker handles simulated background push without exposing health text', async ({
  page, context,
}) => {
  // Local CDP simulation exercises the actual Service Worker handler.
  // It does NOT claim receipt from an external FCM / Apple push provider.
  const origin = 'http://localhost:5173'
  await context.grantPermissions(['notifications'], { origin })
  await page.goto('/')
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    if (!registration.active) throw new Error('Service worker did not activate')
  })

  const session = await context.newCDPSession(page)
  let registrations: Array<{ registrationId: string, scopeURL: string, isDeleted: boolean }> = []
  session.on('ServiceWorker.workerRegistrationUpdated', event => {
    registrations = event.registrations
  })
  await session.send('ServiceWorker.enable')
  await expect.poll(() => {
    const value = registrations.find(reg =>
      reg.scopeURL.startsWith(origin) && !reg.isDeleted)
    return value?.registrationId || ''
  }, { timeout: 12000 }).toMatch(/.+/)

  // Navigate away: no app page is open while CDP delivers the synthetic push.
  await page.goto('about:blank')
  await session.send('ServiceWorker.deliverPushMessage', {
    origin,
    registrationId: registrations.find(reg =>
      reg.scopeURL.startsWith(origin) && !reg.isDeleted)!.registrationId,
    data: JSON.stringify({
      id: '0123456789abcdef0123456789abcdef',
      title: 'Sensitive private patient text MUST NOT appear',
      body: 'Sensitive note MUST NOT appear',
      url: 'https://phishing.invalid',
    }),
  })
  await page.goto(origin)

  await expect.poll(async () => {
    return page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready
      const shown = await registration.getNotifications()
      return shown.map(item => ({
        title: item.title,
        body: item.body,
        tag: item.tag,
      }))
    })
  }, { timeout: 12000 }).toContainEqual({
    title: 'LongevityDiet có thông báo mới',
    body: 'Mở ứng dụng để xem lời nhắc.',
    tag: 'longevity-reminder-0123456789abcdef0123456789abcdef',
  })
})

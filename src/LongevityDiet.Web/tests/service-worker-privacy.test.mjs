import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')

function makeServiceWorker() {
  const listeners = new Map()
  const shown = []
  const navigation = []
  const self = {
    addEventListener(name, handler) { listeners.set(name, handler) },
    location: { origin: 'https://app.example.test' },
    registration: {
      scope: 'https://app.example.test/',
      showNotification: async (title, options) => {
        shown.push({ title, ...options })
      },
    },
    clients: {
      matchAll: async () => [
        { url: 'https://malicious.invalid/', navigate: async () => {
          throw new Error('must never navigate a foreign origin')
        }, focus: async () => { throw new Error('must never focus foreign origin') } },
      ],
      openWindow: async url => { navigation.push(url) },
    },
  }
  runInNewContext(source, { self, URL })
  return { listeners, shown, navigation }
}

async function dispatchPush(sw, data) {
  let backgroundLifetime
  const event = {
    data: { json: () => data },
    waitUntil(task) { backgroundLifetime = Promise.resolve(task) },
  }
  sw.listeners.get('push')(event)
  assert.ok(backgroundLifetime, 'push handler must keep service worker alive')
  await backgroundLifetime
}

test('service worker never displays sensitive client-supplied notification text or links', async () => {
  const sw = makeServiceWorker()
  await dispatchPush(sw, {
    id: '0123456789abcdef0123456789abcdef',
    title: 'PRIVATE HEALTH RECORD — must not appear',
    body: 'PRIVATE HEALTH DATA — must not appear',
    url: 'https://malicious.invalid',
    html: '<script>bad()</script>',
  })
  assert.equal(sw.shown.length, 1)
  assert.equal(sw.shown[0].title, 'LongevityDiet có thông báo mới')
  assert.equal(sw.shown[0].body, 'Mở ứng dụng để xem lời nhắc.')
  assert.equal(sw.shown[0].tag, 'longevity-reminder-0123456789abcdef0123456789abcdef')
  assert.equal(sw.shown[0].data.url, '/notifications')
  assert.ok(!JSON.stringify(sw.shown).includes('PRIVATE HEALTH'))
  assert.ok(!JSON.stringify(sw.shown).includes('malicious.invalid'))
})

test('invalid event identifiers fall back to generic tag without leaking payload', async () => {
  const sw = makeServiceWorker()
  await dispatchPush(sw, { id: '../../evil', title: 'Private diagnosis', body: 'Sensitive' })
  assert.equal(sw.shown[0].tag, 'longevity-reminder-generic')
  assert.equal(sw.shown[0].body, 'Mở ứng dụng để xem lời nhắc.')
})

test('notification click never uses remote payload URLs', async () => {
  const sw = makeServiceWorker()
  let closed = false
  let lifetime
  sw.listeners.get('notificationclick')({
    notification: { close() { closed = true } },
    waitUntil(task) { lifetime = Promise.resolve(task) },
  })
  assert.ok(lifetime)
  await lifetime
  assert.equal(closed, true)
  assert.deepEqual(sw.navigation, ['https://app.example.test/notifications'])
})

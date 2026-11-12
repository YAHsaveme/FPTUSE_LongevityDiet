// Opt-in, isolated QA only. Real browser push provider + synthetic account.
// Never uses actual customers or Gmail. Local VAPID secrets are not in Git.
import assert from 'node:assert/strict'
import { randomUUID, createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { chromium } from '@playwright/test'

const project = 'prn232-acceptance'
const base = 'http://127.0.0.1:5173'
const api = 'http://127.0.0.1:8080/api/v1'
function docker(args, input = '') {
  const r = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 30000 })
  if (r.status !== 0 || r.error)
    throw new Error('Isolated QA container failed: ' + args.slice(0, 3).join(' '))
  return r.stdout.trim()
}
for (const service of ['api', 'redis', 'sqlserver']) {
  const container = project + '-' + service + '-1'
  const info = JSON.parse(docker(['inspect', container]))[0]
  assert.equal(info.Config.Labels['com.docker.compose.project'], project)
}
assert.equal(docker(['exec', project + '-api-1', 'printenv',
  'WebPush__Enabled']).toLowerCase(), 'true')
async function request(path, method = 'GET', body, token) {
  const r = await fetch(api + path, {
    method, headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  return { code: r.status, data: await r.json() }
}
async function until(check, timeoutMs = 90000) {
  const end = Date.now() + timeoutMs
  while (Date.now() < end) {
    if (await check()) return true
    await new Promise(resolve => setTimeout(resolve, 1400))
  }
  return false
}

const marker = randomUUID().replaceAll('-', '').slice(0, 16)
const address = 'pushqa-' + marker + '@example.test'
const created = await request('/auth/register', 'POST', {
  email: address, password: 'SyntheticQA_StrongPass123!',
  displayName: 'Synthetic Web Push Test'
})
assert.equal(created.code, 201)
const token = created.data.accessToken
const userId = created.data.user?.id
assert.match(userId, /^[0-9a-f-]{36}$/i)
const saved = await request('/reminders/preferences', 'PUT', {
  optedIn: true, emailOptedIn: false,
  mealLoggingEnabled: true, activityEnabled: true,
  challengeEnabled: true, weeklySummaryEnabled: true,
  mealTime: '20:00:00', activityTime: '18:30:00',
  challengeTime: '21:00:00', weeklySummaryTime: '09:00:00',
  quietStart: '22:00:00', quietEnd: '07:00:00'
}, token)
assert.equal(saved.code, 200)
const cfg = await request('/web-push/config', 'GET', undefined, token)
assert.equal(cfg.code, 200)
assert.equal(cfg.data.enabled, true)
assert.ok(cfg.data.vapidPublicKey)

const browser = await chromium.launch({
  channel: process.env.WEBPUSH_QA_BROWSER || 'msedge',
  headless: process.env.WEBPUSH_QA_HEADED !== '1',
  // PushManager requires the browser's background messaging transport.
  ignoreDefaultArgs: ['--disable-background-networking'],
})
const context = await browser.newContext({ baseURL: base,
  permissions: ['notifications'] })
let endpointHash = ''
let eventId = ''
let deliveryVisible = false
try {
  const page = await context.newPage()
  await page.goto(base)
  const result = await page.evaluate(async options => {
    const padded = options.publicKey.replace(/-/g, '+').replace(/_/g, '/')
      .padEnd(Math.ceil(options.publicKey.length / 4) * 4, '=')
    const key = Uint8Array.from(atob(padded), c => c.charCodeAt(0))
    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const currentPermission = Notification.permission
    const pushPermission = await registration.pushManager.permissionState({
      userVisibleOnly: true, applicationServerKey: key.buffer
    })
    let subscription
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: key.buffer
      })
    } catch (error) {
      return { status: 0, endpoint: '', currentPermission, pushPermission,
        error: String(error instanceof Error ? error.message : error).slice(0, 150) }
    }
    const saved = await fetch('/api/v1/web-push/subscriptions', {
      method: 'POST', headers: { 'Content-Type': 'application/json',
        Authorization: 'Bearer ' + options.token },
      body: JSON.stringify({ endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys })
    })
    return { status: saved.status, endpoint: subscription.endpoint }
  }, { token, publicKey: cfg.data.vapidPublicKey })
  console.log('BROWSER_PERMISSION=' + result.currentPermission +
    ' PUSH_PERMISSION=' + result.pushPermission +
    (result.error ? ' ERROR=' + result.error : ''))
  assert.equal(result.status, 200, 'Server rejected PushManager subscription')
  endpointHash = createHash('sha256').update(result.endpoint).digest('hex')
  console.log('PASS SYNTHETIC_BROWSER_VAPID_SUBSCRIPTION')
  await page.close()

  eventId = randomUUID()
  const evt = { eventId, userId, category: 2,
    title: 'Synthetic QA activity', body: 'No real data',
    deepLink: '/activity', deduplicationKey: 'webpushqa-' + marker }
  docker(['exec', project + '-redis-1', 'redis-cli', 'XADD',
    'ldc:worker-events', '*', 'eventId', eventId,
    'eventType', 'NotificationReady.v1', 'payload', JSON.stringify(evt)])
  const receipt = 'ldc:webpush:receipt:' +
    eventId.replaceAll('-', '') + ':' + endpointHash
  assert.ok(await until(async () => docker(['exec',
    project + '-redis-1', 'redis-cli', 'GET', receipt]) === '1'),
  'Web Push gateway did not accept synthetic event')
  console.log('PASS WEB_PUSH_PROVIDER_ACCEPTED_ENCRYPTED_PAYLOAD')

  const reopened = await context.newPage()
  await reopened.goto(base)
  const tag = 'longevity-reminder-' + eventId.replaceAll('-', '')
  deliveryVisible = await until(() => reopened.evaluate(async expected => {
    const reg = await navigator.serviceWorker.ready
    return (await reg.getNotifications()).some(n => n.tag === expected)
  }, tag), 40000)
  console.log('CLOSED_TAB_SERVICE_WORKER_NOTIFICATION=' +
    (deliveryVisible ? 'VERIFIED' : 'NOT_VERIFIED'))
  const revoked = await reopened.evaluate(async key => {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return false
    const response = await fetch('/api/v1/web-push/subscriptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json',
        Authorization: 'Bearer ' + key },
      body: JSON.stringify({ endpoint: sub.endpoint })
    })
    return response.status === 204 && await sub.unsubscribe()
  }, token)
  assert.ok(revoked)
  console.log('PASS BROWSER_WEBPUSH_UNSUBSCRIBE')
  console.log(deliveryVisible ?
    'TRUE_WEBPUSH_BROWSER_CLOSED_TAB_QA=PASS' :
    'WEBPUSH_PROVIDER_PASS_BUT_CLOSED_TAB_VISIBILITY_UNVERIFIED')
} finally {
  await browser.close()
  docker(['exec', project + '-redis-1', 'redis-cli', 'DEL',
    'ldc:webpush:subscriptions:' + userId.replaceAll('-', '')])
  const sql = `SET NOCOUNT ON;
DELETE FROM dbo.IdentityOutbox WHERE UserId='${userId}';
DELETE FROM dbo.Users WHERE Id='${userId}'
AND Email='${address}' AND NormalizedEmail='${address.toUpperCase()}';
GO
`
  docker(['exec', '-i', project + '-sqlserver-1', 'sh', '-lc',
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa ' +
    '-P "$MSSQL_SA_PASSWORD" -C -b -d LongevityDietDb'], sql)
}

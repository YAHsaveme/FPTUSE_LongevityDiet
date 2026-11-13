// Local/GitHub synthetic-only email verification E2E.
// Captures OTP in Mailpit and NEVER logs the code or uses real addresses.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const project = process.env.EMAIL_QA_PROJECT || 'prn232-acceptance';
assert.ok(project === 'prn232-acceptance' ||
  (project === 'longevity-diet' && process.env.GITHUB_ACTIONS === 'true'));
const inspect = spawnSync('docker',
  ['inspect', project + '-api-1'], { encoding: 'utf8' });
assert.equal(inspect.status, 0);
const metadata = JSON.parse(inspect.stdout)[0];
assert.equal(metadata.Config.Labels['com.docker.compose.project'], project);

const email = 'otpqa-' + randomUUID().slice(0, 12) + '@example.test';
const api = 'http://127.0.0.1:8080/api/v1';
const mailpit = 'http://127.0.0.1:18025/api/v1';
async function request(path, method = 'GET', token, payload) {
  const response = await fetch(api + path, {
    method,
    headers: { 'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: payload === undefined ? undefined : JSON.stringify(payload)
  });
  return { status: response.status, body: await response.json() };
}
const registration = await request('/auth/register', 'POST', undefined, {
  email, password: 'SyntheticOtp_Qa1234!', displayName: 'Synthetic OTP QA'
});
assert.equal(registration.status, 201);
const token = registration.body.accessToken;
assert.equal((await request('/email-verification/status', 'GET', token))
  .body.verified, false);
const requested = await request('/email-verification/request', 'POST', token);
assert.equal(requested.status, 202);
assert.equal((await request('/email-verification/request', 'POST', token))
  .status, 429, 'OTP cooldown must prevent repeated sends');

let code = null;
for (let attempt = 0; attempt < 35 && !code; attempt++) {
  const list = await fetch(mailpit + '/messages');
  assert.equal(list.status, 200);
  const messages = (await list.json()).messages ?? [];
  const message = messages.find(m =>
    (m.To || []).some(to => to.Address?.toLowerCase() === email) &&
    String(m.Subject).includes('LongevityDiet'));
  if (message) {
    const details = await fetch(mailpit + '/message/' + message.ID);
    assert.equal(details.status, 200);
    const item = await details.json();
    code = String(item.Text || '').match(/\b\d{6}\b/)?.[0] ?? null;
  }
  if (!code) await new Promise(resolve => setTimeout(resolve, 1500));
}
assert.match(code ?? '', /^\d{6}$/, 'No OTP in synthetic Mailpit inbox');

const wrongCode = code === '000000' ? '000001' : '000000';
assert.equal((await request('/email-verification/confirm', 'POST',
  token, { code: wrongCode })).status, 400);
const verified = await request('/email-verification/confirm', 'POST',
  token, { code });
assert.equal(verified.status, 200);
assert.equal(verified.body.code, 'email_verified');
assert.equal((await request('/email-verification/status',
  'GET', token)).body.verified, true);
assert.equal((await request('/email-verification/confirm',
  'POST', token, { code })).body.code, 'already_verified');
console.log('MAILPIT_SMTP_EMAIL_VERIFICATION=PASS synthetic OTP + cooldown + wrong proof + replay');

import assert from 'node:assert/strict'
import test from 'node:test'
import { getApiErrorMessage } from '../src/lib/apiError.ts'

const httpError = (status, data = {}) => ({
  isAxiosError: true,
  response: { status, data },
})

test('validation problems show the first useful field message', () => {
  assert.equal(
    getApiErrorMessage(httpError(422, { errors: { email: ['Email không đúng.'] } })),
    'Email không đúng.',
  )
})

test('internal 500 detail cannot be leaked to end users', () => {
  const message = getApiErrorMessage(httpError(500, { detail: 'SQL password=secret' }))
  assert.equal(message, 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.')
  assert.doesNotMatch(message, /secret|password/)
})

test('rate limit, forbidden and missing resources have stable messages', () => {
  assert.match(getApiErrorMessage(httpError(429)), /đợi/)
  assert.match(getApiErrorMessage(httpError(403)), /quyền/)
  assert.match(getApiErrorMessage(httpError(404)), /Không tìm thấy/)
})

test('unauthorized login keeps caller-provided credential error', () => {
  assert.equal(
    getApiErrorMessage(httpError(401), 'Email hoặc mật khẩu không đúng.'),
    'Email hoặc mật khẩu không đúng.',
  )
})

test('network failures and timeouts are distinct', () => {
  assert.match(getApiErrorMessage({ isAxiosError: true }), /Không thể kết nối/)
  assert.match(
    getApiErrorMessage({ isAxiosError: true, code: 'ECONNABORTED' }),
    /thời gian chờ/,
  )
})

test('unrecognized errors use the supplied fallback', () => {
  assert.equal(getApiErrorMessage(new Error('oops'), 'Không thể thao tác.'), 'Không thể thao tác.')
})

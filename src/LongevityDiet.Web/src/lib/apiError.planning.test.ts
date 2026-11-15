import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from './apiError'

function apiFailure(status: number, code: string, detail = 'INTERNAL SECRET: do not disclose') {
  return new AxiosError('Failure', 'ERR_BAD_RESPONSE', undefined, undefined, {
    data: { code, detail },
    status,
    statusText: 'Service Unavailable',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

describe('Planner reference data user-facing errors', () => {
  it.each([
    ['planning_rules_unavailable', 'bộ quy tắc đang hoạt động'],
    ['planning_rules_not_effective', 'chưa tới ngày có hiệu lực'],
    ['planning_rules_invalid', 'chưa hợp lệ'],
    ['planning_catalog_empty', 'Danh mục chưa có công thức'],
  ])('renders actionable safe message for %s', (code, expected) => {
    const message = getApiErrorMessage(apiFailure(503, code))
    expect(message).toContain(expected)
    expect(message).not.toContain('INTERNAL SECRET')
  })

  it('does not expose unknown server error messages or use 503 codes from a non-503 status', () => {
    const generic = 'Hệ thống đang gặp sự cố. Vui lòng thử lại sau.'
    expect(getApiErrorMessage(apiFailure(503, 'unknown_private_exception'))).toBe(generic)
    expect(getApiErrorMessage(apiFailure(500, 'planning_catalog_empty'))).toBe(generic)
  })
})

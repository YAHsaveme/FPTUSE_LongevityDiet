import { expect, test } from '@playwright/test'
import { randomUUID } from 'node:crypto'

// Explicit opt-in: only the QA environment created for the PRN232 Docker demo.
// This test must never run against a live external account or production database.
test('Admin Web can list, filter, disable and re-enable a synthetic Member', async ({ page, request }) => {
  test.skip(
    process.env.PRN232_MEMBER_ADMIN_E2E !== '1' ||
      !process.env.PRN232_ADMIN_QA_EMAIL ||
      !process.env.PRN232_ADMIN_QA_PASSWORD,
    'Requires isolated local QA and explicitly provided QA Admin credentials',
  )
  test.setTimeout(120_000)
  const email = 'qa-member-management-' + randomUUID().replaceAll('-', '') + '@example.test'
  const password = 'StrongDemo12345'
  const registered = await request.post('/api/v1/auth/register', {
    data: { email, password, displayName: 'Member thử nghiệm quản trị' },
  })
  expect(registered.status()).toBe(201)
  const member = await registered.json() as { user: { id: string }; accessToken: string }
  const memberId = member.user.id

  // Only synthetic Member bearer and QA Admin credentials are used.
  await page.goto('/login')
  await page.locator('input[name="email"]').fill(process.env.PRN232_ADMIN_QA_EMAIL!)
  await page.locator('input[name="password"]').fill(process.env.PRN232_ADMIN_QA_PASSWORD!)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/\/app$/, { timeout: 12000 })
  await page.goto('/admin/members')
  await expect(page.getByRole('heading', { name: 'Quản lý tài khoản Member' })).toBeVisible()

  await page.getByLabel('Tìm Member').fill(email)
  await expect(page.locator('.members-table-wrap').getByText(email)).toBeVisible()
  await page.getByLabel('Sắp xếp Member theo').selectOption('email')
  await page.getByLabel('Thứ tự sắp xếp Member').selectOption('asc')
  await page.getByLabel('Số Member mỗi trang').selectOption('10')
  await page.getByLabel('Lọc xác minh email').selectOption('unverified')
  await expect(page.locator('.members-table-wrap').getByText(email)).toBeVisible()
  await expect(page.locator('.members-facts')).toContainText('Member')
  await expect(page.locator('.members-facts')).not.toContainText('dị ứng')

  // The existing Member token must not have access to any Admin endpoint.
  const forbidden = await request.get('/api/v1/admin/members', {
    headers: { Authorization: 'Bearer ' + member.accessToken },
  })
  expect(forbidden.status()).toBe(403)

  await page.getByRole('button', { name: 'Khóa tài khoản' }).click()
  await page.getByLabel('Lý do thay đổi trạng thái').fill('Tài khoản synthetic QA kiểm chứng khóa')
  await page.getByRole('button', { name: 'Xác nhận' }).click()
  await expect(page.locator('.members-facts')).toContainText('Đã khóa')
  const locked = await request.get('/api/v1/profile', {
    headers: { Authorization: 'Bearer ' + member.accessToken },
  })
  expect(locked.status()).toBe(401)

  await page.getByRole('button', { name: 'Mở khóa tài khoản' }).click()
  await page.getByLabel('Lý do thay đổi trạng thái').fill('Tài khoản synthetic QA được mở lại')
  await page.getByRole('button', { name: 'Xác nhận' }).click()
  await expect(page.locator('.members-facts')).toContainText('Đang hoạt động')
  await expect(page.locator('.members-history')).toContainText('Tài khoản synthetic QA')

  // Unlock never revalidates an already-revoked access token.
  const stale = await request.get('/api/v1/profile', {
    headers: { Authorization: 'Bearer ' + member.accessToken },
  })
  expect(stale.status()).toBe(401)
  const fresh = await request.post('/api/v1/auth/login', {
    data: { email, password },
  })
  expect(fresh.status()).toBe(200)
  const renewed = await fresh.json() as { accessToken: string }
  const status = await request.get('/api/v1/admin/members/' + memberId, {
    headers: { Authorization: 'Bearer ' + renewed.accessToken },
  })
  expect(status.status()).toBe(403)
})

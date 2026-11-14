import { expect, test } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'

/**
 * Chỉ chạy khi ADMIN_VI_LIVE_UI=1: tạo Admin tổng hợp trong Docker demo
 * riêng biệt. Không đụng tài khoản và cơ sở dữ liệu khác.
 */
test('Admin tiếng Việt: xem ba tab, thêm sửa và ngừng sử dụng thực phẩm tổng hợp', async ({ page }, info) => {
  test.skip(process.env.ADMIN_VI_LIVE_UI !== '1', 'Chỉ chạy khi đã bật nghiệm thu Admin QA Docker')
  test.setTimeout(220_000)

  const root = resolve(__dirname, '..', '..', '..')
  const inspect = JSON.parse(execFileSync('docker', ['inspect', 'longevity-diet-sqlserver-1'], {
    encoding: 'utf8', windowsHide: true,
  })) as Array<{
    Config: { Labels: Record<string, string> },
    Mounts: Array<{ Name?: string }>,
    State: { Running: boolean },
  }>
  const container = inspect[0]
  expect(container.Config.Labels['com.docker.compose.project']).toBe('longevity-diet')
  expect(container.Mounts.some(m => m.Name === 'longevity-gemini-demo-sql-data')).toBe(true)
  expect(container.State.Running).toBe(true)

  const env = readFileSync(resolve(root, '.env'), 'utf8')
  const sqlPassword = env.match(/^MSSQL_SA_PASSWORD=(.+)$/m)?.[1]?.trim()
  expect(sqlPassword?.length).toBeGreaterThan(8)
  const suffix = randomUUID().replaceAll('-', '')
  const email = 'prn232-admin-vi-' + suffix + '@example.test'
  const password = 'QAa!' + randomUUID().replaceAll('-', '')
  const title = 'Thực phẩm QA tiếng Việt ' + suffix.slice(0, 8)

  await page.goto('/register')
  await page.locator('input[name="displayName"]').fill('Quản trị viên kiểm thử')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('input[name="confirmPassword"]').fill(password)
  // Chờ rate-limit localhost nếu một bộ E2E khác vừa tạo nhiều tài khoản QA.
  let registered = false
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
    registered = await page.waitForURL(/\/onboarding$/, { timeout: 5000 })
      .then(() => true).catch(() => false)
    if (registered) break
    await expect(page.getByText(/Bạn thao tác quá nhanh/)).toBeVisible()
    await page.waitForTimeout(25_000)
  }
  expect(registered).toBe(true)
  await expect(page).toHaveURL(/\/onboarding$/)
  await page.locator('input[name="birthYear"]').fill('1995')
  await page.locator('input[name="wakeTime"]').fill('06:30')
  await page.locator('input[name="sleepTime"]').fill('23:00')
  await page.locator('select[name="preferredMealFrequency"]').selectOption('3')
  await page.locator('textarea[name="foodPreference"]').fill('Đồ ăn Việt Nam, tài khoản kiểm thử')
  await page.getByRole('button', { name: 'Hoàn tất thiết lập' }).click()
  await expect(page).toHaveURL(/\/app$/)
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/login$/)

  if (!/^prn232-admin-vi-[a-f0-9]{32}@example\.test$/.test(email)) {
    throw new Error('Mẫu email tổng hợp không hợp lệ; dừng cập nhật SQL')
  }
  const sql = "SET NOCOUNT ON; UPDATE [LongevityDietDb].[dbo].[Users] SET [Role]='Admin' " +
    "WHERE [Email]='" + email + "' AND [Role]='Member'; " +
    "IF @@ROWCOUNT <> 1 THROW 51000,'QA elevation must affect exactly one synthetic account',1;"
  execFileSync('docker', [
    'exec', 'longevity-diet-sqlserver-1', '/opt/mssql-tools18/bin/sqlcmd',
    '-b', '-S', 'localhost', '-U', 'sa', '-P', sqlPassword!, '-C', '-Q', sql,
  ], { encoding: 'utf8', windowsHide: true })

  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/\/app$/)
  await page.goto('/admin/catalog')

  await expect(page.getByRole('heading', { name: /Quản lý dữ liệu/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Thực phẩm', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Công thức', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Quy tắc', exact: true })).toBeVisible()
  await expect(page.getByText('Foods', { exact: true })).toHaveCount(0)
  await page.screenshot({ path: info.outputPath('admin-thuc-pham-vi.png'), fullPage: true })

  await page.getByLabel('Tên', { exact: true }).fill(title)
  await page.getByLabel('Danh mục', { exact: true }).fill('Nguyên liệu thử nghiệm')
  await page.getByLabel('Thẻ phân loại').fill('Dữ liệu kiểm thử')
  await page.getByLabel('Năng lượng (kcal)').fill('100')
  await page.getByLabel('Chất đạm (g)').fill('4')
  await page.getByLabel('Tinh bột (g)').fill('15')
  await page.getByLabel('Chất béo (g)', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Thêm thực phẩm', exact: true }).click()
  await expect(page.getByText('Đã thêm thực phẩm.')).toBeVisible()
  const item = page.locator('.admin-item').filter({ hasText: title })
  await expect(item).toBeVisible()

  await item.getByRole('button', { name: 'Sửa' }).click()
  await page.getByLabel('Tên', { exact: true }).fill(title + ' đã sửa')
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.getByText('Đã cập nhật thực phẩm.')).toBeVisible()
  const changed = page.locator('.admin-item').filter({ hasText: title + ' đã sửa' })
  await expect(changed).toBeVisible()
  await changed.getByRole('button', { name: 'Ngừng sử dụng' }).click()
  await expect(page.getByText(/Đã ngừng sử dụng thực phẩm/)).toBeVisible()

  await page.getByRole('button', { name: 'Công thức', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Nguyên liệu cấu thành món ăn' })).toBeVisible()
  await expect(page.getByText('Thời gian chuẩn bị (phút)')).toBeVisible()
  await page.screenshot({ path: info.outputPath('admin-cong-thuc-vi.png'), fullPage: true })

  await page.getByRole('button', { name: 'Quy tắc', exact: true }).click()
  await expect(page.getByText('Danh sách chờ duyệt về an toàn')).toBeVisible()
  await expect(page.getByText('Loại nguồn', { exact: true })).toBeVisible()
  await page.screenshot({ path: info.outputPath('admin-quy-tac-vi.png'), fullPage: true })
})

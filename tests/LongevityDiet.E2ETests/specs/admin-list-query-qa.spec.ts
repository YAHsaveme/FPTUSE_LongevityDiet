import { expect, test } from '@playwright/test'
import { execFileSync, spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'

// Explicit opt-in: only the separate PRN232 list-QA Docker project and its private volume.
// No real account, default Docker demo, or external email provider may be modified.
test('isolated Admin can filter, sort, paginate and soft-disable synthetic foods', async ({ page }, info) => {
  test.skip(process.env.PRN232_LIST_QA_ADMIN !== '1', 'Requires explicitly isolated local QA DB')
  test.setTimeout(150_000)

  const container = 'prn232-list-qa-sqlserver-1'
  const inspect = JSON.parse(execFileSync('docker', ['inspect', container], {
    encoding: 'utf8', windowsHide: true,
  })) as Array<{
    Config: { Labels: Record<string, string> }
    Mounts: Array<{ Name?: string }>
    State: { Running: boolean }
  }>
  expect(inspect[0].Config.Labels['com.docker.compose.project']).toBe('prn232-list-qa')
  expect(inspect[0].Mounts.some(m => m.Name === 'prn232-list-qa-sqlserver-data')).toBe(true)
  expect(inspect[0].State.Running).toBe(true)

  const suffix = randomUUID().replaceAll('-', '')
  const email = 'list-admin-qa-' + suffix + '@example.test'
  const password = 'QAa!AdminList12345'
  const foodName = 'Test Admin List ' + suffix.slice(0, 8)
  await page.goto('/register')
  await page.locator('input[name="displayName"]').fill('Synthetic QA Administrator')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('input[name="confirmPassword"]').fill(password)
  let registered = false
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
    registered = await page.waitForURL(/\/onboarding$/, { timeout: 5000 })
      .then(() => true).catch(() => false)
    if (registered) break
    await page.waitForTimeout(26_000)
  }
  expect(registered).toBe(true)
  await page.locator('input[name="birthYear"]').fill('1996')
  await page.locator('input[name="wakeTime"]').fill('06:30')
  await page.locator('input[name="sleepTime"]').fill('23:00')
  await page.locator('select[name="preferredMealFrequency"]').selectOption('3')
  await page.locator('textarea[name="foodPreference"]').fill('Synthetic admin test only')
  await page.getByRole('button', { name: 'Hoàn tất thiết lập' }).click()
  await expect(page).toHaveURL(/\/app$/)
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/login$/)

  expect(email).toMatch(/^list-admin-qa-[a-f0-9]{32}@example\.test$/)
  const sql = 'SET ANSI_NULLS ON; SET ANSI_PADDING ON; SET ANSI_WARNINGS ON; ' +
    'SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; ' +
    'SET QUOTED_IDENTIFIER ON; SET NUMERIC_ROUNDABORT OFF;\n' +
    "UPDATE dbo.Users SET Role='Admin' WHERE Email='" + email + "' AND Role='Member';\n" +
    "IF @@ROWCOUNT <> 1 THROW 51000,'Synthetic QA elevation must affect exactly one member',1;\nGO\n"
  const promote = spawnSync('docker', ['exec', '-i', container, 'sh', '-lc',
    '/opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$MSSQL_SA_PASSWORD" -C -b -d LongevityDietDb'],
  { encoding: 'utf8', input: sql, timeout: 30000, windowsHide: true })
  expect(promote.status, (promote.stderr || promote.stdout || '').slice(0, 200)).toBe(0)

  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page).toHaveURL(/\/app$/)
  await page.goto('/admin/catalog')
  await expect(page.getByRole('heading', { name: /Quản lý dữ liệu/ })).toBeVisible()

  const inactiveResponse = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.pathname.endsWith('/api/v1/admin/foods') && url.searchParams.get('isActive') === 'false'
  })
  await page.getByLabel('Lọc trạng thái').selectOption('inactive')
  expect((await inactiveResponse).status()).toBe(200)
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click()
  await page.getByLabel('Trường sắp xếp').selectOption('calories')
  await page.getByLabel('Thứ tự sắp xếp').selectOption('desc')
  await page.getByLabel('Số dòng mỗi trang').selectOption('10')
  await expect(page.getByText(/Trang 1\//)).toBeVisible()
  await page.screenshot({ path: info.outputPath('food-filter-qa.png'), fullPage: true })

  await page.getByLabel('Tên', { exact: true }).fill(foodName)
  await page.getByLabel('Danh mục', { exact: true }).fill('Synthetic QA')
  await page.getByLabel('Thẻ phân loại').fill('Synthetic')
  await page.getByLabel('Năng lượng (kcal)').fill('100')
  await page.getByLabel('Chất đạm (g)').fill('4')
  await page.getByLabel('Tinh bột (g)').fill('15')
  await page.getByLabel('Chất béo (g)', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Thêm thực phẩm', exact: true }).click()
  await expect(page.getByText('Đã thêm thực phẩm.')).toBeVisible()
  const item = page.locator('.admin-item').filter({ hasText: foodName })
  await expect(item).toBeVisible()
  await item.getByRole('button', { name: 'Ngừng sử dụng' }).click()
  await expect(page.getByText(/Đã ngừng sử dụng thực phẩm/)).toBeVisible()
  await page.getByLabel('Lọc trạng thái').selectOption('inactive')
  await expect(page.locator('.admin-item').filter({ hasText: foodName })).toBeVisible()

  await page.getByRole('button', { name: 'Công thức', exact: true }).click()
  await expect(page.getByLabel('Trường sắp xếp')).toBeVisible()
  await page.getByLabel('Trường sắp xếp').selectOption('prepMinutes')
  await page.getByLabel('Số dòng mỗi trang').selectOption('20')
  await page.screenshot({ path: info.outputPath('recipe-sort-qa.png'), fullPage: true })
})

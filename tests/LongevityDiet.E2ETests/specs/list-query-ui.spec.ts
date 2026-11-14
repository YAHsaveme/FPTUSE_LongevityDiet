import { expect, test } from '@playwright/test'

// Real browser -> REST -> isolated QA SQL Server. Only synthetic records are created.
test('member history browsers expose working filters and pagination', async ({ page }) => {
  test.setTimeout(150_000)
  const suffix = Date.now().toString() + Math.random().toString(36).slice(2, 8)
  const email = 'list-browser-' + suffix + '@example.test'
  const password = 'Qa!ListBrowser12345'

  await page.goto('/register')
  await page.locator('input[name="displayName"]').fill('List Query QA')
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
  await page.locator('input[name="birthYear"]').fill('1997')
  await page.locator('input[name="wakeTime"]').fill('06:30')
  await page.locator('input[name="sleepTime"]').fill('23:00')
  await page.locator('select[name="preferredMealFrequency"]').selectOption('3')
  await page.locator('textarea[name="foodPreference"]').fill('QA list data, no real personal data')
  await page.getByRole('button', { name: 'Hoàn tất thiết lập' }).click()
  await expect(page).toHaveURL(/\/app$/)

  const login = await page.request.post('/api/v1/auth/login', { data: { email, password } })
  expect(login.status()).toBe(200)
  const token = (await login.json() as { accessToken: string }).accessToken
  const headers = { Authorization: 'Bearer ' + token }
  const screening = await page.request.put('/api/v1/wellness/screening', {
    headers,
    data: { riskFlags: [], allergiesReviewed: true, allergies: [] },
  })
  expect(screening.status()).toBe(200)
  const generated = await page.request.post('/api/v1/meal-plans/generate', {
    headers, data: { days: 7, useAi: false },
  })
  expect(generated.status()).toBe(201)

  await page.goto('/planner')
  const plans = page.getByRole('region', { name: 'Lịch sử thực đơn' })
  await expect(plans).toBeVisible()
  await plans.getByRole('button', { name: 'Mở lịch sử' }).click()
  await expect(plans.locator('.history-browser-item').first()).toBeVisible({ timeout: 20000 })
  await plans.getByLabel('Số dòng lịch sử').selectOption('20')
  await expect(plans.getByText(/bản ghi · Trang/)).toBeVisible()
  await plans.getByLabel('Lọc trạng thái lịch sử').selectOption('Archived')
  await expect(plans.getByText('Không tìm thấy dữ liệu phù hợp.')).toBeVisible()
  await plans.getByRole('button', { name: 'Xóa bộ lọc' }).click()
  await expect(plans.locator('.history-browser-item').first()).toBeVisible()

  const mealLogs = page.getByRole('region', { name: 'Toàn bộ nhật ký bữa ăn' })
  await mealLogs.getByRole('button', { name: 'Mở lịch sử' }).click()
  await expect(mealLogs.getByText('Không tìm thấy dữ liệu phù hợp.')).toBeVisible()
  await mealLogs.getByLabel('Lọc loại bữa').selectOption('Lunch')
  await expect(mealLogs.getByText('Không tìm thấy dữ liệu phù hợp.')).toBeVisible()

  const activityCreate = await page.request.post('/api/v1/activities', {
    headers, data: {
      kind: 1, startedAt: new Date(Date.now() - 60_000).toISOString(),
      durationMinutes: 16, note: 'SyntheticWalk List QA',
    },
  })
  expect(activityCreate.status()).toBe(201)
  await page.goto('/activity')
  await expect(page.getByText('Tổng cộng 1 hoạt động.')).toBeVisible()
  await page.getByLabel('Tìm ghi chú vận động').fill('SyntheticWalk')
  await page.getByLabel('Lọc loại vận động').selectOption('1')
  await page.getByLabel('Sắp xếp vận động').selectOption('durationMinutes')
  await expect(page.getByText('SyntheticWalk List QA')).toBeVisible()
  await page.getByLabel('Số hoạt động mỗi trang').selectOption('20')
  await expect(page.getByText('Tổng cộng 1 hoạt động.')).toBeVisible()

  await page.goto('/notifications')
  await expect(page.getByLabel('Lọc trạng thái đã đọc')).toBeVisible()
  await page.getByLabel('Lọc trạng thái đã đọc').selectOption('unread')
  await page.getByLabel('Sắp xếp thông báo').selectOption('title')
  await page.getByLabel('Số thông báo mỗi trang').selectOption('20')
  await expect(page.getByText(/Tổng cộng \d+ thông báo/)).toBeVisible()
})

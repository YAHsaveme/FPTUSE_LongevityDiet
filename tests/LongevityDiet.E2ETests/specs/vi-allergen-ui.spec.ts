import { expect, test } from '@playwright/test'

test('Nhập dị ứng tiếng Việt và không bỏ qua dị ứng chưa nhận diện trên giao diện thật', async ({ page }) => {
  test.setTimeout(180_000)
  const stamp = Date.now()
  const email = 'prn232-allergen-vi-' + stamp + '@example.test'
  const password = 'QAa!SafeScreening2026'

  await page.goto('/register')
  await page.locator('input[name="displayName"]').fill('Hồ sơ sàng lọc QA')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('input[name="confirmPassword"]').fill(password)
  // QA không vô hiệu hóa rate-limit: nếu các bài E2E trước đã dùng hết hạn mức
  // đăng ký từ cùng localhost, chờ phục hồi và thử lại trên chính giao diện.
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
  await page.locator('input[name="birthYear"]').fill('1994')
  await page.locator('input[name="wakeTime"]').fill('06:30')
  await page.locator('input[name="sleepTime"]').fill('23:00')
  await page.locator('select[name="preferredMealFrequency"]').selectOption('3')
  await page.locator('textarea[name="foodPreference"]').fill('Dữ liệu tổng hợp cho kiểm thử tiếng Việt')
  await page.getByRole('button', { name: 'Hoàn tất thiết lập' }).click()
  await expect(page).toHaveURL(/\/app$/)

  const screening = page.locator('#wellness-journey')
  await expect(screening.getByRole('heading', { name: /Kiểm tra nhóm đối tượng/ })).toBeVisible()
  const allergies = screening.locator('input.plain-input').first()
  const save = screening.getByRole('button', { name: 'Lưu sàng lọc an toàn' })
  await allergies.fill('đậu phộng, hạt bí')
  await expect(screening.getByRole('alert')).toContainText('hạt bí')
  await expect(save).toBeDisabled()
  await screening.getByLabel('Tôm / cua').check()
  await expect(screening.getByRole('alert')).toContainText('hạt bí')
  await expect(save).toBeDisabled()

  await allergies.fill('đậu phộng, tôm, đậu nành')
  await expect(save).toBeEnabled()
  await screening.getByLabel(/Tôi đã rà soát cả dị ứng/).check()
  await save.click()
  await expect(screening.getByText('Chưa nhận diện được:', { exact: false })).toHaveCount(0)

  const login = await page.request.post('/api/v1/auth/login', { data: { email, password } })
  expect(login.status()).toBe(200)
  const session = await login.json() as { accessToken: string }
  await expect.poll(async () => {
    const response = await page.request.get('/api/v1/wellness/overview', {
      headers: { Authorization: 'Bearer ' + session.accessToken },
    })
    if (!response.ok()) return ''
    const overview = await response.json() as { allergies: string[] }
    return overview.allergies.slice().sort().join(',')
  }, { timeout: 15000 }).toBe('peanut,shellfish,soy')
  await page.reload()
  await expect(screening.getByText('Đậu phộng', { exact: false }).first()).toBeVisible()
})

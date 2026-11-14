import { expect, test } from '@playwright/test'

// Real Google API calls are opt-in. GitHub CI must never need an operator key.
// Execute only on the localhost Docker Desktop demo with GEMINI_LIVE_UI=1.
test('Docker Desktop: choose Gemini in browser and persist 7-day AI menu', async ({ page }) => {
  test.skip(process.env.GEMINI_LIVE_UI !== '1', 'Requires an explicitly enabled local live Gemini demo')
  test.setTimeout(120_000)
  const id = Date.now().toString()
  const email = `gemini-ui-qa-${id}@example.test`
  const password = 'Qa!GeminiMenu12345'

  await page.goto('/register')
  await page.locator('input[name="displayName"]').fill('Gemini UI QA')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('input[name="confirmPassword"]').fill(password)
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
  await expect(page).toHaveURL(/\/onboarding$/)
  await page.locator('input[name="birthYear"]').fill('1996')
  await page.locator('input[name="wakeTime"]').fill('06:30')
  await page.locator('input[name="sleepTime"]').fill('23:00')
  await page.locator('select[name="preferredMealFrequency"]').selectOption('3')
  await page.locator('textarea[name="foodPreference"]').fill('Synthetic Gemini UI QA')
  await page.getByRole('button', { name: 'Hoàn tất thiết lập' }).click()
  await expect(page).toHaveURL(/\/app$/)

  const login = await page.request.post('/api/v1/auth/login', { data: { email, password } })
  expect(login.status()).toBe(200)
  const token = (await login.json() as { accessToken: string }).accessToken
  const headers = { Authorization: `Bearer ${token}` }
  const screened = await page.request.put('/api/v1/wellness/screening', {
    headers, data: { riskFlags: [], allergiesReviewed: true, allergies: [] },
  })
  expect(screened.status()).toBe(200)

  await page.goto('/planner')
  await expect(page.getByText('Gemini API', { exact: false }).first()).toBeVisible()
  const aiToggle = page.getByLabel('Dùng AI chọn món từ danh mục an toàn')
  await expect(aiToggle).toBeEnabled()
  await aiToggle.check()
  await expect(aiToggle).toBeChecked()
  await page.getByRole('button', { name: /Tạo kế hoạch 7 ngày/ }).click()
  await expect(page.getByText(/Đã tạo kế hoạch 7 ngày/)).toBeVisible({ timeout: 90_000 })

  const saved = await page.request.get('/api/v1/meal-plans/current', { headers })
  expect(saved.status()).toBe(200)
  const plan = await saved.json() as {
    id: string, days: { meals: { candidateCode: string, caloriesKcal: number }[] }[],
    planExplanation: string
  }
  expect(plan.id).toBeTruthy()
  expect(plan.days).toHaveLength(7)
  expect(plan.days.flatMap(day => day.meals)).toHaveLength(21)
  expect(plan.planExplanation).toContain('AI đã hỗ trợ')
  expect(plan.days.every(day => day.meals.every(meal =>
    meal.candidateCode.length > 0 && meal.caloriesKcal > 0))).toBeTruthy()
  await expect(page.locator('section.meal-editor')).toBeVisible()
})

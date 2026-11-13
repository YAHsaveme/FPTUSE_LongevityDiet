import { expect, test } from '@playwright/test'

// An isolated QA account exercises the new React editor against the real
// API, SQL Server and authentication system. Never point this at production.
test('member can CRUD scheduled meals and archive a plan using the actual Web UI', async ({ page }) => {
  test.setTimeout(120_000)
  const id = Date.now().toString()
  const email = `planner-crud-${id}@example.test`
  const password = 'Qa!PlannerMenu12345'

  await page.goto('/register')
  await page.locator('input[name="displayName"]').fill('Planner CRUD QA')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('input[name="confirmPassword"]').fill(password)
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
  await expect(page).toHaveURL(/\/onboarding$/)
  await page.locator('input[name="birthYear"]').fill('1996')
  await page.locator('input[name="wakeTime"]').fill('06:30')
  await page.locator('input[name="sleepTime"]').fill('23:00')
  await page.locator('select[name="preferredMealFrequency"]').selectOption('3')
  await page.locator('textarea[name="foodPreference"]').fill('Synthetic menu CRUD verification')
  await page.getByRole('button', { name: 'Hoàn tất thiết lập' }).click()
  await expect(page).toHaveURL(/\/app$/)

  const login = await page.request.post('/api/v1/auth/login', { data: { email, password } })
  expect(login.status()).toBe(200)
  const token = (await login.json() as { accessToken: string }).accessToken
  const headers = { Authorization: `Bearer ${token}` }
  const screened = await page.request.put('/api/v1/wellness/screening', {
    headers,
    data: { riskFlags: [], allergiesReviewed: true, allergies: [] },
  })
  expect(screened.status()).toBe(200)

  await page.goto('/planner')
  await expect(page.getByText('Mô hình AI chưa được cấu hình.', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Dùng AI chọn món từ danh mục an toàn')).toBeDisabled()
  await page.getByRole('button', { name: /Tạo kế hoạch 7 ngày/ }).click()
  await expect(page.getByText(/Đã tạo kế hoạch 7 ngày/)).toBeVisible({ timeout: 20000 })

  const current = await page.request.get('/api/v1/meal-plans/current', { headers })
  expect(current.status()).toBe(200)
  const plan = await current.json() as {
    id: string, days: { id: string, meals: { id: string, slotType: string, plannedTime: string }[] }[]
  }
  expect(plan.days[0].meals).toHaveLength(3)

  const editor = page.locator('section.meal-editor')
  await expect(editor.getByRole('heading', { name: /Quản lý bữa ăn ngày/ })).toBeVisible()
  await editor.getByRole('button', { name: 'Thêm bữa ăn' }).click()
  const options = editor.locator('select').last().locator('option:not([value=""])')
  await expect(options.first()).toBeAttached()
  const chosen = await options.first().getAttribute('value')
  expect(chosen).toBeTruthy()
  await editor.locator('select').last().selectOption(chosen!)
  await editor.getByRole('button', { name: 'Thêm vào thực đơn' }).click()
  await expect(editor.getByRole('status')).toContainText('Đã thêm bữa ăn')
  const afterAdd = await page.request.get('/api/v1/meal-plans/current', { headers })
  const added = await afterAdd.json() as typeof plan
  const snack = added.days[0].meals.find(meal => meal.slotType === 'Snack')
  expect(snack).toBeDefined()
  expect(added.days[0].meals).toHaveLength(4)

  await editor.getByRole('button', { name: 'Sửa ' + (await editor.locator('.meal-editor-row').last().locator('strong').textContent()) }).click()
  await editor.locator('input[type="time"]').fill('15:30')
  await editor.getByRole('button', { name: 'Lưu chỉnh sửa' }).click()
  await expect(editor.getByRole('status')).toContainText('Đã cập nhật bữa ăn')
  const afterEdit = await page.request.get('/api/v1/meal-plans/current', { headers })
  const edited = await afterEdit.json() as typeof plan
  expect(edited.days[0].meals.find(meal => meal.id === snack!.id)?.plannedTime).toMatch(/^15:30/)

  await editor.getByRole('button', { name: /^Xóa / }).last().click()
  await editor.getByRole('button', { name: 'Xác nhận xóa' }).click()
  await expect(editor.getByRole('status')).toContainText('Đã xóa bữa ăn')
  const afterDelete = await page.request.get('/api/v1/meal-plans/current', { headers })
  const reduced = await afterDelete.json() as typeof plan
  expect(reduced.days[0].meals).toHaveLength(3)

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(editor).toBeVisible()
  const mobileWidth = await page.evaluate(() => ({
    viewport: window.innerWidth, document: document.documentElement.scrollWidth,
  }))
  expect(mobileWidth.document).toBeLessThanOrEqual(mobileWidth.viewport + 1)

  await editor.getByRole('button', { name: 'Lưu trữ thực đơn' }).click()
  await editor.getByRole('button', { name: 'Xác nhận lưu trữ' }).click()
  await expect(page.getByText('Đã lưu trữ thực đơn.', { exact: false })).toBeVisible()
  const archived = await page.request.get('/api/v1/meal-plans/current', { headers })
  expect(archived.status()).toBe(404)
})

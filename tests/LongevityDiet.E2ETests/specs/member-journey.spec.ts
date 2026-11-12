import { expect, test } from '@playwright/test'

// Full UI-to-SQL business journey. Only the local isolated Docker QA project
// should serve the browser; synthetic identities are never production users.
test('member can complete catalog, planning, activity, challenge, report and reminder journeys', async ({ page }) => {
  const id = Date.now().toString()
  const email = `journey-${id}@example.test`
  const password = 'Qa!Journey123456'
  const displayName = 'Journey QA Member'

  await test.step('Register and complete onboarding in the browser', async () => {
    await page.goto('/register')
    expect(['localhost', '127.0.0.1']).toContain(new URL(page.url()).hostname)
    await page.locator('input[name="displayName"]').fill(displayName)
    await page.locator('input[name="email"]').fill(email)
    await page.locator('input[name="password"]').fill(password)
    await page.locator('input[name="confirmPassword"]').fill(password)
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
    await expect(page).toHaveURL(/\/onboarding$/)
    await page.locator('input[name="birthYear"]').fill('1997')
    await page.locator('input[name="wakeTime"]').fill('06:30')
    await page.locator('input[name="sleepTime"]').fill('23:00')
    await page.locator('select[name="preferredMealFrequency"]').selectOption('3')
    await page.locator('textarea[name="foodPreference"]').fill('Synthetic plant-forward QA')
    await page.getByRole('button', { name: 'Hoàn tất thiết lập' }).click()
    await expect(page).toHaveURL(/\/app$/)
  })

  // For the allergy safety gate, use the same real API behind the Web/Gateway;
  // auth credentials remain synthetic and are never printed in test output.
  const login = await page.request.post('/api/v1/auth/login', {
    data: { email, password },
  })
  expect(login.status()).toBe(200)
  const session = await login.json() as { accessToken: string }
  const headers = { Authorization: `Bearer ${session.accessToken}` }
  const screening = await page.request.put('/api/v1/wellness/screening', {
    headers,
    data: { riskFlags: [], allergiesReviewed: true, allergies: ['peanut'] },
  })
  expect(screening.status()).toBe(200)

  await test.step('Catalog food search, recipes and published rules', async () => {
    await page.goto('/catalog')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Khám phá thực phẩm')
    await expect(page.locator('.catalog-card').first()).toBeVisible()
    await page.getByPlaceholder('Tìm thực phẩm...').fill('no-match-synthetic-xyz-123')
    await expect(page.getByText('Không có dữ liệu phù hợp với bộ lọc hiện tại.')).toBeVisible()
    await page.getByRole('button', { name: 'Công thức' }).click()
    await expect(page.locator('.recipe-card-link').first()).toBeVisible()
    await page.locator('.recipe-card-link').first().click()
    await expect(page).toHaveURL(/\/catalog\/recipes\//)
    await expect(page.getByRole('heading', { name: 'Nguyên liệu' })).toBeVisible()
    await page.goto('/catalog')
    await page.getByRole('button', { name: 'Nguyên tắc' }).click()
    await expect(page.locator('.rule-card').first()).toBeVisible()
  })

  await test.step('Planner generates a seven-day rule-based meal plan after allergy screening', async () => {
    await page.goto('/planner')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.getByRole('button', { name: /Tạo kế hoạch 7 ngày/ }).click()
    await expect(page.getByText(/Đã tạo kế hoạch 7 ngày/)).toBeVisible({ timeout: 20000 })
    const current = await page.request.get('/api/v1/meal-plans/current', { headers })
    expect(current.status()).toBe(200)
    const plan = await current.json() as { days: { meals: { allergens: string[] }[] }[] }
    expect(plan.days).toHaveLength(7)
    expect(plan.days.flatMap((day) => day.meals).every((meal) =>
      !meal.allergens.map((allergen) => allergen.toLowerCase()).includes('peanut'))).toBe(true)
  })

  await test.step('Meal logs persist and the eating-window / LDAS read models respond', async () => {
    const datePieces = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const part = (type: string) => datePieces.find((item) => item.type === type)?.value ?? ''
    const localDate = `${part('year')}-${part('month')}-${part('day')}`

    for (const [mealType, time] of [
      ['Breakfast', '08:00'], ['Lunch', '12:00'], ['Dinner', '18:00'],
    ]) {
      const meal = await page.request.post('/api/v1/meal-logs', {
        headers,
        data: {
          eatenAt: new Date(`${localDate}T${time}:00+07:00`).toISOString(),
          mealType,
          title: `Synthetic Journey ${mealType}`,
          notes: 'Isolated QA nutrition values; not medical recommendations',
          items: [{
            foodCode: null, foodName: 'Synthetic QA food', servingAmount: 100,
            servingUnit: 'g', caloriesKcal: 100, proteinGrams: 5,
            carbsGrams: 10, fatGrams: 2, fiberGrams: 3, isPlantBased: true,
          }],
        },
      })
      expect(meal.status(), `Meal logging: ${mealType}`).toBe(201)
    }
    const summary = await page.request.get('/api/v1/eating-window/summary', {
      headers, params: { date: localDate },
    })
    expect(summary.status()).toBe(200)
    const window = await summary.json() as { loggedMealCount: number }
    expect(window.loggedMealCount).toBeGreaterThanOrEqual(3)

    const ldas = await page.request.get(`/api/v1/ldas/${localDate}`, { headers })
    expect(ldas.status()).toBe(200)
    const score = await ldas.json() as { missingData: string[] }
    expect(score.missingData).not.toContain('meals')
  })

  await test.step('FMD high-risk screening is enforced by the backend', async () => {
    const content = await page.request.get('/api/v1/fmd/education')
    expect(content.status()).toBe(200)
    const education = await content.json() as {
      screeningQuestions: { questionId: string; isHighRiskIfTrue: boolean }[]
    }
    const answers: Record<string, boolean> = {}
    for (const question of education.screeningQuestions) answers[question.questionId] = false
    const highRisk = education.screeningQuestions.find((question) => question.isHighRiskIfTrue)
    expect(highRisk).toBeDefined()
    answers[highRisk!.questionId] = true

    const ack = await page.request.post('/api/v1/fmd/education/acknowledge', { headers, data: {} })
    expect(ack.ok()).toBe(true)
    const assessment = await page.request.post('/api/v1/fmd/safety/assessment', {
      headers, data: { answers, notes: 'Synthetic high-risk QA only' },
    })
    expect(assessment.status()).toBe(200)
    const safety = await assessment.json() as { requiresProfessionalReview: boolean }
    expect(safety.requiresProfessionalReview).toBe(true)
    const forbidden = await page.request.post('/api/v1/fmd/cycles', { headers, data: {} })
    expect(forbidden.status()).toBe(422)
  })

  await test.step('Activity logging is persisted and reflected in weekly tracking', async () => {
    await page.goto('/activity')
    await expect(page.getByRole('heading', { name: 'Vận động và điểm tuân thủ' })).toBeVisible()
    await page.getByLabel('Thời lượng (phút)').fill('35')
    await page.getByRole('button', { name: 'Lưu hoạt động' }).click()
    await expect(page.getByRole('status')).toContainText('Đã lưu hoạt động', { timeout: 10000 })
    const activities = await page.request.get('/api/v1/activities?page=1&pageSize=10', { headers })
    expect(activities.status()).toBe(200)
    const data = await activities.json() as { items: unknown[] }
    expect(data.items.length).toBeGreaterThanOrEqual(1)
  })

  await test.step('Start fourteen-day challenge, complete day one and persist dashboard', async () => {
    await page.goto('/progress')
    await expect(page.getByRole('heading', { name: 'Thử thách 14 ngày và bảng tiến độ.' })).toBeVisible()
    await page.getByRole('button', { name: /^Bắt đầu / }).first().click()
    await expect(page.getByText('0/14 ngày')).toBeVisible({ timeout: 12000 })
    await page.getByRole('button', { name: /Ngày 1/ }).first().click()
    await expect(page.getByText('1/14 ngày')).toBeVisible({ timeout: 12000 })
    const dashboard = await page.request.get('/api/v1/dashboard/summary', { headers })
    expect(dashboard.status()).toBe(200)
    const summary = await dashboard.json() as { challengeCompletedDays: number }
    expect(summary.challengeCompletedDays).toBe(1)
  })

  await test.step('Queue async weekly report through Web and observe Worker completion', async () => {
    await page.goto('/reports')
    await expect(page.getByRole('heading', { name: 'Báo cáo tiến độ theo tuần.' })).toBeVisible()
    const create = page.getByRole('button', { name: 'Yêu cầu tạo báo cáo' })
    if (await create.isVisible()) {
      await create.click()
      await expect(page.getByText('Đã đưa yêu cầu vào hàng đợi. Làm mới sau khi Worker xử lý.')).toBeVisible()
    }
    await expect.poll(async () => {
      const response = await page.request.get('/api/v1/weekly-reports/current', { headers })
      if (!response.ok()) return null
      const report = await response.json() as { status: string }
      return report.status
    }, { timeout: 45000, intervals: [1000, 2000, 3000] }).toBe('Ready')
    await page.getByRole('button', { name: 'Làm mới' }).click()
    await expect(page.getByText(/Generated:/)).toBeVisible()
  })

  await test.step('Save reminder preferences via Web and verify SQL API readback', async () => {
    await page.goto('/notifications')
    await expect(page.getByRole('heading', { name: 'Giữ nhịp theo cách bạn chọn' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Bật thông báo trình duyệt/ })).toBeVisible()
    const emailConsent = page.getByLabel(/Đồng ý nhận email nhắc lịch/)
    await expect(emailConsent).not.toBeChecked()
    await page.getByLabel('Cho phép nhắc lịch').check()
    await emailConsent.check()
    await page.getByRole('button', { name: 'Lưu lịch nhắc' }).click()
    await expect(page.getByRole('status')).toContainText('Đã lưu cài đặt', { timeout: 10000 })
    const response = await page.request.get('/api/v1/reminders/preferences', { headers })
    expect(response.status()).toBe(200)
    const preferences = await response.json() as { optedIn: boolean, emailOptedIn: boolean }
    expect(preferences.optedIn).toBe(true)
    expect(preferences.emailOptedIn).toBe(true)
    await emailConsent.uncheck()
    await page.getByRole('button', { name: 'Lưu lịch nhắc' }).click()
    await expect.poll(async () => {
      const latest = await page.request.get('/api/v1/reminders/preferences', { headers })
      return (await latest.json() as { emailOptedIn: boolean }).emailOptedIn
    }).toBe(false)
  })

  await test.step('Protected routes and final logout', async () => {
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Đăng xuất' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.goto('/reports')
    await expect(page).toHaveURL(/\/login$/)
  })
})

test('keyboard skip-navigation link is readable and focuses content', async ({ page }) => {
  await page.goto('/')
  const skip = page.locator('a.skip-link')
  await expect(skip).toHaveText('Bỏ qua điều hướng')
  await expect(skip).toHaveAttribute('href', '#main-content')
  await page.keyboard.press('Tab')
  await expect(skip).toBeFocused()
  await skip.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
})

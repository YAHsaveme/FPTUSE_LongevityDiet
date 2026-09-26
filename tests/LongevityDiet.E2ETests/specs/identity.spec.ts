import { expect, test } from '@playwright/test'

test('register, onboard, restore session, update profile and logout', async ({ page }) => {
  const suffix = Date.now().toString()
  const email = `browser-${suffix}@example.test`
  const password = 'StrongPass123!'
  const initialName = 'Browser Member'
  const updatedName = 'Browser Member Updated'

  await page.goto('/register')

  await page.locator('input[name="displayName"]').fill(initialName)
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('input[name="confirmPassword"]').fill(password)

  await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
  await expect(page).toHaveURL(/\/onboarding$/)
  await page.locator('input[name="birthYear"]').fill('2003')
  await page.locator('input[name="wakeTime"]').fill('06:30')
  await page.locator('input[name="sleepTime"]').fill('23:00')
  await page.locator('select[name="preferredMealFrequency"]').selectOption('3')
  await page.locator('textarea[name="foodPreference"]').fill('Plant-forward Vietnamese meals')

  await page.getByRole('button', { name: 'Hoàn tất thiết lập' }).click()
  await expect(page).toHaveURL(/\/app$/)

  await expect(page.locator('.account-button')).toContainText(initialName)

  await page.reload()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.locator('.account-button')).toContainText(initialName)

  await page.locator('.account-button').click()
  await expect(page).toHaveURL(/\/profile$/)
  const displayName = page.locator('input[name="displayName"]')
  await expect(displayName).toHaveValue(initialName)

  await displayName.fill(updatedName)
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.getByText('Hồ sơ đã được cập nhật.')).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/\/profile$/)
  await expect(page.locator('input[name="displayName"]')).toHaveValue(updatedName)

  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await expect(page).toHaveURL(/\/login$/)

  await page.goto('/app')
  await expect(page).toHaveURL(/\/login$/)
})

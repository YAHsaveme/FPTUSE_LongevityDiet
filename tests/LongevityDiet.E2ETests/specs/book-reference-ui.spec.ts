import { expect, test } from '@playwright/test'

test('Trang sách gốc hiển thị đủ chỉ dẫn nguồn, không nhận tác giả làm chuyên gia tư vấn', async ({ page }) => {
  await page.goto('/book')
  await expect(page.getByRole('heading', { name: /Tra cứu kiến thức từ sách/ })).toBeVisible()
  await expect(page.getByText('Valter Longo, PhD').first()).toBeVisible()
  await expect(page.getByText(/không tham gia tư vấn trực tiếp/)).toBeVisible()
  await expect(page.getByRole('heading', { name: '9 nguyên tắc cần đối chiếu' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Thực đơn tham khảo 14 ngày trong sách' })).toBeVisible()
  await expect(page.getByText(/trang PDF 112–115/)).toBeVisible()

  await page.getByRole('button', { name: 'Tuần thứ hai' }).click()
  await page.getByRole('button', { name: 'Ngày 4' }).click()
  await expect(page.getByRole('heading', { name: 'Tuần 2, ngày 4' })).toBeVisible()
  await expect(page.getByText(/Gạo đen với bí ngòi và tôm/)).toBeVisible()
  await expect(page.getByText('Trang 236')).toBeVisible()
  await expect(page.getByText(/phải kiểm tra dị ứng/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tra cứu nguồn vi chất' })).toBeVisible()
})

test('Trang sách gốc dễ đọc trên điện thoại 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/book')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    view: document.documentElement.clientWidth,
  }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.view + 1)
})

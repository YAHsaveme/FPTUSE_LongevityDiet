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
  await expect(page.locator('.book-ref-meal-grid').getByText('Trang 236')).toBeVisible()
  await expect(page.getByText(/phải kiểm tra dị ứng/)).toBeVisible()
  await page.locator('.book-ref-quantity-details summary').click()
  await expect(page.getByText(/Hiện mới đối chiếu biên tập đầy đủ hai bữa/)).toBeVisible()
  await expect(page.locator('.book-ref-quantity-card')).toHaveCount(4)
  const dinnerQuantity = page.locator('.book-ref-quantity-card').filter({ hasText: 'Gạo đen, bí ngòi và tôm' })
  await expect(dinnerQuantity.getByText('tôm', { exact: true })).toBeVisible()
  await expect(dinnerQuantity.getByText('60 g', { exact: true })).toBeVisible()
  await expect(dinnerQuantity.getByText(/Đã đối chiếu định lượng/)).toBeVisible()
  await expect(page.locator('.book-ref-unverified')).toHaveCount(3)
  await expect(page.getByRole('heading', { name: 'Tra cứu nguồn vi chất' })).toBeVisible()
})

test('Trang sách gốc dễ đọc trên điện thoại 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/book')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.locator('.book-ref-quantity-details summary').click()
  await expect(page.locator('.book-ref-quantity-card')).toHaveCount(4)
  const dimensions = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    view: document.documentElement.clientWidth,
  }))
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.view + 1)
})

test('Giới hạn đường trong bữa phụ không hiển thị như định lượng nguyên liệu', async ({ page }) => {
  await page.goto('/book')
  await page.locator('.book-ref-quantity-details summary').click()
  const snack = page.locator('.book-ref-quantity-card').filter({ hasText: 'Giới hạn đường trong thanh hạt' })
  await expect(snack).toBeVisible()
  await expect(snack.getByText('< 8 g', { exact: true })).toBeVisible()
  await expect(snack.getByText(/không phải nguyên liệu/)).toBeVisible()
  await expect(page.getByText(/350 dữ kiện/)).toBeVisible()
  await expect(page.getByText(/54 bữa còn lại vẫn cần kiểm duyệt/)).toBeVisible()
  await expect(page.getByText('Tên nguyên liệu cần đối chiếu bản dịch')).toHaveCount(0)
})

test('Định lượng phân số 1/2 củ hành và rau ăn kèm hiển thị đúng trang PDF 239', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Tuần thứ hai' }).click()
  await page.getByRole('button', { name: 'Ngày 6' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  const lunch = page.locator('.book-ref-quantity-card').filter({ hasText: 'Hành tây đỏ' })
  await expect(lunch).toBeVisible()
  await expect(lunch.getByText('1/2 cỡ vừa', { exact: true })).toBeVisible()
  await expect(lunch.getByText(/không phải 2 củ/)).toBeVisible()
  await expect(lunch.getByText('Rau lá xanh ăn kèm (khối lượng rau, không phải bánh mì)')).toBeVisible()
  await expect(lunch.getByText('200 g', { exact: true })).toBeVisible()
})

test('Định lượng cả mẻ và giá trị lặp lại không bị trình bày là phần ăn riêng', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Ngày 3' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  const snack = page.locator('.book-ref-quantity-card').filter({ hasText: 'Bột đậu gà' })
  await expect(snack.getByText('240 g', { exact: true })).toBeVisible()
  await expect(snack.getByText(/Định lượng công thức làm mẻ, không phải khẩu phần một người/).first()).toBeVisible()
  await page.getByRole('button', { name: 'Ngày 5' }).click()
  await expect(page.getByText(/Sách lặp lại cùng một giá trị; không cộng hai lần/)).toBeVisible()
})

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
  await expect(page.getByText(/Đã đối chiếu trực tiếp 56 bữa/)).toBeVisible()
  await expect(page.locator('.book-ref-quantity-card')).toHaveCount(4)
  const dinnerQuantity = page.locator('.book-ref-quantity-card').filter({ hasText: 'Gạo đen, bí ngòi và tôm' })
  await expect(dinnerQuantity.getByText('tôm', { exact: true })).toBeVisible()
  await expect(dinnerQuantity.getByText('60 g', { exact: true })).toBeVisible()
  await expect(dinnerQuantity.getByText(/Đã đối chiếu định lượng/)).toBeVisible()
  // All four slots now have AI-assisted source-page context checks. This is
  // not independent editorial/clinical approval: the warning must remain.
  await expect(page.locator('.book-ref-unverified')).toHaveCount(0)
  await expect(page.locator('.book-ref-verified')).toHaveCount(4)
  await expect(page.getByText(/vẫn chưa qua phê duyệt độc lập/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tra cứu nguồn vi chất' })).toBeVisible()
})

test('Bữa sáng ngày đầu không còn nhầm mứt việt quất thành mật ong', async ({ page }) => {
  await page.goto('/book')
  await page.locator('.book-ref-quantity-details summary').click()
  const breakfast = page.locator('.book-ref-quantity-card').filter({ hasText: 'focaccia nguyên cám' })
  await expect(breakfast.getByText('Mứt việt quất không thêm đường').first()).toBeVisible()
  await expect(breakfast.getByText(/KHÔNG PHẢI mật ong/)).toBeVisible()
  await expect(breakfast.getByText(/Chưa có xác nhận biên tập độc lập/)).toBeVisible()
})

test('Ngày 3 đối chiếu rõ định lượng mẻ farinata và món sinh tố thay thế', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Ngày 3' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  const breakfast = page.locator('.book-ref-quantity-card').filter({ hasText: 'mứt quả mọng' })
  await expect(breakfast.getByText('Mứt quả mọng hỗn hợp không thêm đường').first()).toBeVisible()
  const snack = page.locator('.book-ref-quantity-card').filter({ hasText: 'farinata' })
  await expect(snack.getByText(/CẢ MẺ bánh/)).toBeVisible()
  await expect(snack.getByText(/lựa chọn KHÁC/)).toBeVisible()
  await expect(snack.getByText('240 g', { exact: true })).toBeVisible()
})

test('Ngày 4 phân biệt mứt mơ với mật và tiêu chí thanh ăn nhẹ', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Ngày 4' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  const breakfast = page.locator('.book-ref-quantity-card').filter({ hasText: 'mứt mơ' })
  await expect(breakfast.getByText('Mứt mơ không thêm đường').first()).toBeVisible()
  const snack = page.locator('.book-ref-quantity-card').filter({ hasText: 'thanh hạt' })
  await expect(snack.getByText('< 8 g', { exact: true })).toBeVisible()
  await expect(page.getByText(/Đã đối chiếu trực tiếp 56 bữa/)).toBeVisible()
})

test('Ngày 5 yến mạch 90 g lặp trong sách không bị cộng thành 180 g', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Ngày 5' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  const breakfast = page.locator('.book-ref-quantity-card').filter({ hasText: 'Yến mạch steel-cut' })
  await expect(breakfast.getByText(/KHÔNG cộng thành 180 g/)).toBeVisible()
  await expect(breakfast.getByText(/Sách lặp lại cùng một giá trị; không cộng hai lần/)).toBeVisible()
  await expect(page.getByText(/Đã đối chiếu trực tiếp 56 bữa/)).toBeVisible()
})

test('Ngày 6 focaccia là món kết hợp, không phải 60 g dầu', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Ngày 6' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  const breakfast = page.locator('.book-ref-quantity-card').filter({ hasText: 'Focaccia nguyên cám' })
  await expect(breakfast.getByText(/KHÔNG phải 60 g dầu ô-liu/)).toBeVisible()
  await expect(breakfast.getByText('60 g', { exact: true })).toBeVisible()
})

test('Ngày 7 phân biệt 60 g nghêu và vẹm là tổng, không phải mỗi loại', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Ngày 7' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  const dinner = page.locator('.book-ref-quantity-card').filter({ hasText: 'Mì spaghetti với nghêu và vẹm' })
  await expect(dinner.getByText(/Nghêu và vẹm tổng cộng/)).toBeVisible()
  await expect(dinner.getByText(/không phải mỗi loại 60 g/)).toBeVisible()
  await expect(page.getByText(/Đã đối chiếu trực tiếp 56 bữa/)).toBeVisible()
})

test('Tuần 2 ngày 1 không tự gán gram cho chocolate và hạt thiếu định lượng', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Tuần thứ hai' }).click()
  await page.getByRole('button', { name: 'Ngày 1' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  const breakfast = page.locator('.book-ref-quantity-card').filter({ hasText: 'Yến mạch với sữa hạnh nhân' })
  await expect(breakfast.getByText(/KHÔNG GHI gram/)).toBeVisible()
  const dinner = page.locator('.book-ref-quantity-card').filter({ hasText: 'Salad đậu gà' })
  await expect(dinner.getByText(/Đừng nhầm 60 g bánh đậu gà với 60 g BỘT đậu gà/)).toBeVisible()
})

test('Tuần 2 ngày 2 sửa mứt dâu và phân biệt bữa phụ thay thế', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Tuần thứ hai' }).click()
  await page.getByRole('button', { name: 'Ngày 2' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  const breakfast = page.locator('.book-ref-quantity-card').filter({ hasText: 'mứt dâu' })
  await expect(breakfast.getByText('Mứt dâu không thêm đường').first()).toBeVisible()
  const snack = page.locator('.book-ref-quantity-card').filter({ hasText: 'Sinh tố quả mọng' })
  await expect(snack.getByText(/Chọn MỘT phương án/)).toBeVisible()
  await expect(page.getByText(/Đã đối chiếu trực tiếp 56 bữa/)).toBeVisible()
})

test('Tuần 2 ngày 3 sửa mứt mận, không ghi hai bagel hay 40g dầu', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Tuần thứ hai' }).click()
  await page.getByRole('button', { name: 'Ngày 3' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  const breakfast = page.locator('.book-ref-quantity-card').filter({ hasText: 'mứt mận' })
  await expect(breakfast.getByText('Mứt mận không thêm đường').first()).toBeVisible()
  await expect(breakfast.getByText(/không phải hai bagel/)).toBeVisible()
  const dinner = page.locator('.book-ref-quantity-card').filter({ hasText: 'Salad đậu cannellini' })
  await expect(dinner.getByText(/KHÔNG phải 40 g dầu/)).toBeVisible()
})

test('Tuần 2 ngày 7 không nhân đôi 90g cá và không đổi dầu 25g thành 25mL', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Tuần thứ hai' }).click()
  await page.getByRole('button', { name: 'Ngày 7' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  const pizza = page.locator('.book-ref-quantity-card').filter({ hasText: 'Pizza rau củ' })
  await expect(pizza.getByText(/Cá mòi và cá cơm TỔNG CỘNG 90 g/)).toBeVisible()
  await expect(pizza.getByText(/SÁCH GHI GRAM, không được tự sửa thành mL/)).toBeVisible()
  await expect(page.getByText(/Đã đối chiếu trực tiếp 56 bữa/)).toBeVisible()
  await expect(page.getByText(/vẫn chưa qua phê duyệt độc lập/)).toBeVisible()
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
  await expect(page.getByText(/Đã đối chiếu đủ số bữa trong Phụ lục A ở mức kiểm tra nguồn/)).toBeVisible()
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
  // Page 239 provides 200 g of cooked greens as an ALTERNATIVE to salad;
  // the separate 40 g brown bread remains a side, not part of that weight.
  await expect(lunch.getByText('Rau lá xanh luộc ăn kèm (lựa chọn thay salad rau xanh)')).toBeVisible()
  await expect(lunch.getByText('200 g', { exact: true })).toBeVisible()
  await expect(lunch.getByText('Bánh mì nâu ăn kèm, không phải crouton')).toBeVisible()
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

test('Trang sách phân biệt tiêu chí dinh dưỡng thanh ăn nhẹ với định lượng cá nhân', async ({ page }) => {
  await page.goto('/book')
  await page.locator('.book-ref-quantity-details summary').click()
  await expect(page.getByText(/Tiêu chí thanh ăn nhẹ trong sách: 150 kcal/)).toBeVisible()
  await expect(page.getByText(/sô-cô-la đen tối thiểu 70%/)).toBeVisible()
})

test('Trang sách hiển thị số đếm táo và kiwi ngoài bộ tách đơn vị mà không nhận là định lượng AI', async ({ page }) => {
  await page.goto('/book')
  await page.getByRole('button', { name: 'Ngày 5' }).click()
  await page.locator('.book-ref-quantity-details summary').click()
  await expect(page.getByText(/Kiwi trong ví dụ trái cây tươi ăn kèm/)).toBeVisible()
  await page.getByRole('button', { name: 'Ngày 6' }).click()
  await expect(page.getByText(/Táo trong ví dụ trái cây tươi ăn kèm dâu tây/)).toBeVisible()
})

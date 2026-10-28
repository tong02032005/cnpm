import { expect, test } from '@playwright/test';

// E2E-T01: Menu → Chi tiết → Giỏ hàng → Đăng ký → Thanh toán → Xác nhận
test('khách đặt và thanh toán một đơn từ menu đến màn hình xác nhận', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Cappuccino/ }).click();

  await page.getByRole('button', { name: /^M/ }).click();
  await page.getByLabel('Trân châu').check();
  await page.getByRole('button', { name: /Thêm vào giỏ · 55\.000đ/ }).click();

  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId('cart-count')).toHaveText('1');
  await page.getByRole('button', { name: `Tăng Cappuccino` }).click();
  await expect(page.getByTestId('cart-total')).toHaveText('110.000đ');
  await page.getByRole('button', { name: /Thanh toán/ }).click();

  // Chưa đăng nhập → chuyển sang đăng ký rồi quay lại thanh toán
  await expect(page).toHaveURL(/\/login\?next=%2Fcheckout|\/login\?next=\/checkout/);
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Email').fill(`e2e-${Date.now()}@test.vn`);
  await page.getByLabel(/Mật khẩu/).fill('secret123');
  await page.getByRole('button', { name: 'Đăng ký' }).click();

  await expect(page).toHaveURL(/\/checkout$/);
  await page.getByPlaceholder(/Mã khuyến mãi/).fill('WELCOME10');
  await page.getByRole('button', { name: 'Áp dụng' }).click();
  await expect(page.getByTestId('checkout-total')).toHaveText('99.000đ');

  await page.getByLabel('Thẻ ngân hàng').check();
  await page.getByRole('button', { name: /Xác nhận trả/ }).click();

  await expect(page.getByText('Đặt hàng thành công')).toBeVisible();
  await expect(page.getByTestId('order-status')).toHaveText('Đã thanh toán');
  await expect(page.getByTestId('cart-count')).toHaveText('0');
});

test('thanh toán lỗi thì giữ giỏ hàng và cho thanh toán lại', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Chưa có tài khoản? Đăng ký' }).click();
  await page.getByLabel('Email').fill(`e2e-fail-${Date.now()}@test.vn`);
  await page.getByLabel(/Mật khẩu/).fill('secret123');
  await page.getByRole('button', { name: 'Đăng ký' }).click();
  await expect(page).toHaveURL('/');

  await page.getByRole('link', { name: /Americano/ }).click();
  await page.getByRole('button', { name: /Thêm vào giỏ/ }).click();
  await page.getByRole('button', { name: /Thanh toán/ }).click();

  await page.getByLabel('Giả lập thanh toán lỗi (demo)').check();
  await page.getByRole('button', { name: /Xác nhận trả/ }).click();
  await expect(page.getByText(/Thanh toán thất bại/)).toBeVisible();
  await expect(page.getByTestId('cart-count')).toHaveText('1');

  await page.getByLabel('Giả lập thanh toán lỗi (demo)').uncheck();
  await page.getByRole('button', { name: 'Thanh toán lại' }).click();
  await expect(page.getByTestId('order-status')).toHaveText('Đã thanh toán');
});

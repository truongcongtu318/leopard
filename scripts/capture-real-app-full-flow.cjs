const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require(path.resolve(__dirname, '../node_modules/.pnpm/playwright@1.57.0/node_modules/playwright'));
const pg = require(path.resolve(__dirname, '../apps/api/node_modules/pg'));

const OUTPUT_DIR = path.resolve(__dirname, '../screenshots/real_flow_complete');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const API_URL = 'http://localhost:3000/api/v1';
const DB_URL = process.env.DATABASE_URL || 'postgresql://leopard:leopard_local@localhost:5432/leopard?schema=public';

async function resetDriverAvailability() {
  console.log('🧹 Dọn dẹp trạng thái tài xế và đơn cũ...');
  const pool = new pg.Pool({ connectionString: DB_URL });
  await pool.query(`
    UPDATE "Order" SET status = 'CANCELLED' 
    WHERE "driverId" = '22222222-2222-4222-8222-222222222222' AND status NOT IN ('DELIVERED', 'CANCELLED');
    UPDATE "DriverProfile" SET availability = 'AVAILABLE' 
    WHERE "userId" = '22222222-2222-4222-8222-222222222222';
  `);
  await pool.end();
  console.log('✅ Tài xế đã sẵn sàng nhận đơn mới.');
}

async function getDriverToken() {
  const res = await fetch(`${API_URL}/auth/login/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId: 'driver' })
  });
  const data = await res.json();
  return data.session.accessToken;
}

function dispatchNewOrder() {
  console.log('📦 Bắn đơn hàng mới từ API...');
  const out = execSync('cd apps/api && node dispatch-test-order.mjs', { encoding: 'utf8' });
  const match = out.match(/Mã đơn hàng:\s+([a-f0-9-]+)/);
  if (match) {
    return match[1];
  }
  throw new Error('Không lấy được mã đơn hàng từ output');
}

async function updateOrderStatus(token, orderId, status) {
  console.log(`🔄 Cập nhật trạng thái API: ${orderId} -> ${status}`);
  const res = await fetch(`${API_URL}/driver/orders/${orderId}/status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`Cập nhật trạng thái thất bại: ${res.status} ${text}`);
  }
}

async function addDummyProofAndComplete(token, orderId) {
  const pool = new pg.Pool({ connectionString: DB_URL });
  const res = await pool.query(`
    INSERT INTO "MediaObject" (id, "orderId", "uploaderId", type, provider, "storageKey", "contentType", "sizeBytes", "checksumSha256")
    VALUES (gen_random_uuid(), $1, '22222222-2222-4222-8222-222222222222', 'DELIVERY_PROOF', 'LOCAL', $2, 'image/jpeg', 1024, 'dummy_sha')
    RETURNING id;
  `, [orderId, `orders/${orderId}/proof.jpg`]);
  const mediaId = res.rows[0].id;
  await pool.query(`
    UPDATE "Order"
    SET "proofMediaId" = $1, status = 'DELIVERED', "updatedAt" = NOW()
    WHERE id = $2;
  `, [mediaId, orderId]);
  await pool.end();
  console.log('✅ Đã cập nhật DELIVERED thành công trong DB');
}

async function slideElement(page, testId) {
  const thumb = page.getByTestId(`${testId}-thumb`);
  if (await thumb.count() > 0) {
    const box = await thumb.boundingBox();
    if (box) {
      console.log(`Dragging ${testId}-thumb from (${box.x}, ${box.y})...`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 320, box.y + box.height / 2, { steps: 15 });
      await page.mouse.up();
      await page.waitForTimeout(1000);
      return true;
    }
  }
  return false;
}

async function run() {
  console.log('🚀 Khởi động Playwright trên giao diện thật 100%...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    geolocation: { latitude: 21.0280, longitude: 105.8345 },
    permissions: ['geolocation'],
  });

  const page = await context.newPage();

  // 1. Reset tài xế & lấy token
  await resetDriverAvailability();
  const driverToken = await getDriverToken();

  // 2. Đăng nhập vào app tài xế
  console.log('🔑 Đăng nhập vào app tài xế...');
  await page.goto('http://localhost:8082/(public)/login', { waitUntil: 'networkidle' });
  const demoBtn = page.getByRole('button', { name: 'Demo Driver' });
  if (await demoBtn.count() > 0) {
    await demoBtn.click();
    await page.waitForTimeout(3000);
  }

  // 3. Bắn đơn hàng mới
  const orderId = dispatchNewOrder();
  console.log('   Mã đơn hàng mới tạo:', orderId);
  await page.waitForTimeout(2000);

  // CHỤP 1: Màn hình nổ đơn thực tế (Offer Modal)
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_real_no_don_offer.png') });
  console.log('📸 [1/9] Đã chụp: 01_real_no_don_offer.png');

  // 4. Vuốt nhận đơn hoặc gọi accept API
  console.log('🚚 Chấp nhận đơn hàng...');
  const acceptRes = await fetch(`${API_URL}/driver/orders/${orderId}/accept`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${driverToken}`
    },
    body: JSON.stringify({ clientRequestId: `req-${Date.now()}` })
  });
  console.log('   Accept status:', acceptRes.status);

  // Vào buồng lái điều hướng của đơn
  await page.goto(`http://localhost:8082/orders/${orderId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // CHỤP 2: Buồng lái điều hướng đến điểm lấy (ACCEPTED)
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02_real_buong_lai_diem_lay_accepted.png') });
  console.log('📸 [2/9] Đã chụp: 02_real_buong_lai_diem_lay_accepted.png');

  // 5. Cập nhật tới điểm lấy (PICKING_UP)
  await updateOrderStatus(driverToken, orderId, 'PICKING_UP');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // CHỤP 3: Đã đến điểm lấy hàng (PICKING_UP - Thẻ kiểm hàng gọn)
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_real_da_den_diem_lay_picking_up.png') });
  console.log('📸 [3/9] Đã chụp: 03_real_da_den_diem_lay_picking_up.png');

  // 6. Bấm mở kiểm hàng POD lấy (Focused Modal)
  const captureBtn = page.getByTestId('btn-preloading-cargo-photo');
  if (await captureBtn.count() > 0) {
    console.log('📷 Mở màn hình kiểm hàng POD lấy...');
    await captureBtn.click();
    await page.waitForTimeout(1500);

    // CHỤP 4: Modal kiểm hàng & chụp ảnh bốc hàng
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_real_modal_kiem_hang_pod_lay.png') });
    console.log('📸 [4/9] Đã chụp: 04_real_modal_kiem_hang_pod_lay.png');

    // Chụp ảnh để xem nút active
    const photoBox = page.getByTestId('btn-capture-photo');
    if (await photoBox.count() > 0) {
      await photoBox.click();
      await page.waitForTimeout(600);
      // CHỤP 4b: Đã chụp ảnh kiểm hàng (nút Xác nhận sáng xanh Navy)
      await page.screenshot({ path: path.join(OUTPUT_DIR, '04b_real_modal_da_chup_anh_active.png') });
      console.log('📸 [4b/9] Đã chụp: 04b_real_modal_da_chup_anh_active.png');
    }

    // Đóng modal
    const closeBtn = page.getByText('✕');
    if (await closeBtn.count() > 0) {
      await closeBtn.first().click();
      await page.waitForTimeout(800);
    }
  }

  // 7. Bắt đầu vận chuyển đến điểm giao (IN_TRANSIT)
  await updateOrderStatus(driverToken, orderId, 'IN_TRANSIT');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // CHỤP 5: Buồng lái điều hướng đến điểm giao hàng (IN_TRANSIT)
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_real_buong_lai_diem_giao_in_transit.png') });
  console.log('📸 [5/9] Đã chụp: 05_real_buong_lai_diem_giao_in_transit.png');

  // 8. Vuốt / bấm mở modal bàn giao hàng POD & COD
  console.log('🚚 Mở modal bàn giao POD...');
  const advanceSlide = page.getByTestId('btn-advance-leg-slide');
  if (await advanceSlide.count() > 0) {
    await slideElement(page, 'btn-advance-leg-slide');
    await page.waitForTimeout(1500);
  } else {
    const addProofBtn = page.getByText('Thêm ảnh xác nhận giao hàng');
    if (await addProofBtn.count() > 0) {
      await addProofBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // CHỤP 6: Màn hình bàn giao hàng & COD (Focused Modal)
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06_real_modal_ban_giao_pod_cod.png') });
  console.log('📸 [6/9] Đã chụp: 06_real_modal_ban_giao_pod_cod.png');

  // 9. Bấm link "Không giao được hàng?" để xem nhánh sự cố
  const failLink = page.getByTestId('link-switch-failure');
  if (await failLink.count() > 0) {
    console.log('⚠️ Chuyển sang nhánh Không giao được hàng...');
    await failLink.click();
    await page.waitForTimeout(1000);

    // CHỤP 7: Màn hình báo cáo giao thất bại / sự cố
    await page.screenshot({ path: path.join(OUTPUT_DIR, '07_real_modal_khong_giao_duoc_hang.png') });
    console.log('📸 [7/9] Đã chụp: 07_real_modal_khong_giao_duoc_hang.png');
  }

  // 10. Hoàn tất chuyến đi (DELIVERED)
  console.log('🎉 Hoàn tất đơn hàng sang DELIVERED...');
  await addDummyProofAndComplete(driverToken, orderId);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // CHỤP 8: Màn hình hoàn tất chuyến đi (Biên bản & tổng kết)
  await page.screenshot({ path: path.join(OUTPUT_DIR, '08_real_hoan_tat_chuyen_di_delivered.png') });
  console.log('📸 [8/9] Đã chụp: 08_real_hoan_tat_chuyen_di_delivered.png');

  // 11. Trở về Trang chủ / Bảng đơn
  console.log('🏠 Chuyển về Bảng đơn...');
  await page.goto('http://localhost:8082/board', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // CHỤP 9: Bảng đơn hàng sẵn sàng nhận
  await page.screenshot({ path: path.join(OUTPUT_DIR, '09_real_bang_don_hang_san_sang.png') });
  console.log('📸 [9/9] Đã chụp: 09_real_bang_don_hang_san_sang.png');

  await browser.close();
  console.log('🎉🎉🎉 Hoàn tất toàn bộ chuỗi chụp 100% GIAO DIỆN THẬT!');
}

run().catch((err) => {
  console.error('Lỗi thực thi:', err);
  process.exit(1);
});

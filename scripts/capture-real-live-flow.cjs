const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { chromium } = require(path.resolve(__dirname, '../node_modules/.pnpm/playwright@1.57.0/node_modules/playwright'));

const OUTPUT_DIR = path.resolve(__dirname, '../screenshots/real_flow');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function dispatchOrder() {
  console.log('📦 Bắn đơn hàng mới từ API...');
  const res = execSync('cd apps/api && node dispatch-test-order.mjs', { encoding: 'utf8' });
  console.log(res);
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

  console.log('1. Đăng nhập...');
  await page.goto('http://localhost:8082/(public)/login', { waitUntil: 'networkidle' });
  const demoBtn = page.getByRole('button', { name: 'Demo Driver' });
  if (await demoBtn.count() > 0) {
    await demoBtn.click();
    await page.waitForTimeout(3000);
  }

  console.log('2. Bắn đơn hàng mới...');
  dispatchOrder();
  await page.waitForTimeout(2000);

  // Chụp Bước 1: Nổ đơn
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01_real_no_don.png') });
  console.log('📸 Đã lưu: 01_real_no_don.png');

  // Vuốt nhận đơn
  console.log('3. Vuốt nhận đơn...');
  const slid = await slideElement(page, 'dispatch-slide-action');
  console.log('Kết quả vuốt:', slid);

  await page.waitForTimeout(3000);
  console.log('Trang sau khi nhận:', page.url());

  // Chụp Bước 2: Buồng lái điều hướng đến điểm lấy
  await page.screenshot({ path: path.join(OUTPUT_DIR, '02_real_buong_lai_diem_lay.png') });
  console.log('📸 Đã lưu: 02_real_buong_lai_diem_lay.png');

  // Nếu đang ở buồng lái, vuốt "Đã tới điểm lấy hàng"
  console.log('4. Vuốt: Đã tới điểm lấy hàng...');
  const slidPickup = await slideElement(page, 'btn-advance-leg-slide');
  console.log('Kết quả vuốt tới điểm lấy:', slidPickup);
  await page.waitForTimeout(2000);

  // Chụp Bước 3: Đã đến điểm lấy (sẵn sàng bốc hàng)
  await page.screenshot({ path: path.join(OUTPUT_DIR, '03_real_da_den_diem_lay.png') });
  console.log('📸 Đã lưu: 03_real_da_den_diem_lay.png');

  // Bấm nút "+ Chụp ảnh kiểm hàng tại điểm lấy"
  const captureBtn = page.getByTestId('btn-preloading-cargo-photo');
  if (await captureBtn.count() > 0) {
    console.log('5. Bấm mở kiểm hàng & chụp ảnh...');
    await captureBtn.click();
    await page.waitForTimeout(1500);

    // Chụp Bước 4: Màn hình kiểm hàng toàn phần (POD lấy)
    await page.screenshot({ path: path.join(OUTPUT_DIR, '04_real_modal_kiem_hang.png') });
    console.log('📸 Đã lưu: 04_real_modal_kiem_hang.png');

    // Chụp ảnh và xác nhận trong modal
    const photoBox = page.getByTestId('btn-capture-photo');
    if (await photoBox.count() > 0) {
      console.log('Chụp ảnh kiện hàng thùng xe...');
      await photoBox.click();
      await page.waitForTimeout(600);
    }
    const confirmBtn = page.getByTestId('btn-confirm-pickup');
    if (await confirmBtn.count() > 0) {
      console.log('Xác nhận bốc hàng xong...');
      await confirmBtn.click();
      await page.waitForTimeout(2500);
    }
  }

  // Chụp Bước 5: Đang vận chuyển đến điểm giao (IN_TRANSIT)
  await page.screenshot({ path: path.join(OUTPUT_DIR, '05_real_van_chuyen_diem_giao.png') });
  console.log('📸 Đã lưu: 05_real_van_chuyen_diem_giao.png');

  // Bấm nút thêm ảnh xác nhận giao hàng (hoặc vuốt)
  const addProofBtn = page.getByText('Thêm ảnh xác nhận giao hàng');
  if (await addProofBtn.count() > 0) {
    console.log('6. Bấm mở Thêm ảnh xác nhận giao hàng...');
    await addProofBtn.click();
    await page.waitForTimeout(1500);
  } else {
    console.log('6. Vuốt: Đã tới điểm giao hàng...');
    const advanceBtn = page.getByTestId('btn-advance-leg-slide');
    if (await advanceBtn.count() > 0) {
      await slideElement(page, 'btn-advance-leg-slide');
      await page.waitForTimeout(2000);
    }
  }

  // Chụp Bước 6: Màn hình bàn giao hàng & COD
  await page.screenshot({ path: path.join(OUTPUT_DIR, '06_real_ban_giao_pod_cod.png') });
  console.log('📸 Đã lưu: 06_real_ban_giao_pod_cod.png');

  // Thao tác trong modal bàn giao hàng
  const exactAmountBtn = page.getByTestId('btn-quick-exact-amount');
  if (await exactAmountBtn.count() > 0) {
    await exactAmountBtn.click();
    await page.waitForTimeout(300);
  }
  const deliveryPhotoBtn = page.getByTestId('btn-capture-delivery-proof');
  if (await deliveryPhotoBtn.count() > 0) {
    await deliveryPhotoBtn.click();
    await page.waitForTimeout(500);
  }
  const confirmDeliveryBtn = page.getByTestId('btn-confirm-delivery');
  if (await confirmDeliveryBtn.count() > 0) {
    await confirmDeliveryBtn.click();
    await page.waitForTimeout(2500);
  }

  // Chụp Bước 7: Màn hình hoàn tất chuyến đi
  await page.screenshot({ path: path.join(OUTPUT_DIR, '07_real_hoan_tat_chuyen.png') });
  console.log('📸 Đã lưu: 07_real_hoan_tat_chuyen.png');

  await browser.close();
  console.log('🎉 Hoàn tất chuỗi chụp thực tế!');
}

run().catch(console.error);

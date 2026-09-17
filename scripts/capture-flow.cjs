const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../node_modules/.pnpm/playwright@1.57.0/node_modules/playwright'));

const OUTPUT_DIR = path.resolve(__dirname, '../screenshots/flow');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function capture() {
  console.log('🚀 Khởi động Playwright Chromium...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Mobile viewport matching iPhone 15 Pro / Apple HIG (393 x 852)
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // Helper to wait for network/render
  const waitRender = () => page.waitForTimeout(1000);

  console.log('📱 Mở trang Playground 12 trạng thái: http://localhost:8082/journey-12 ...');
  await page.goto('http://localhost:8082/journey-12', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitRender();

  const states = [
    { id: 1, name: '01_no_don_nhan_don.png', desc: 'Bước 1: Màn hình nổ đơn' },
    { id: 4, name: '02_dieu_huong_diem_lay.png', desc: 'Bước 2: Điều hướng đến điểm lấy hàng' },
    { id: 6, name: '03_kiem_hang_boc_hang_pod.png', desc: 'Bước 3: Kiểm hàng & bốc hàng (POD lấy)' },
    { id: 7, name: '04_dieu_huong_diem_giao.png', desc: 'Bước 4: Điều hướng đến điểm giao hàng' },
    { id: 8, name: '05_giao_hang_thu_tien_cod.png', desc: 'Bước 5a: Bàn giao hàng & Thu tiền COD' },
    { id: 9, name: '05b_khong_giao_duoc_hang.png', desc: 'Bước 5b: Báo cáo không giao được' },
    { id: 10, name: '06_hoan_tat_chuyen_di.png', desc: 'Bước 6: Hoàn tất chuyến đi' },
    { id: 12, name: '07_che_do_lai_xe_ban_dem.png', desc: 'Dark Mode: Chế độ lái xe ban đêm' },
  ];

  for (const s of states) {
    console.log(`📸 Đang chụp: ${s.desc}...`);
    // Click switcher
    const selector = `[data-testid="switch-state-${s.id}"]`;
    try {
      await page.click(selector, { timeout: 3000 });
      await page.waitForTimeout(600);
    } catch (err) {
      console.log(`Fallback clicking selector ${selector}:`, err.message);
    }

    const outPath = path.join(OUTPUT_DIR, s.name);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`✅ Đã lưu: ${outPath}`);
  }

  // Also capture real orders screen
  console.log('📱 Mở màn hình đơn hàng thực tế: http://localhost:8082/orders ...');
  try {
    await page.goto('http://localhost:8082/orders', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const realOut = path.join(OUTPUT_DIR, '00_man_hinh_don_thuc_te.png');
    await page.screenshot({ path: realOut, fullPage: false });
    console.log(`✅ Đã lưu màn hình thực tế: ${realOut}`);
  } catch (err) {
    console.warn('Không thể chụp /orders:', err.message);
  }

  await browser.close();
  console.log('🎉 Đã hoàn tất toàn bộ chụp màn hình!');
}

capture().catch((e) => {
  console.error('Lỗi capture:', e);
  process.exit(1);
});

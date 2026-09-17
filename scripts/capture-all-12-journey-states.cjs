const path = require('path');
const fs = require('fs');
const { chromium } = require(path.resolve(__dirname, '../node_modules/.pnpm/playwright@1.57.0/node_modules/playwright'));

const OUTPUT_DIR = path.resolve(__dirname, '../screenshots/full_journey');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const JOURNEY_STATES = [
  {
    id: 1,
    filename: '01_no_don_dem_nguoc_20s.png',
    title: '1. Nổ đơn — Đồng hồ đếm ngược 20s đầy đủ',
  },
  {
    id: 2,
    filename: '02_no_don_canh_bao_duoi_5s_do.png',
    title: '2. Nổ đơn — Cảnh báo khẩn cấp dưới 5s (Thanh đỏ)',
  },
  {
    id: 3,
    filename: '03_no_don_dang_keo_vuot_50_phan_tram.png',
    title: '3. Nổ đơn — Đang kéo thanh vuốt dở chừng (50%)',
  },
  {
    id: 4,
    filename: '04_dieu_huong_den_diem_lay.png',
    title: '4. Điều hướng đến điểm lấy hàng (Buồng lái dẫn đường)',
  },
  {
    id: 5,
    filename: '05_da_den_diem_lay_geofence_100m.png',
    title: '5. Đã đến điểm lấy hàng (<100m geofence)',
  },
  {
    id: 6,
    filename: '06_kiem_hang_chup_anh_boc_hang_pod.png',
    title: '6. POD Lấy hàng — Kiểm hàng, chụp ảnh, đếm kiện',
  },
  {
    id: 7,
    filename: '07_dieu_huong_giao_hang_da_chang.png',
    title: '7. Điều hướng giao hàng đa chặng dừng',
  },
  {
    id: 8,
    filename: '08_xac_nhan_giao_hang_thu_tien_cod.png',
    title: '8. POD Giao hàng — Nhánh thu tiền mặt (COD)',
  },
  {
    id: 9,
    filename: '09_bao_cao_khong_giao_duoc_hang_hoan_tra.png',
    title: '9. POD Giao thất bại — Báo cáo sự cố & Hoàn hàng',
  },
  {
    id: 10,
    filename: '10_hoan_tat_chuyen_di_tong_ket_bento.png',
    title: '10. Hoàn tất chuyến đi — Thẻ Bento doanh thu & 5 sao',
  },
  {
    id: 11,
    filename: '11_hang_doi_don_thu_hai_queue_toast.png',
    title: '11. Đơn thứ hai đến trong hàng đợi (Queue Toast)',
  },
  {
    id: 12,
    filename: '12_che_do_lai_xe_ban_dem_dark_mode.png',
    title: '12. Chế độ ban đêm — Dark Mode lái xe cabin đêm',
  },
];

async function captureAllStates() {
  console.log('🚀 Khởi động Playwright để chụp trọn vẹn 12 trạng thái hành trình...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  console.log('📱 Mở trang Playground: http://localhost:8082/journey-12 ...');
  await page.goto('http://localhost:8082/journey-12', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(1000);

  for (const item of JOURNEY_STATES) {
    console.log(`📸 [${item.id}/12] Đang chuyển sang: ${item.title}...`);

    // Hiện dock lên lại để click state
    await page.evaluate(() => {
      const dock = document.querySelector('[data-testid="playground-dock-container"]');
      if (dock) dock.style.display = 'flex';
    });

    const switcher = page.getByTestId(`switch-state-${item.id}`);
    if (await switcher.count() > 0) {
      await switcher.click();
      await page.waitForTimeout(600);
    }

    // Ẩn dock hoàn toàn trước khi chụp màn hình để ảnh tinh khiết 100%
    await page.evaluate(() => {
      const dock = document.querySelector('[data-testid="playground-dock-container"]');
      if (dock) dock.style.display = 'none';
    });
    await page.waitForTimeout(400);

    const outPath = path.join(OUTPUT_DIR, item.filename);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`   ✅ Đã lưu: ${item.filename}`);
  }

  await browser.close();
  console.log('🎉 Đã hoàn tất chụp 12/12 trạng thái!');
}

captureAllStates().catch((err) => {
  console.error('Lỗi capture:', err);
  process.exit(1);
});

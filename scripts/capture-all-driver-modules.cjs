const path = require('path');
const fs = require('fs');

const playwrightPkg = path.resolve(__dirname, '../node_modules/.pnpm/playwright@1.57.0/node_modules/playwright');
const { chromium } = require(playwrightPkg);

const BASE_URL = 'http://localhost:8082';
const API_URL = 'http://localhost:3000/api/v1';
const ROOT_OUTPUT = path.resolve(__dirname, '../output/screenshots/driver');

const MODULES = {
  auth: path.join(ROOT_OUTPUT, '01_auth_onboarding'),
  cockpit: path.join(ROOT_OUTPUT, '02_cockpit_orders'),
  finance: path.join(ROOT_OUTPUT, '03_finance_earnings'),
  history: path.join(ROOT_OUTPUT, '04_history_chat'),
  profile: path.join(ROOT_OUTPUT, '05_profile_settings_legal'),
  system: path.join(ROOT_OUTPUT, '06_system_dev'),
};

for (const dir of Object.values(MODULES)) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function getDriverSession() {
  const res = await fetch(`${API_URL}/auth/login/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId: 'driver' })
  });
  if (!res.ok) {
    throw new Error(`Failed to get demo driver token: ${res.status}`);
  }
  return await res.json();
}

const FORCE = process.argv.includes('--force');

async function run() {
  console.log('🚀 Bắt đầu chụp toàn bộ màn hình Driver App theo module...');
  
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 393, height: 852 }, // iPhone 15 Pro size
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    geolocation: { latitude: 21.0280, longitude: 105.8345 },
    permissions: ['geolocation'],
  });

  const page = await context.newPage();

  async function snap(targetPath, action) {
    if (!FORCE && fs.existsSync(targetPath)) {
      console.log(`⏩ Bỏ qua (đã có): ${path.basename(targetPath)}`);
      return;
    }
    await action();
    await page.screenshot({ path: targetPath });
    console.log(`✅ ${path.basename(targetPath)}`);
  }

  // Helper to set session
  async function applyDriverAuth(sessionData) {
    await page.goto(BASE_URL);
    await page.evaluate((data) => {
      localStorage.setItem('leopard.refresh', data.session.refreshToken);
      localStorage.setItem('leopard.role', 'DRIVER');
    }, sessionData);
  }

  // Helper to clear session
  async function clearAuth() {
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.clear();
    });
  }

  // ==========================================
  // MODULE 1: AUTH & ONBOARDING
  // ==========================================
  console.log('\n--- 📸 Module 1: Auth & Onboarding ---');
  await clearAuth();

  await snap(path.join(MODULES.auth, '01_splash.png'), async () => {
    await page.goto(BASE_URL);
    await page.waitForTimeout(800);
  });

  await snap(path.join(MODULES.auth, '02_login.png'), async () => {
    await page.goto(`${BASE_URL}/(public)/login`);
    await page.waitForTimeout(1000);
  });

  await snap(path.join(MODULES.auth, '03_login_not_driver_error.png'), async () => {
    await page.goto(`${BASE_URL}/(public)/login`);
    await page.waitForTimeout(800);
    const demoCustomerBtn = page.getByRole('button', { name: 'Demo Customer' });
    if (await demoCustomerBtn.count() > 0) {
      await demoCustomerBtn.click();
      await page.waitForTimeout(1200);
    }
  });

  await snap(path.join(MODULES.auth, '04_verify_otp.png'), async () => {
    await page.goto(`${BASE_URL}/(public)/verify-otp?phone=+84987654321`);
    await page.waitForTimeout(1000);
  });

  await snap(path.join(MODULES.auth, '05_driver_register.png'), async () => {
    await page.goto(`${BASE_URL}/(public)/driver-register`);
    await page.waitForTimeout(1000);
  });

  await snap(path.join(MODULES.auth, '06_kyc_pending.png'), async () => {
    await page.goto(`${BASE_URL}/(public)/kyc-pending?vehicleType=TRUCK&licensePlate=29H-888.88`);
    await page.waitForTimeout(1000);
  });

  // Authenticate driver for remaining modules
  const authData = await getDriverSession();
  await applyDriverAuth(authData);

  // ==========================================
  // MODULE 2: COCKPIT & ORDERS
  // ==========================================
  console.log('\n--- 📸 Module 2: Cockpit & Orders ---');

  await snap(path.join(MODULES.cockpit, '01_cockpit_home_online.png'), async () => {
    await page.goto(`${BASE_URL}/orders`);
    await page.waitForTimeout(2000);
  });

  await snap(path.join(MODULES.cockpit, '02_receiving_settings_modal.png'), async () => {
    await page.goto(`${BASE_URL}/orders`);
    await page.waitForTimeout(1500);
    const radiusBtn = page.getByText('Bán kính');
    if (await radiusBtn.count() > 0) {
      await radiusBtn.first().click();
      await page.waitForTimeout(1000);
    }
  });

  await snap(path.join(MODULES.cockpit, '03_incoming_dispatch_modal_offer.png'), async () => {
    await page.goto(`${BASE_URL}/journey-12`);
    await page.waitForTimeout(1200);
    const state1Btn = page.getByTestId('switch-state-1');
    if (await state1Btn.count() > 0) {
      await state1Btn.click();
      await page.waitForTimeout(800);
    }
  });

  await snap(path.join(MODULES.cockpit, '04_incoming_dispatch_urgent.png'), async () => {
    await page.goto(`${BASE_URL}/journey-12`);
    await page.waitForTimeout(1000);
    const state2Btn = page.getByTestId('switch-state-2');
    if (await state2Btn.count() > 0) {
      await state2Btn.click();
      await page.waitForTimeout(800);
    }
  });

  await snap(path.join(MODULES.cockpit, '05_order_board.png'), async () => {
    await page.goto(`${BASE_URL}/board`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.cockpit, '06_order_detail_accepted.png'), async () => {
    await page.goto(`${BASE_URL}/preview-cockpit?scenario=D-DETAIL-ACCEPTED`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.cockpit, '07_order_detail_picking_up.png'), async () => {
    await page.goto(`${BASE_URL}/preview-cockpit?scenario=D-DETAIL-PICKING-UP`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.cockpit, '08_order_detail_in_transit.png'), async () => {
    await page.goto(`${BASE_URL}/preview-cockpit?scenario=D-DETAIL-IN-TRANSIT`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.cockpit, '09_order_detail_proof_required.png'), async () => {
    await page.goto(`${BASE_URL}/preview-cockpit?scenario=D-DETAIL-PROOF-REQUIRED`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.cockpit, '10_order_detail_ready_deliver.png'), async () => {
    await page.goto(`${BASE_URL}/preview-cockpit?scenario=D-DETAIL-READY-DELIVER`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.cockpit, '11_order_detail_delivered_summary.png'), async () => {
    await page.goto(`${BASE_URL}/preview-cockpit?scenario=D-DETAIL-TERMINAL-DELIVERED`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.cockpit, '12_order_incident_modal.png'), async () => {
    await page.goto(`${BASE_URL}/preview-cockpit?scenario=D-DETAIL-ACCEPTED`);
    await page.waitForTimeout(1200);
    const incidentBtn = page.getByTestId('btn-open-incident-modal');
    if (await incidentBtn.count() > 0) {
      await incidentBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  // ==========================================
  // MODULE 3: FINANCE & PERFORMANCE
  // ==========================================
  console.log('\n--- 📸 Module 3: Finance & Performance ---');

  await snap(path.join(MODULES.finance, '01_earnings.png'), async () => {
    await page.goto(`${BASE_URL}/earnings`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.finance, '02_performance.png'), async () => {
    await page.goto(`${BASE_URL}/performance`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.finance, '03_wallet.png'), async () => {
    await page.goto(`${BASE_URL}/wallet`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.finance, '04_wallet_bank_accounts.png'), async () => {
    await page.goto(`${BASE_URL}/wallet/bank-accounts`);
    await page.waitForTimeout(1500);
  });

  // ==========================================
  // MODULE 4: HISTORY & CHAT
  // ==========================================
  console.log('\n--- 📸 Module 4: History & Chat ---');

  await snap(path.join(MODULES.history, '01_trip_history.png'), async () => {
    await page.goto(`${BASE_URL}/history`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.history, '02_chat_inbox.png'), async () => {
    await page.goto(`${BASE_URL}/chat`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.history, '03_chat_order_thread.png'), async () => {
    await page.goto(`${BASE_URL}/chat/LP-8921`);
    await page.waitForTimeout(1500);
  });

  // ==========================================
  // MODULE 5: PROFILE, SETTINGS & LEGAL
  // ==========================================
  console.log('\n--- 📸 Module 5: Profile, Settings & Legal ---');

  await snap(path.join(MODULES.profile, '01_profile.png'), async () => {
    await page.goto(`${BASE_URL}/profile`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.profile, '02_profile_edit.png'), async () => {
    await page.goto(`${BASE_URL}/profile-edit`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.profile, '03_settings.png'), async () => {
    await page.goto(`${BASE_URL}/settings`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.profile, '04_kyc.png'), async () => {
    await page.goto(`${BASE_URL}/kyc`);
    await page.waitForTimeout(1500);
  });

  await snap(path.join(MODULES.profile, '05_contract.png'), async () => {
    await page.goto(`${BASE_URL}/contract`);
    await page.waitForTimeout(1500);
  });

  // ==========================================
  // MODULE 6: SYSTEM & DEV PLAYGROUND
  // ==========================================
  console.log('\n--- 📸 Module 6: System & Dev Playground ---');

  await snap(path.join(MODULES.system, '01_not_found_404.png'), async () => {
    await page.goto(`${BASE_URL}/+not-found`);
    await page.waitForTimeout(1200);
  });

  await snap(path.join(MODULES.system, '02_journey_multistop.png'), async () => {
    await page.goto(`${BASE_URL}/journey-12`);
    await page.waitForTimeout(1200);
    const state7Btn = page.getByTestId('switch-state-7');
    if (await state7Btn.count() > 0) {
      await state7Btn.click();
      await page.waitForTimeout(800);
    }
  });

  await snap(path.join(MODULES.system, '03_journey_night_mode.png'), async () => {
    await page.goto(`${BASE_URL}/journey-12`);
    await page.waitForTimeout(1000);
    const state12Btn = page.getByTestId('switch-state-12');
    if (await state12Btn.count() > 0) {
      await state12Btn.click();
      await page.waitForTimeout(800);
    }
  });

  await browser.close();
  console.log('\n🎉 ĐÃ HOÀN TẤT TẤT CẢ CÁC MÀN HÌNH THEO MODULE!');
}

run().catch((err) => {
  console.error('Lỗi khi thực hiện:', err);
  process.exit(1);
});

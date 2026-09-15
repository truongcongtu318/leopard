/**
 * End-to-end business-flow check against a DEPLOYED demo stack.
 *
 * It talks to the app origins (:8081 customer, :8082 driver) rather than the API
 * port, so it exercises exactly the path a browser takes: the app's own nginx
 * proxies /api/v1 and /socket.io to the API. That is the difference between
 * "the page loads" and "the app can actually do its job".
 *
 * Usage: node infra/scripts/verify-flows.mjs http://<host>
 */

const base = (process.argv[2] ?? 'http://localhost').replace(/\/$/, '');
const CUSTOMER = `${base}:8081`;
const DRIVER = `${base}:8082`;
const OTP = '123456';

const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function api(origin, path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${origin}/api/v1${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text.slice(0, 300);
  }
  return { status: res.status, body: parsed };
}

async function login(origin, phone) {
  const res = await api(origin, '/auth/verify-otp', {
    method: 'POST',
    body: { phone, otp: OTP },
  });
  const token = res.body?.session?.accessToken;
  return { ok: res.status < 300 && Boolean(token), token, role: res.body?.user?.role, raw: res };
}

const ROUTE = {
  pickup: { type: 'PICKUP', address: '12 Nguyễn Huệ, Quận 1', lat: 10.7764, lng: 106.7012 },
  dropoff: { type: 'DROPOFF', address: '200 Nguyễn Văn Cừ, Quận 5', lat: 10.7578, lng: 106.6848 },
  vehicleType: 'VAN',
  hasLoadingSupport: false,
  hasVatInvoice: false,
};

console.log(`\n═══ LEOPARD flow verification against ${base} ═══\n`);

// ── Customer ───────────────────────────────────────────────────────────────
console.log('👤 Customer app (:8081)');
const customerLogin = await login(CUSTOMER, '0900000001');
record('đăng nhập bằng SĐT + OTP', customerLogin.ok, customerLogin.role ?? JSON.stringify(customerLogin.raw.body).slice(0, 120));
if (!customerLogin.ok) process.exit(1);

const customerToken = customerLogin.token;

const me = await api(CUSTOMER, '/me', { token: customerToken });
record('GET /me', me.status === 200, `role=${me.body?.role}`);

const estimate = await api(CUSTOMER, '/orders/estimate', {
  method: 'POST',
  token: customerToken,
  body: { ...ROUTE, stops: [] },
});
const route = estimate.body?.estimate?.routes?.[0] ?? estimate.body?.routes?.[0];
const estimateToken = route?.estimateToken;
record(
  'ước tính giá (POST /orders/estimate)',
  Boolean(estimateToken),
  estimateToken ? `giá=${route.estimatedPriceVnd ?? route.priceLabel}` : JSON.stringify(estimate.body).slice(0, 200),
);

let orderId = null;
if (estimateToken) {
  const created = await api(CUSTOMER, '/orders', {
    method: 'POST',
    token: customerToken,
    body: { ...ROUTE, stops: [], estimateToken },
  });
  orderId = created.body?.id ?? created.body?.order?.id;
  record('tạo đơn (POST /orders)', Boolean(orderId), orderId ? `id=${orderId} status=${created.body?.status}` : JSON.stringify(created.body).slice(0, 200));
}

const orders = await api(CUSTOMER, '/orders', { token: customerToken });
const orderCount = Array.isArray(orders.body) ? orders.body.length : orders.body?.results?.length;
record('danh sách đơn của tôi (GET /orders)', orders.status === 200, `${orderCount ?? '?'} đơn`);

// ── Driver ─────────────────────────────────────────────────────────────────
console.log('\n🚛 Driver app (:8082)');
const driverLogin = await login(DRIVER, '0900000002');
record('đăng nhập bằng SĐT + OTP', driverLogin.ok, driverLogin.role ?? '');
const driverToken = driverLogin.token;

const availability = await api(DRIVER, '/driver/availability', {
  method: 'PATCH',
  token: driverToken,
  body: { availability: 'AVAILABLE' },
});
record('bật nhận đơn (PATCH /driver/availability)', availability.status < 300, `availability=${availability.body?.availability}`);

// Socket.IO through the app's own origin: this is what the namespace strip fix
// has to make work, and it is how dispatch offers reach the driver.
let socketOffer = null;
if (driverToken) {
  // Resolved from the driver app rather than by package name, because this
  // script lives outside any package that declares socket.io-client.
  const { createRequire } = await import('node:module');
  const requireFromDriver = createRequire(
    new URL('../../apps/driver/package.json', import.meta.url),
  );
  let io = null;
  try {
    ({ io } = requireFromDriver('socket.io-client'));
  } catch (error) {
    record('kết nối Socket.IO namespace /dispatch', false, `không nạp được socket.io-client: ${error.message}`);
  }

  if (io) {
    const socket = io(`${DRIVER}/dispatch`, {
      auth: { token: driverToken },
      transports: ['websocket'],
      reconnection: false,
    });
    const connected = await new Promise((resolve) => {
      socket.on('connect', () => resolve(true));
      socket.on('connect_error', (error) => resolve(error?.message ?? false));
      setTimeout(() => resolve(false), 8000);
    });
    record('kết nối Socket.IO namespace /dispatch', connected === true, connected === true ? `id=${socket.id}` : String(connected));

    if (connected === true) {
      // The offer for the order created above should arrive on this channel.
      socketOffer = await new Promise((resolve) => {
        socket.on('dispatch:offer', (payload) => resolve(payload));
        setTimeout(() => resolve(null), 12000);
      });
      record(
        'nhận được dispatch offer qua socket',
        Boolean(socketOffer),
        socketOffer ? `orderId=${socketOffer.orderId}` : 'không nhận được trong 12s',
      );
    }
    socket.close();
  }
}

const dispatchOrderId = socketOffer?.orderId ?? orderId;
if (dispatchOrderId) {
  const accepted = await api(DRIVER, `/driver/orders/${dispatchOrderId}/accept`, {
    method: 'POST',
    token: driverToken,
    body: {},
  });
  record('nhận đơn (POST /driver/orders/:id/accept)', accepted.status < 300, `status=${accepted.body?.status ?? accepted.status}`);

  for (const status of ['PICKING_UP', 'IN_TRANSIT', 'DELIVERED']) {
    const upd = await api(DRIVER, `/driver/orders/${dispatchOrderId}/status`, {
      method: 'POST',
      token: driverToken,
      body: { status },
    });
    record(`cập nhật trạng thái → ${status}`, upd.status < 300, `status=${upd.body?.status ?? upd.status}`);
  }

  const finalOrder = await api(CUSTOMER, `/orders/${dispatchOrderId}`, { token: customerToken });
  const finalStatus = finalOrder.body?.status ?? finalOrder.body?.order?.status;
  record('Customer thấy trạng thái cuối', finalStatus === 'DELIVERED', `status=${finalStatus}`);
} else {
  record('nhận đơn', false, 'không có orderId để test');
}

// ── Summary ────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok);
console.log(`\n═══ ${results.length - failed.length}/${results.length} bước đạt ═══`);
if (failed.length) {
  console.log('Thất bại:');
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}

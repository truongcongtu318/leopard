/**
 * End-to-end business-flow check against a DEPLOYED demo stack.
 *
 * It talks to the app origins rather than the API port, so it exercises exactly
 * the path a browser takes: each app's own nginx proxies /api/v1 and /socket.io
 * to the API. That is the difference between "the page loads" and "the app can
 * actually do its job".
 *
 * Two deployments are supported, and the base URL says which:
 *   node infra/scripts/verify-flows.mjs http://<host>            apps on their own ports
 *   node infra/scripts/verify-flows.mjs https://<tunnel-host>    all apps on one origin
 *
 * The second form is the HTTPS tunnel in infra/scripts/enable-https-tunnel.sh,
 * where the apps are paths (/customer, /driver) rather than ports — the form a
 * client actually uses, and the only one where the browser Geolocation API runs.
 */

const base = (process.argv[2] ?? 'http://localhost').replace(/\/$/, '');
// A port in the base means "each app on its own port"; no port means one origin.
const usesPorts = /:\d+$/.test(base);
const CUSTOMER = usesPorts ? `${base}:8081` : `${base}/customer`;
const DRIVER = usesPorts ? `${base}:8082` : `${base}/driver`;
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

/**
 * DELIVERED is refused with 409 until a proof of delivery exists, so the e-POD
 * has to be uploaded first. Multipart, because the endpoint takes a file.
 */
async function uploadDeliveryProof(origin, orderId, token) {
  // Smallest valid PNG — the media service sniffs the real content type.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), 'pod.png');
  form.append('clientRequestId', `verify-${Date.now()}`);

  const res = await fetch(`${origin}/api/v1/orders/${orderId}/media/delivery-proof`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: form,
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

/**
 * A driver carrying an unfinished trip is BUSY and cannot go back on duty —
 * PATCH /driver/availability answers 409 DRIVER_HAS_ACTIVE_ORDER. That is the
 * intended rule, so a repeatable check has to finish whatever trip it left
 * behind before it starts a new one.
 */
async function settleActiveTrip(origin, token) {
  const active = (await api(origin, '/driver/orders/active', { token })).body;
  const order = active?.id ? active : active?.order;
  if (!order?.id) return null;

  const id = order.id;
  let status = order.status;
  for (const next of ['PICKING_UP', 'IN_TRANSIT']) {
    if (status === 'ACCEPTED' || (status === 'REQUESTED' && next === 'IN_TRANSIT')) {
      const res = await api(origin, `/driver/orders/${id}/status`, { method: 'POST', token, body: { status: next } });
      if (res.status < 300) status = next;
    }
  }
  if (status === 'IN_TRANSIT' || status === 'PICKING_UP') {
    await uploadDeliveryProof(origin, id, token);
    const res = await api(origin, `/driver/orders/${id}/status`, { method: 'POST', token, body: { status: 'DELIVERED' } });
    if (res.status < 300) status = 'DELIVERED';
  }
  return { id, status };
}

async function login(origin, phone) {  const res = await api(origin, '/auth/verify-otp', {
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

// ── Driver comes online first ──────────────────────────────────────────────
// Dispatch only offers an order to a driver who was already AVAILABLE and
// listening when the order was created, so this has to run before the customer
// books. Doing it the other way round is what made the first run report "no
// offer" — the order had been placed before anyone was on duty.
console.log(`🚛 Driver app (${DRIVER}) — lên ca trước`);
const driverLogin = await login(DRIVER, '0900000002');
record('đăng nhập bằng SĐT + OTP', driverLogin.ok, driverLogin.role ?? '');
const driverToken = driverLogin.token;

let availability = await api(DRIVER, '/driver/availability', {
  method: 'PATCH',
  token: driverToken,
  body: { availability: 'AVAILABLE' },
});
if (availability.status === 409 && availability.body?.code === 'DRIVER_HAS_ACTIVE_ORDER') {
  const settled = await settleActiveTrip(DRIVER, driverToken);
  console.log(`  ℹ️  dọn chuyến còn dở từ lần chạy trước: ${settled?.id} → ${settled?.status}`);
  availability = await api(DRIVER, '/driver/availability', {
    method: 'PATCH',
    token: driverToken,
    body: { availability: 'AVAILABLE' },
  });
}
record('bật nhận đơn (PATCH /driver/availability)', availability.status < 300, `availability=${availability.body?.availability ?? JSON.stringify(availability.body).slice(0, 120)}`);

// Being AVAILABLE is not enough: the candidate query also demands a location
// seen within the last 90 seconds, so the driver app pings while on duty (see
// useDriverIdlePing). Without this ping dispatch finds nobody and no offer is
// sent — the order is simply never pushed to anyone.
//
// isStationaryHeartbeat must be false here. That flag means "the driver has not
// moved": the API deliberately skips re-writing the geography point and only
// extends lastKnownAt. Sending true left the driver pinned at whatever
// coordinate the profile already held — for a seeded driver, a Ho Chi Minh City
// address in the manifest, or wherever a previous run put them — so the driver
// was never within range of the order and never received an offer.
const ping = await api(DRIVER, '/driver/location', {
  method: 'PATCH',
  token: driverToken,
  body: { lat: ROUTE.pickup.lat, lng: ROUTE.pickup.lng, isStationaryHeartbeat: false },
});
record('gửi vị trí khi lên ca (PATCH /driver/location)', ping.status < 300, `HTTP ${ping.status}`);

// Socket.IO through the app's own origin: this is what the namespace strip fix
// has to make work, and it is how dispatch offers reach the driver.
const { createRequire } = await import('node:module');
const requireFromDriver = createRequire(new URL('../../apps/driver/package.json', import.meta.url));
let offerPromise = Promise.resolve(null);
let dispatchSocket = null;
try {
  const { io } = requireFromDriver('socket.io-client');
  // Sockets live at the origin, NOT under an app path prefix: the driver app
  // strips /api/v1 off its API base and connects to `${origin}/dispatch`. Using
  // the app path here would ask for /driver/dispatch, which no gateway serves.
  dispatchSocket = io(`${base}/dispatch`, {
    auth: { token: driverToken },
    transports: ['websocket'],
    reconnection: false,
  });
  const connected = await new Promise((resolve) => {
    dispatchSocket.on('connect', () => resolve(true));
    dispatchSocket.on('connect_error', (error) => resolve(error?.message ?? false));
    setTimeout(() => resolve(false), 8000);
  });
  record('kết nối Socket.IO namespace /dispatch', connected === true, connected === true ? `id=${dispatchSocket.id}` : String(connected));

  if (connected === true) {
    offerPromise = new Promise((resolve) => {
      dispatchSocket.on('dispatch:offer', (payload) => resolve(payload));
      setTimeout(() => resolve(null), 25000);
    });
  }
} catch (error) {
  record('kết nối Socket.IO namespace /dispatch', false, `không nạp được socket.io-client: ${error.message}`);
}

// ── Customer ───────────────────────────────────────────────────────────────
console.log(`\n👤 Customer app (${CUSTOMER})`);
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
  record('tạo đơn (POST /orders)', Boolean(orderId), orderId ? `id=${orderId} status=${created.body?.status} vehicleType=${created.body?.vehicleType}` : JSON.stringify(created.body).slice(0, 200));
}

const orders = await api(CUSTOMER, '/orders', { token: customerToken });
const orderCount = Array.isArray(orders.body) ? orders.body.length : orders.body?.results?.length;
record('danh sách đơn của tôi (GET /orders)', orders.status === 200, `${orderCount ?? '?'} đơn`);

// ── Dispatch offer, then the delivery lifecycle ────────────────────────────
console.log('\n📦 Vòng đời đơn');
const socketOffer = await offerPromise;
record(
  'nhận dispatch offer qua socket',
  Boolean(socketOffer),
  socketOffer ? `orderId=${socketOffer.orderId}` : 'không nhận được trong 25s',
);

const dispatchOrderId = socketOffer?.orderId ?? orderId;
if (dispatchOrderId) {
  const accepted = await api(DRIVER, `/driver/orders/${dispatchOrderId}/accept`, {
    method: 'POST',
    token: driverToken,
    body: {},
  });
  record('nhận đơn (POST /driver/orders/:id/accept)', accepted.status < 300, `status=${accepted.body?.status ?? accepted.status}`);

  for (const status of ['PICKING_UP', 'IN_TRANSIT']) {
    const upd = await api(DRIVER, `/driver/orders/${dispatchOrderId}/status`, {
      method: 'POST',
      token: driverToken,
      body: { status },
    });
    record(`cập nhật trạng thái → ${status}`, upd.status < 300, `status=${upd.body?.status ?? upd.status}`);
  }

  // DELIVERED is refused without a proof of delivery (409), so the e-POD has to
  // be uploaded first — the rule lives in assertOrderTransition.
  const proof = await uploadDeliveryProof(DRIVER, dispatchOrderId, driverToken);
  record('tải e-POD (POST /orders/:id/media/delivery-proof)', proof.status < 300, `HTTP ${proof.status}`);

  const delivered = await api(DRIVER, `/driver/orders/${dispatchOrderId}/status`, {
    method: 'POST',
    token: driverToken,
    body: { status: 'DELIVERED' },
  });
  record('cập nhật trạng thái → DELIVERED', delivered.status < 300, `status=${delivered.body?.status ?? JSON.stringify(delivered.body).slice(0, 120)}`);

  const finalOrder = await api(CUSTOMER, `/orders/${dispatchOrderId}`, { token: customerToken });
  const finalStatus = finalOrder.body?.status ?? finalOrder.body?.order?.status;
  record('Customer thấy trạng thái cuối', finalStatus === 'DELIVERED', `status=${finalStatus}`);
} else {
  record('nhận đơn', false, 'không có orderId để test');
}

if (dispatchSocket) dispatchSocket.close();

// ── Summary ────────────────────────────────────────────────────────────────
const failed = results.filter((r) => !r.ok);
console.log(`\n═══ ${results.length - failed.length}/${results.length} bước đạt ═══`);
if (failed.length) {
  console.log('Thất bại:');
  for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
  process.exit(1);
}

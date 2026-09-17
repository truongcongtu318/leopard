/* global process, console, fetch */
import pg from 'pg';

const DB_URL = process.env.DATABASE_URL || 'postgresql://leopard:leopard_local@localhost:5432/leopard?schema=public';
const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';

async function main() {
  const pool = new pg.Pool({ connectionString: DB_URL });

  console.log('🚀 Đang chuẩn bị tạo đơn hàng thử nghiệm cho tài xế Trần Minh Quân...');

  // 1. Đồng bộ trạng thái tài xế Trần Minh Quân: AVAILABLE tại Hà Nội
  await pool.query(`
    UPDATE "DriverProfile"
    SET "lastKnownAt" = NOW(),
        availability = 'AVAILABLE',
        "vehicleType" = 'VAN',
        "lastKnownLocation" = ST_SetSRID(ST_MakePoint(105.834, 21.0278), 4326)::geography
    WHERE "userId" = '22222222-2222-4222-8222-222222222222'
  `);
  console.log('✅ Tài xế Trần Minh Quân (+840000000002): ĐÃ SẴN SÀNG (AVAILABLE)');

  // 2. Đăng nhập tài khoản khách hàng demo
  const loginRes = await fetch(`${API_URL}/auth/login/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountId: 'customer' })
  });
  if (!loginRes.ok) {
    throw new Error(`Đăng nhập khách hàng thất bại: ${loginRes.status}`);
  }
  const loginData = await loginRes.json();
  const customerToken = loginData.session.accessToken;
  console.log('✅ Đăng nhập khách hàng tạo đơn thành công');

  // 3. Ước tính lộ trình
  const estimatePayload = {
    pickup: {
      address: '124 Hoàng Hoa Thám, Ba Đình, Hà Nội',
      lat: 21.0285,
      lng: 105.835,
      type: 'PICKUP'
    },
    dropoff: {
      address: '58 Trần Duy Hưng, Cầu Giấy, Hà Nội',
      lat: 21.0125,
      lng: 105.798,
      type: 'DROPOFF'
    },
    stops: [],
    vehicleType: 'VAN',
    hasLoadingSupport: true,
    hasVatInvoice: false
  };

  const estimateRes = await fetch(`${API_URL}/orders/estimate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    },
    body: JSON.stringify(estimatePayload)
  });
  if (!estimateRes.ok) {
    throw new Error(`Tính cước lộ trình thất bại: ${estimateRes.status}`);
  }
  const estimateData = await estimateRes.json();
  const route = estimateData.routes[0];
  console.log(`✅ Tính cước thành công: ${route.estimatedPriceVnd.toLocaleString('vi-VN')} ₫ (${(route.distanceM / 1000).toFixed(1)} km)`);

  // 4. Tạo đơn hàng và kích hoạt nổ đơn (Dispatch)
  const orderRes = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      ...estimatePayload,
      cargoNote: '24 thùng sơn nước (800kg) - Chở thùng kín',
      estimateToken: route.estimateToken
    })
  });
  if (!orderRes.ok) {
    const errText = await orderRes.text();
    throw new Error(`Tạo đơn hàng thất bại: ${errText}`);
  }
  const order = await orderRes.json();
  console.log(`🎉 ĐÃ NỔ ĐƠN THÀNH CÔNG!`);
  console.log(`   • Mã đơn hàng: ${order.id}`);
  console.log(`   • Điểm lấy: 124 Hoàng Hoa Thám, Ba Đình (Cách tài xế ~150m)`);
  console.log(`   • Điểm giao: 58 Trần Duy Hưng, Cầu Giấy`);
  console.log(`   • Cước phí: ${order.priceVnd.toLocaleString('vi-VN')} ₫`);
  console.log(`   • Hàng hóa: 24 thùng sơn nước (800kg)`);

  // 5. Kiểm tra dispatch offer cho tài xế Trần Minh Quân
  const offerRes = await pool.query(`
    SELECT id, status, "offeredAt" 
    FROM "OrderDispatchOffer" 
    WHERE "orderId" = $1 AND "driverId" = '22222222-2222-4222-8222-222222222222'
  `, [order.id]);

  if (offerRes.rows.length > 0) {
    console.log(`📢 Đã gửi tín hiệu nổ đơn (Dispatch Offer) tới máy tài xế Trần Minh Quân!`);
  }

  await pool.end();
}

main().catch(console.error);

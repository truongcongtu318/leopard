# LEOPARD — Hướng dẫn Deploy Demo & Bàn giao

## Yêu cầu hệ thống

| Yêu cầu | Tối thiểu |
|---|---|
| OS | Ubuntu 22.04+ / Debian 12+ / bất kỳ Linux có Docker |
| RAM | 4 GB |
| Disk | 10 GB trống |
| Docker | 24.0+ |
| Docker Compose | v2.20+ |
| Ports mở | 80, 3000, 3002, 8081, 8082 |

## Quick Start (1 lệnh)

```bash
# 1. Clone repo
git clone <repo-url> leopard && cd leopard

# 2. Deploy
./infra/scripts/deploy-demo.sh
```

Script tự động:
- Tạo `.env.prod` với random secrets
- Build 6 Docker containers
- Chạy database migration + seed data
- Health check tất cả services
- In bảng truy cập

## Truy cập

| Ứng dụng | URL | Port trực tiếp |
|---|---|---|
| **Demo Portal** | `http://<IP>/` | `:80` |
| **Admin Console** | `http://<IP>/login` | `:3002` |
| **Customer App** | `http://<IP>/customer/` | `:8081` |
| **Driver App** | `http://<IP>/driver/` | `:8082` |
| **API Docs** | `http://<IP>:3000/api/docs` | `:3000` |

## Tài khoản Demo

| Vai trò | Input đăng nhập | Cách dùng |
|---|---|---|
| **Admin** | `admin` | Nhập vào ô đăng nhập, bấm Login |
| **Driver** | `driver` | Nhập vào ô đăng nhập, bấm Login |
| **Customer** | `customer` | Nhập vào ô đăng nhập, bấm Login |

## Luồng test đề xuất

1. **Customer App** → đăng nhập `customer` → Đặt đơn hàng mới (chọn xe, điểm đón/trả)
2. **Driver App** → đăng nhập `driver` → Bật duty → Nhận đơn dispatch tự động
3. Driver chuyển trạng thái: **Accepted → Picking Up → In Transit → Delivered** (kèm chữ ký e-POD)
4. **Admin Console** → đăng nhập `admin` → Theo dõi đơn hàng trên bản đồ real-time
5. Kiểm tra chi tiết đơn, thanh toán, hóa đơn VAT

## Quản lý

```bash
# Xem logs
docker compose -f docker-compose.prod.yml logs -f

# Xem logs 1 service
docker compose -f docker-compose.prod.yml logs -f api

# Restart
docker compose -f docker-compose.prod.yml restart

# Dừng
docker compose -f docker-compose.prod.yml down

# Reset database (xóa sạch, seed lại)
./infra/scripts/deploy-demo.sh --reset-db

# Build lại từ đầu
./infra/scripts/deploy-demo.sh --rebuild
```

## Cấu trúc Services

```
┌─────────────────────────────────────┐
│  Gateway (Nginx :80)                │
│  ├─ /          → Landing Portal     │
│  ├─ /admin/    → Admin :3002        │
│  ├─ /customer/ → Customer :8081     │
│  ├─ /driver/   → Driver :8082       │
│  └─ /api/v1/   → API :3000         │
├─────────────────────────────────────┤
│  Admin    (Next.js standalone)      │
│  Customer (Expo Web + Nginx)        │
│  Driver   (Expo Web + Nginx)        │
├─────────────────────────────────────┤
│  API      (NestJS + Socket.IO)      │
├─────────────────────────────────────┤
│  PostgreSQL + PostGIS               │
└─────────────────────────────────────┘
```

## Troubleshooting

**Port đã bị chiếm:**
```bash
# Kiểm tra
sudo lsof -i :80 -i :3000 -i :3002 -i :8081 -i :8082
# Đổi port trong .env.prod: GATEWAY_PORT, API_PORT, ADMIN_PORT
```

**API không healthy:**
```bash
docker compose -f docker-compose.prod.yml logs api | tail -50
```

**Database migration lỗi:**
```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy --schema prisma/schema.prisma
```

**Xóa hoàn toàn và bắt đầu lại:**
```bash
docker compose -f docker-compose.prod.yml down -v  # xóa cả volume
./infra/scripts/deploy-demo.sh --rebuild
```

## Lưu ý

- ⚠️ Đây là môi trường **demo/pilot**, không dùng cho production thật
- Dữ liệu hiển thị nhãn "Dữ liệu mô phỏng" / "ETA dự kiến"
- Demo login bật chế độ 1-click, không cần OTP thật
- File uploads lưu local trong container, mất khi xóa container (không ảnh hưởng demo)

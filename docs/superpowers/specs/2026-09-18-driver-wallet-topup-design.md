# Driver Wallet Topup & Platform Fee Implementation Spec

## 1. Overview & Business Rules
- **Platform Fee (Phí sàn)**: 20% trên mỗi đơn cước vận chuyển. Tài xế thực nhận 80%.
- **Đơn khách thanh toán VietQR (payOS)**: Tiền cước 100% vào tài khoản Admin. Ví tài xế được cộng 80% giá trị cước đơn hàng (thu nhập thực tế có thể rút).
- **Đơn khách thanh toán Tiền mặt (CASH)**: Tài xế đã giữ 100% tiền mặt từ khách. Ví tài xế bị trừ 20% giá trị cước đơn hàng (phí hoa hồng sàn).
- **Lệnh rút tiền (Withdrawal)**: Trừ số tiền tài xế yêu cầu rút khi ở trạng thái PENDING hoặc APPROVED.
- **Nạp tiền vào ví tài xế (Top-up qua payOS)**:
  - Tài xế tạo yêu cầu nạp tiền (tối thiểu 50.000 VNĐ).
  - Hệ thống gọi payOS tạo VietQR thanh toán.
  - Khi payOS bắn webhook xác nhận chuyển khoản thành công, hệ thống cộng 100% số tiền nạp vào số dư ví tài xế.

## 2. Công thức tính Số dư ví khả dụng (`availableBalanceVnd`)
```
availableBalanceVnd = (Tổng tiền Nạp ví COMPLETED)
                    + (Tổng cước các đơn VietQR DELIVERED * 0.8)
                    - (Tổng cước các đơn CASH DELIVERED * 0.2)
                    - (Tổng tiền các lệnh Rút PENDING hoặc APPROVED)
```

## 3. Database Schema Changes (`apps/api/prisma/schema.prisma`)
- Thêm `model DriverDeposit`:
  - `id`: UUID Primary Key
  - `driverId`: UUID (foreign key -> User)
  - `amountVnd`: Int
  - `status`: `DepositStatus` (PENDING, COMPLETED, CANCELLED, EXPIRED)
  - `payosOrderCode`: BigInt (unique)
  - `qrPayload`: String?
  - `clientRequestId`: String?
  - `completedAt`: DateTime?
  - `createdAt`, `updatedAt`
- Quan hệ `User.driverDeposits` -> `DriverDeposit[]`.

## 4. API Endpoints
- `POST /api/v1/driver/wallet/topup`: Tạo giao dịch nạp tiền ví, gọi PayOsPaymentProvider sinh QR.
- `GET /api/v1/driver/wallet`: Trả về `availableBalanceVnd` theo công thức mới, thông tin ví và danh sách giao dịch.
- `POST /api/v1/payments/webhook/payos`: Mở rộng để nhận diện nếu `orderCode` thuộc về `DriverDeposit` thì cập nhật trạng thái `COMPLETED` và bắn socket realtime.

## 5. Mobile UI (`apps/driver`)
- Thêm nút "Nạp tiền ví" trên `DriverWalletScreen`.
- Modal chọn số tiền nạp (50.000đ, 100.000đ, 200.000đ, 500.000đ hoặc tự nhập).
- Màn hình/modal hiển thị mã VietQR payOS và hướng dẫn quét mã chuyển khoản.
- Tự động nhận diện khi nạp thành công và cập nhật lại số dư ví.

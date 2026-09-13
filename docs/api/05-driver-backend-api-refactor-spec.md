# Kế Hoạch Cải Thiện & Thiết Lập Driver Backend API (LEOPARD System)

Tài liệu đặc tả kỹ thuật chi tiết (Technical Specification & API Refactor) cho phân hệ Backend API của Tài xế (Driver API), giải quyết triệt để các lỗ hổng P0/P1, khắc phục sai lệch nghiệp vụ thực tế và thiết lập hệ thống API chuẩn mực cho LEOPARD Logistics.

---

## 1. Bối Cảnh & Mục Tiêu Cải Thiện

Qua đợt audit toàn diện hệ thống (tham chiếu [09-system-audit-loopholes-and-business-logic-flaws-report.md](file:///d:/leopard/docs/testing/09-system-audit-loopholes-and-business-logic-flaws-report.md)), phân hệ Driver Backend API hiện tại đang gặp các vấn đề cốt tử:

1. **Lỗ hổng Matching & Dispatch (P0-1)**:
   - Model `Order` trong cơ sở dữ liệu thiếu trường `vehicleType`, `cargoWeightKg`, `cargoNote`.
   - Hàm tìm tài xế khả dụng (`findNearbyAvailableDrivers`) và danh sách đơn (`findAvailableOrders`) không lọc theo loại phương tiện (`vehicleType`).
   - Service nhận đơn (`AcceptOrderService`) không kiểm tra đối soát giữa xe của tài xế và yêu cầu của đơn hàng, dẫn đến nguy cơ tài xế xe máy nhận chở hàng 2 tấn của xe tải.
2. **Thiếu Route Thoát Khủng Hoảng / Incident Deadlock (P0-4)**:
   - State machine chỉ cho phép tài xế đi một chiều: `REQUESTED -> ACCEPTED -> PICKING_UP -> IN_TRANSIT -> DELIVERED`.
   - Thiếu hoàn toàn API báo cáo sự cố (hỏng xe, tai nạn, khách bom hàng, người nhận từ chối, sai địa chỉ).
   - Khi xảy ra sự cố ngoài thực địa, tài xế bị kẹt vĩnh viễn ở trạng thái `BUSY`, đơn hàng rơi vào trạng thái treo (limbo), không thể hoàn thành hoặc hủy.
3. **Lộ Lọt Thông Tin & Thiếu Contact Động (P0-2)**:
   - API không trả số điện thoại khách hàng/người nhận theo ngữ cảnh chặn đường, khiến Driver App phải fallback về chuỗi rác dẫn đến lỗi hoặc gọi số tổng đài giả lập `19001234`.
   - Cần cơ chế Dynamic Contact Projection theo từng chặng (Pickup: số người gửi; Dropoff: số người nhận; Delivered/Cancelled: che số để bảo vệ quyền riêng tư theo Nghị định 13/2023/NĐ-CP).
4. **Onboarding / KYC Khóa Chặt Người Dùng (P1-1)**:
   - `driver-register.tsx` gọi `/driver/apply` trước khi upload 3 giấy tờ KYC. Nếu upload giấy tờ bị lỗi mạng, việc thử lại bị chặn bởi mã `409 DRIVER_APPLICATION_PENDING`.
   - Admin duyệt tài xế (`AdminDriverReviewService.approve`) chưa có rào chắn kiểm tra sự tồn tại của đủ 3 loại giấy tờ bắt buộc (`LICENSE`, `VEHICLE_REGISTRATION`, `ID_CARD`).
5. **Mất Tích Khỏi Radar Điều Phối & Thiếu Heartbeat (P1-3)**:
   - Query radar quét tài xế có `lastKnownAt > NOW() - INTERVAL '90 seconds'`.
   - Endpoint `PATCH /driver/location` hiện đang **bị thiếu** trong `DriversController` (mặc dù đã có trong service và e2e test).
   - Thiết bị tài xế đứng yên không gửi tọa độ nếu chỉ lọc theo delta khoảng cách (> 25m), dẫn đến việc tài xế sẵn sàng nhận đơn nhưng biến mất khỏi hệ thống sau 90 giây.
6. **Ép Buộc Trạng Thái Sẵn Sàng (P1-4)**:
   - Backend tự ý cập nhật `availability: AVAILABLE` khi đơn chuyển `DELIVERED` hoặc khi đơn bị hủy bởi khách (`CancelOrderService`), bất chấp tài xế đã hết ca hoặc muốn nghỉ ngơi.
7. **Lỗ Hổng Bằng Chứng Giao Hàng (P1-5)**:
   - `MediaService.uploadMedia` cho phép tài xế upload bằng chứng giao hàng mà không kiểm tra trạng thái đơn hàng (cho phép upload ngay khi đơn vừa `ACCEPTED` hoặc sau khi đã `CANCELLED`).
8. **Thiếu Realtime Event khi Khách Hủy Đơn (P1-6)**:
   - `CancelOrderService` không phát sự kiện Socket `order:cancelled` đến room của tài xế được phân công, khiến tài xế vẫn tiếp tục di chuyển vô ích cho đến khi gặp lỗi xung đột `409`.

---

## 2. Thiết Kế Cơ Sở Dữ Liệu & Schema Migration

Để hỗ trợ đầy đủ các API cải tiến, Prisma Schema (`apps/api/prisma/schema.prisma`) cần bổ sung và điều chỉnh các model sau:

```prisma
// 1. Mở rộng OrderStatus để hỗ trợ luồng sự cố và trả hàng
enum OrderStatus {
  REQUESTED
  ACCEPTED
  PICKING_UP
  IN_TRANSIT
  DELIVERED
  CANCELLED
  INCIDENT_CANCELLED // Đơn bị hủy do sự cố bất khả kháng từ tài xế/hiện trường
  RETURNING          // Đang hoàn trả hàng về điểm gửi (nếu giao thất bại)
  RETURNED           // Đã hoàn trả hàng về điểm gửi an toàn
}

// 2. Bổ sung trường loại phương tiện, tải trọng và sự cố vào Order
model Order {
  id                  String               @id @default(uuid()) @db.Uuid
  customerId          String               @db.Uuid
  clientRequestId     String?
  driverId            String?              @db.Uuid
  vehicleType         VehicleType          @default(MOTORBIKE) // BẮT BUỘC: để match đúng tài xế
  cargoWeightKg       Int?                                     // Trọng lượng hàng hóa (kg)
  cargoNote           String?                                  // Ghi chú hàng hóa đặc biệt
  status              OrderStatus          @default(REQUESTED)
  routeSnapshot       Json?
  providerSource      ProviderSource?
  distanceMeters      Int?
  durationSeconds     Int?
  priceVnd            Int?
  etaSeconds          Int?
  proofMediaId        String?              @db.Uuid            // ID ảnh bằng chứng giao hàng thành công
  incidentReason      String?                                  // Lý do báo cáo sự cố (nếu có)
  incidentNote        String?                                  // Ghi chú chi tiết sự cố
  incidentReportedAt  DateTime?            @db.Timestamptz(3)
  acceptedAt          DateTime?            @db.Timestamptz(3)
  pickingUpAt         DateTime?            @db.Timestamptz(3)
  inTransitAt         DateTime?            @db.Timestamptz(3)
  deliveredAt         DateTime?            @db.Timestamptz(3)
  cancelledAt         DateTime?            @db.Timestamptz(3)
  createdAt           DateTime             @default(now()) @db.Timestamptz(3)
  updatedAt           DateTime             @default(now()) @updatedAt @db.Timestamptz(3)
  
  customer            User                 @relation("CustomerOrders", fields: [customerId], references: [id], onDelete: Restrict)
  driver              User?                @relation("DriverOrders", fields: [driverId], references: [id], onDelete: Restrict)
  stops               OrderStop[]
  statusHistory       OrderStatusHistory[]
  trackingPoints      TrackingPoint[]
  mediaObjects        MediaObject[]
  paymentIntents      PaymentIntent[]
  invoice             Invoice?

  @@unique([customerId, clientRequestId])
  @@index([customerId, createdAt(sort: Desc)])
  @@index([status, vehicleType, createdAt(sort: Desc)]) // Index tối ưu cho query available orders
}

// 3. Bổ sung thông tin liên hệ và ghi chú vào OrderStop
model OrderStop {
  id           String                               @id @default(uuid()) @db.Uuid
  orderId      String                               @db.Uuid
  type         StopType
  sequence     Int
  address      String
  contactName  String?                              @db.VarChar(120) // Tên người liên hệ tại điểm dừng
  contactPhone String?                              @db.VarChar(32)  // SĐT người liên hệ tại điểm dừng
  note         String?                                               // Hướng dẫn giao/nhận (vd: bấm chuông lầu 2)
  location     Unsupported("geography(Point,4326)")
  createdAt    DateTime                             @default(now()) @db.Timestamptz(3)
  updatedAt    DateTime                             @default(now()) @updatedAt @db.Timestamptz(3)
  order        Order                                @relation(fields: [orderId], references: [id], onDelete: Restrict)

  @@unique([orderId, sequence])
}

// 4. Bổ sung cờ duy trì trạng thái ngoại tuyến vào DriverProfile
model DriverProfile {
  id                   String                                @id @default(uuid()) @db.Uuid
  userId               String                                @unique @db.Uuid
  availability         DriverAvailability                    @default(OFFLINE)
  autoOfflineOnComplete Boolean                              @default(false) // Không tự động bật AVAILABLE sau khi xong đơn
  vehicleType          VehicleType
  licensePlate         String?                               @db.VarChar(32)
  licenseNumber        String?                               @db.VarChar(64)
  submittedAt          DateTime?                             @db.Timestamptz(3)
  reviewedAt           DateTime?                             @db.Timestamptz(3)
  reviewedById         String?                               @db.Uuid
  rejectionReason      String?
  contractVersion      String?                               @db.VarChar(32)
  contractSignedAt     DateTime?                             @db.Timestamptz(3)
  lastKnownLocation    Unsupported("geography(Point,4326)")?
  lastKnownAt          DateTime?                             @db.Timestamptz(3)
  createdAt            DateTime                              @default(now()) @db.Timestamptz(3)
  updatedAt            DateTime                              @default(now()) @updatedAt @db.Timestamptz(3)
  user                 User                                  @relation(fields: [userId], references: [id], onDelete: Restrict)
  documents            DriverDocument[]
  contracts            DriverContract[]

  @@index([availability, vehicleType, lastKnownAt]) // Index tối ưu cho không gian radar
}
```

---

## 3. Đặc Tả Chi Tiết Các Endpoint Backend Driver API

Base Path: `/api/v1/driver`  
Bảo mật: Mọi request (trừ các route xem hợp đồng mẫu) yêu cầu Bearer JWT Token với Guard `AccessTokenGuard`, `RoleGuard` (`DRIVER`), và `AllowUserStatuses`.

### 3.1. Phân Hệ Đăng Ký & Xác Minh Danh Tính (Onboarding & KYC)

#### A. `POST /api/v1/driver/apply`
* **Mục đích**: Nộp hồ sơ đăng ký tài xế, ký hợp đồng điện tử và chuyển tài khoản sang `PENDING_APPROVAL`.
* **Cải tiến khắc phục lỗi P1-1 (Idempotent / Resumable Apply)**:
  * Nếu tài khoản đã có hồ sơ đang ở trạng thái `PENDING_APPROVAL`, thay vì ném lỗi `409 DRIVER_APPLICATION_PENDING` làm kẹt người dùng, API sẽ:
    * Cho phép cập nhật lại thông tin phương tiện/biển số/chữ ký nếu hồ sơ chưa được Admin bắt đầu duyệt.
    * Trả về kết quả hồ sơ kèm theo danh sách trạng thái giấy tờ đã nộp (`documentsStatus`) để Client tiếp tục bước tải lên giấy tờ bị dở dang.
* **Request Headers**: `Authorization: Bearer <token>`
* **Request Body** (`ApplyDriverDto`):
  ```json
  {
    "name": "Nguyễn Văn Tuấn",
    "vehicleType": "MOTORBIKE",
    "licensePlate": "59P1-12345",
    "licenseNumber": "790123456789",
    "contractAccepted": true,
    "signature": "Nguyễn Văn Tuấn" // hoặc chuỗi base64 data:image/png;base64,...
  }
  ```
* **Response (200 OK hoặc 201 Created)**:
  ```json
  {
    "status": "PENDING_APPROVAL",
    "vehicleType": "MOTORBIKE",
    "licensePlate": "59P1-12345",
    "licenseNumber": "790123456789",
    "submittedAt": "2026-09-11T08:30:00.000Z",
    "reviewedAt": null,
    "rejectionReason": null,
    "contractVersion": "v1",
    "contractSignedAt": "2026-09-11T08:30:00.000Z",
    "documentsSummary": {
      "hasLicense": false,
      "hasVehicleRegistration": false,
      "hasIdCard": false,
      "hasVehiclePhoto": false,
      "isKycComplete": false
    }
  }
  ```

#### B. `GET /api/v1/driver/application`
* **Mục đích**: Kiểm tra tiến độ duyệt hồ sơ và tình trạng nộp giấy tờ KYC.
* **Response (200 OK)**: Cung cấp đầy đủ trường dữ liệu bao gồm cả `documentsSummary` và chi tiết từng loại giấy tờ đã upload.

#### C. `POST /api/v1/driver/documents`
* **Mục đích**: Tải lên tài liệu KYC dạng multipart form-data.
* **Cải tiến**:
  * Các loại giấy tờ hợp lệ: `LICENSE` (GPLX), `VEHICLE_REGISTRATION` (Cà-vẹt xe), `ID_CARD` (CCCD), `VEHICLE_PHOTO` (Ảnh xe chụp kèm biển số).
  * Kiểm soát dung lượng file: Bắt lỗi ở tầng multer/busboy và trả về chuẩn `413 MEDIA_FILE_TOO_LARGE` thay vì để Express ngắt kết nối `ECONNRESET`.
  * Idempotency qua `clientRequestId`: Nếu cùng 1 request gửi lại, trả về bản ghi đã lưu.
* **Response (201 Created)**:
  ```json
  {
    "id": "e5c6a1b2-...",
    "type": "LICENSE",
    "storageKey": "drivers/.../license/uuid.jpg",
    "contentType": "image/jpeg",
    "sizeBytes": 2048576,
    "createdAt": "2026-09-11T08:32:00.000Z"
  }
  ```

#### D. Rào chắn phê duyệt của Admin (`AdminDriverReviewService.approve`)
* **Bắt buộc**: Trước khi Admin bấm duyệt tài xế (`ACTIVE`), Backend bắt buộc phải kiểm tra:
  ```ts
  const uploadedTypes = await tx.driverDocument.findMany({
    where: { driverProfileId: driver.driverProfile.id },
    select: { type: true },
  });
  const typeSet = new Set(uploadedTypes.map(d => d.type));
  const REQUIRED_TYPES: DriverDocumentType[] = ['LICENSE', 'VEHICLE_REGISTRATION', 'ID_CARD'];
  const missing = REQUIRED_TYPES.filter(t => !typeSet.has(t));
  if (missing.length > 0) {
    throw new DomainError('KYC_DOCUMENTS_INCOMPLETE', 422, `Hồ sơ chưa đủ giấy tờ bắt buộc: ${missing.join(', ')}`);
  }
  ```

---

### 3.2. Phân Hệ Radar & Định Vị Thời Gian Thực (Availability & Location Radar)

#### A. `PATCH /api/v1/driver/location` (Sửa Lỗi Thiếu Route Controller)
* **Vấn đề đã phát hiện**: `drivers.service.ts` có hàm `updateLocation(actor, dto)`, `update-location.e2e-spec.ts` có test, nhưng trong `drivers.controller.ts` **chưa khai báo decorator `@Patch('location')`**!
* **Đặc tả thiết lập**:
  ```ts
  @Patch('location')
  @RequireRoles('DRIVER')
  @HttpCode(HttpStatus.OK)
  updateLocation(
    @CurrentUser() actor: AuthenticatedActor,
    @Body() dto: UpdateDriverLocationDto,
  ) {
    return this.driversService.updateLocation(actor, dto);
  }
  ```
* **Request Body** (`UpdateDriverLocationDto`):
  ```json
  {
    "lat": 10.7326,
    "lng": 106.7168,
    "accuracyM": 5.2,
    "isStationaryHeartbeat": true // True nếu tài xế đứng yên một chỗ > 45 giây
  }
  ```
* **Logic xử lý Backend**:
  * Xác thực tọa độ hợp lệ: `lat` $\in [-90, 90]$, `lng` $\in [-180, 180]$.
  * Cập nhật tức thời `lastKnownLocation = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography` và `lastKnownAt = NOW()`.
  * Nếu `isStationaryHeartbeat === true`: Chỉ gia hạn `lastKnownAt` để duy trì radar 90 giây mà không cần kích hoạt lại các logic reverse geocoding tốn tài nguyên.

#### B. `PATCH /api/v1/driver/availability`
* **Mục đích**: Bật/Tắt trạng thái trực tuyến của tài xế.
* **Cải tiến**: Bổ sung cờ `autoOfflineOnComplete` vào DTO:
  ```json
  {
    "availability": "OFFLINE", // "AVAILABLE" | "OFFLINE"
    "autoOfflineOnComplete": false // Tùy chọn: ghi nhớ ý định nghỉ ca sau khi giao xong đơn đang chạy
  }
  ```
* **Quy tắc nghiệp vụ**:
  * Không cho phép tài xế tự set `BUSY` thủ công (chỉ hệ thống mới được set khi nhận đơn).
  * Không cho phép chuyển `AVAILABLE` nếu tài khoản chưa được duyệt (`status !== 'ACTIVE'`).
  * Không cho phép chuyển `OFFLINE` nếu đang có đơn hàng trong quá trình giao (`ACCEPTED`, `PICKING_UP`, `IN_TRANSIT`). Trường hợp tài xế muốn kết thúc ca làm sau đơn này, set `autoOfflineOnComplete: true`.

---

### 3.3. Phân Hệ Khám Phá & Tiếp Nhận Đơn Hàng (Order Matching & Acceptance)

#### A. `GET /api/v1/driver/orders/available`
* **Mục đích**: Lấy danh sách các đơn hàng mới đang chờ tài xế tiếp nhận (`status = 'REQUESTED'`).
* **Cải tiến lọc theo loại xe & bán kính**:
  * Backend lấy `driverProfile.vehicleType` của tài xế đang gọi API.
  * Chỉ query những đơn có `order.vehicleType === driverProfile.vehicleType` (Xe máy chỉ thấy đơn xe máy, xe tải chỉ thấy đơn xe tải).
  * Tùy chọn lọc theo khoảng cách địa lý nếu tài xế có `lastKnownLocation`: sắp xếp theo khoảng cách từ tài xế đến điểm lấy hàng (`pickup`) tăng dần.
* **Query Parameters**:
  * `page` (default: 1), `pageSize` (default: 20, max: 50).
  * `radiusKm` (tùy chọn, vd: 10km).
* **Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "order-uuid-1",
        "status": "REQUESTED",
        "vehicleType": "MOTORBIKE",
        "cargoWeightKg": 15,
        "cargoNote": "Thùng trái cây tươi, nhẹ tay",
        "distanceMeters": 4200,
        "durationSeconds": 900,
        "priceVnd": 45000,
        "etaSeconds": 300,
        "stops": [
          {
            "id": "stop-1",
            "type": "PICKUP",
            "sequence": 1,
            "address": "123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
            "lat": 10.7769,
            "lng": 106.7009
          },
          {
            "id": "stop-2",
            "type": "DROPOFF",
            "sequence": 2,
            "address": "456 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
            "lat": 10.7745,
            "lng": 106.7032
          }
        ],
        "createdAt": "2026-09-11T08:45:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "totalPages": 1
  }
  ```
  *(Lưu ý bảo mật: Tại trạng thái `REQUESTED`, danh sách KHÔNG trả số điện thoại cá nhân của người gửi/nhận để chống lộ lọt thông tin khách hàng cho các tài xế chưa nhận đơn).*

#### B. `POST /api/v1/driver/orders/:id/accept`
* **Mục đích**: Tài xế nhận đơn hàng.
* **Cải tiến logic trong transaction**:
  ```ts
  // 1. Kiểm tra tài khoản tài xế ACTIVE
  // 2. Lấy driverProfile: vehicleType, availability
  // 3. Khóa dòng kiểm tra:
  //    - order.status === 'REQUESTED'
  //    - order.driverId === null
  //    - order.vehicleType === driverProfile.vehicleType (BẮT BUỘC KHỚP LOẠI XE)
  // 4. Nếu không khớp vehicleType: throw DomainError('VEHICLE_TYPE_MISMATCH', 422, 'Loại xe không phù hợp với yêu cầu của đơn hàng');
  // 5. Cập nhật driverProfile.availability = 'BUSY'
  // 6. Cập nhật order: driverId = actor.userId, status = 'ACCEPTED', acceptedAt = NOW()
  // 7. Tạo OrderStatusHistory
  // 8. Commit và phát event realtime order:accepted tới Customer và Dispatch Namespace
  ```
* **Mã lỗi xử lý chuẩn mực**:
  * `404 RESOURCE_NOT_FOUND`: Không tìm thấy đơn hàng.
  * `409 ORDER_ALREADY_ASSIGNED`: Đơn hàng đã được tài xế khác nhận trước.
  * `409 DRIVER_BUSY`: Tài xế đang thực hiện đơn khác.
  * `422 VEHICLE_TYPE_MISMATCH`: Loại phương tiện của tài xế không trùng với đơn hàng.

---

### 3.4. Phân Hệ Chi Tiết Đơn Hàng & Bảo Mật Danh Tính (Dynamic Contact Projection)

#### `GET /api/v1/driver/orders/active` & `GET /api/v1/orders/:id`
* **Mục tiêu**: Trả về dữ liệu chi tiết của đơn hàng đang chạy, kèm theo số điện thoại được giải mã linh hoạt theo giai đoạn hành trình để bảo vệ quyền riêng tư người dùng.
* **Quy tắc chiếu thông tin liên lạc (Contact Projection Matrix)**:

| Trạng thái đơn | Điểm Pickup (`OrderStop 1`) | Điểm Dropoff (`OrderStop 2+`) | Ghi chú cuộc gọi |
| :--- | :--- | :--- | :--- |
| **`REQUESTED`** | Ẩn số điện thoại | Ẩn số điện thoại | Chưa có tài xế |
| **`ACCEPTED`** | **Hiển thị đầy đủ SĐT người gửi** | Ẩn hoặc chỉ hiện tên người nhận | Tài xế gọi xác nhận lấy hàng |
| **`PICKING_UP`** | **Hiển thị đầy đủ SĐT người gửi** | Ẩn hoặc chỉ hiện tên người nhận | Tài xế gọi khi tới điểm lấy hàng |
| **`IN_TRANSIT`** | Masking SĐT người gửi (`090***1234`) | **Hiển thị đầy đủ SĐT người nhận** | Tài xế gọi giao hàng cho người nhận |
| **`DELIVERED`** | Che hoàn toàn SĐT | Che hoàn toàn SĐT | Đơn đã hoàn tất, đóng liên lạc |
| **`CANCELLED`** | Che hoàn toàn SĐT | Che hoàn toàn SĐT | Đơn đã hủy, đóng liên lạc |

* **Cấu trúc DTO phản hồi trả về cho Driver**:
  ```json
  {
    "id": "order-uuid-1",
    "status": "PICKING_UP",
    "vehicleType": "MOTORBIKE",
    "cargoWeightKg": 15,
    "cargoNote": "Thùng trái cây tươi, nhẹ tay",
    "distanceMeters": 4200,
    "durationSeconds": 900,
    "priceVnd": 45000,
    "stops": [
      {
        "id": "stop-1",
        "type": "PICKUP",
        "sequence": 1,
        "address": "123 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
        "lat": 10.7769,
        "lng": 106.7009,
        "contactName": "Chị Lan (Chủ shop)",
        "contactPhone": "0912345678", // Hiển thị số thực để tài xế gọi
        "note": "Hàng để ngay quầy thu ngân"
      },
      {
        "id": "stop-2",
        "type": "DROPOFF",
        "sequence": 2,
        "address": "456 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
        "lat": 10.7745,
        "lng": 106.7032,
        "contactName": "Anh Bình (Khách nhận)",
        "contactPhone": null, // Ẩn tại giai đoạn lấy hàng
        "note": "Gọi trước khi đến 5 phút"
      }
    ],
    "currentContact": {
      "targetRole": "SENDER",
      "name": "Chị Lan (Chủ shop)",
      "phone": "0912345678",
      "instruction": "Liên hệ người gửi để nhận kiện hàng"
    }
  }
  ```

---

### 3.5. Phân Hệ Tiến Trình Vận Chuyển & Cửa Chặn Bằng Chứng (Delivery Lifecycle & Proof Gate)

#### A. `POST /api/v1/driver/orders/:id/status`
* **Mục đích**: Chuyển trạng thái đơn hàng theo luồng chuẩn:
  * `ACCEPTED -> PICKING_UP` (Tài xế đang di chuyển tới điểm lấy hàng).
  * `PICKING_UP -> IN_TRANSIT` (Tài xế đã lấy hàng thành công, đang giao).
  * `IN_TRANSIT -> DELIVERED` (Đã giao hàng thành công).
* **Cải tiến cửa chặn giao hàng (Delivery Proof Gate)**:
  * Chuyển sang `DELIVERED` bắt buộc phải thỏa mãn:
    * Có ít nhất 1 ảnh bằng chứng giao hàng trong `MediaObject` với `type = 'DELIVERY_PROOF'` được tải lên trong lúc đơn ở trạng thái `IN_TRANSIT`.
    * Nếu chưa có ảnh bằng chứng: Ném lỗi `409 DELIVERY_PROOF_REQUIRED` kèm thông điệp rõ ràng yêu cầu chụp ảnh xác nhận.
* **Cải tiến trạng thái sẵn sàng sau khi giao hàng**:
  * Đọc cờ `autoOfflineOnComplete` từ `DriverProfile`:
    * Nếu `autoOfflineOnComplete === false`: Set `availability = 'AVAILABLE'`.
    * Nếu `autoOfflineOnComplete === true`: Set `availability = 'OFFLINE'` và reset cờ về `false`.
* **Idempotency**: Tiếp tục hỗ trợ `clientRequestId` UUID để đảm bảo mạng chập chờn gọi lại không bị lỗi `409 ORDER_INVALID_TRANSITION`.

#### B. `POST /api/v1/orders/:id/media/delivery-proof` (Sửa Lỗi Khóa Trạng Thái Media)
* **Mục đích**: Tải lên ảnh chụp bằng chứng giao hàng (người nhận ký nhận hoặc ảnh gói hàng tại cửa).
* **Cải tiến**:
  * Kiểm tra chặt chẽ: `order.driverId === actor.userId` VÀ `order.status === 'IN_TRANSIT'`.
  * Nếu `order.status !== 'IN_TRANSIT'`: Ném lỗi `409 ORDER_INVALID_TRANSITION` ("Chỉ có thể tải lên bằng chứng giao hàng khi đơn đang trong trạng thái IN_TRANSIT").
  * Lưu liên kết `order.proofMediaId = media.id`.

---

### 3.6. Phân Hệ Xử Lý Sự Cố Khẩn Cấp & Thoát Deadlock (Incident Management)

#### `POST /api/v1/driver/orders/:id/incident` (ENDPOINT MỚI HOÀN TOÀN)
* **Mục đích**: Cung cấp lối thoát an toàn và chính danh cho tài xế khi gặp các tình huống bất khả kháng ngoài thực địa, giải quyết dứt điểm điểm nghẽn **P0-4**.
* **Phân loại mã sự cố (`incidentReason`)**:
  * `VEHICLE_BREAKDOWN`: Phương tiện hỏng hóc giữa đường (thủng lốp, hỏng máy, tai nạn).
  * `SENDER_NO_SHOW`: Người gửi không có mặt tại điểm lấy hàng sau 15 phút gọi điện.
  * `SENDER_CANCELLED`: Người gửi hủy gửi tại chỗ hoặc hàng hóa cấm/sai quy cách.
  * `RECIPIENT_REJECTED`: Người nhận từ chối nhận hàng hoặc không nghe máy sau 3 lần gọi cách nhau 5 phút.
  * `WRONG_ADDRESS`: Địa chỉ giao hàng không tồn tại, sai lệch nghiêm trọng.
  * `FORCE_MAJEURE`: Thời tiết cực đoan, ngập lụt, khu vực phong tỏa.
* **Request Body** (`ReportOrderIncidentDto`):
  ```json
  {
    "clientRequestId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "reason": "RECIPIENT_REJECTED",
    "note": "Đã gọi 4 cuộc từ 09:15 đến 09:30 nhưng người nhận tắt máy. Kiện hàng còn nguyên vẹn.",
    "evidenceMediaId": "media-uuid-proof-call-or-package", // Tùy chọn: ảnh chụp màn hình cuộc gọi hoặc ảnh gói hàng
    "currentLocation": {
      "lat": 10.7745,
      "lng": 106.7032
    }
  }
  ```
* **Quy trình xử lý Transaction Backend**:
  ```ts
  // 1. Kiểm tra quyền sở hữu đơn: order.driverId === actor.userId
  // 2. Kiểm tra trạng thái đơn: Phải là 'ACCEPTED', 'PICKING_UP', hoặc 'IN_TRANSIT'
  // 3. Nếu sự cố xảy ra ở chặng trước khi lấy hàng ('ACCEPTED', 'PICKING_UP'):
  //    - Chuyển order.status = 'INCIDENT_CANCELLED'
  //    - Lưu incidentReason, incidentNote, incidentReportedAt
  //    - Giải phóng tài xế: driverProfile.availability = 'AVAILABLE'
  // 4. Nếu sự cố xảy ra ở chặng đang giữ hàng ('IN_TRANSIT'):
  //    - Nếu hàng cần hoàn trả: Chuyển order.status = 'RETURNING' (tài xế mang hàng trả lại điểm gửi)
  //    - Hoặc chuyển 'INCIDENT_CANCELLED' theo quy chế pilot và yêu cầu bàn giao kho/điểm xuất
  //    - Giải phóng tài xế: driverProfile.availability = 'AVAILABLE'
  // 5. Ghi nhận nhật ký OrderStatusHistory với actorId là Driver
  // 6. Ghi nhận AuditLog phục vụ Admin rà soát bồi thường hoặc xử lý gian lận
  // 7. Bắn Socket event 'order:incident' tới Customer Room và Admin Console
  ```
* **Response (200 OK)**:
  ```json
  {
    "id": "order-uuid-1",
    "status": "INCIDENT_CANCELLED",
    "incidentReason": "RECIPIENT_REJECTED",
    "incidentNote": "Đã gọi 4 cuộc từ 09:15 đến 09:30 nhưng người nhận tắt máy...",
    "driverAvailability": "AVAILABLE",
    "message": "Báo cáo sự cố thành công. Bạn đã sẵn sàng để nhận đơn mới."
  }
  ```

---

### 3.7. Đồng Bộ Thời Gian Thực & Xử Lý Khách Hủy Đơn (Realtime Synchronization)

#### A. Sửa lỗi `CancelOrderService` (Khách hủy đơn phải báo Driver)
* Khi Customer hoặc Admin gọi `POST /orders/:id/cancel`:
  * Nếu đơn đã có `order.driverId`:
    * Backend bắt buộc phải gọi `OrderEventsPublisher.publishStatusChanged(...)`.
    * Socket Gateway phát event `order:cancelled` tới room `user:<driverId>`:
      ```json
      {
        "event": "order:cancelled",
        "orderId": "order-uuid-1",
        "reason": "Khách hàng thay đổi nhu cầu",
        "occurredAt": "2026-09-11T09:35:00.000Z"
      }
      ```
    * Nếu tích hợp FCM (`FCM_ENABLED=true`): Bắn High-Priority Push Notification tới điện thoại tài xế: *"Đơn hàng #123 đã bị hủy bởi người đặt"*.
    * Driver App nhận sự kiện này sẽ lập tức đóng modal dẫn đường, hiện thông báo cho tài xế và đưa giao diện về trạng thái Radar quét đơn mới.

#### B. Namespace `/tracking` (Tài xế truyền tọa độ di chuyển)
* Trong khi `status === 'IN_TRANSIT'` hoặc `PICKING_UP`:
  * Client Driver emit sự kiện `driver:location` lên namespace `/tracking` kèm token:
    ```json
    {
      "orderId": "order-uuid-1",
      "lat": 10.7746,
      "lng": 106.7035,
      "accuracyM": 4.5,
      "clientPointId": "uuid-v4"
    }
    ```
  * Backend lưu vào `TrackingPoint` và relay tới room `order:<orderId>` cho Customer xem marker di chuyển mượt mà.

---

## 4. Danh Mục Mã Lỗi Nghiệp Vụ Driver API (Domain Errors)

| HTTP Code | Error Code | Mô tả | Xử lý khuyến nghị phía Mobile App |
| :--- | :--- | :--- | :--- |
| `401` | `UNAUTHORIZED` | Token hết hạn hoặc không hợp lệ | Đưa về màn hình đăng nhập |
| `403` | `FORBIDDEN` | Không đúng quyền tài xế được phân công | Thông báo từ chối truy cập |
| `403` | `DRIVER_NOT_APPROVED` | Hồ sơ chưa được Admin kích hoạt | Chuyển tới màn hình chờ duyệt |
| `404` | `RESOURCE_NOT_FOUND` | Không tìm thấy đơn hàng hoặc hồ sơ | Báo đơn không tồn tại, refresh danh sách |
| `409` | `ORDER_ALREADY_ASSIGNED` | Đơn đã có tài xế khác nhận | Báo đơn đã được nhận, ẩn khỏi danh sách |
| `409` | `DRIVER_BUSY` | Tài xế đang có đơn hàng khác | Điều hướng tới đơn hàng active hiện tại |
| `409` | `ORDER_INVALID_TRANSITION` | Trạng thái đơn không khớp với hành động | Tải lại dữ liệu chi tiết đơn hàng |
| `409` | `DELIVERY_PROOF_REQUIRED` | Thiếu ảnh bằng chứng giao hàng khi hoàn tất | Mở camera/trang upload bằng chứng |
| `413` | `MEDIA_FILE_TOO_LARGE` | Ảnh tải lên vượt quá 10MB | Nén ảnh tự động trước khi gửi lại |
| `422` | `VEHICLE_TYPE_MISMATCH` | Loại xe của tài xế không chở được đơn này | Thông báo không phù hợp phương tiện |
| `422` | `KYC_DOCUMENTS_INCOMPLETE` | Chưa upload đủ GPLX, Cà-vẹt và CCCD | Điều hướng đến màn hình bổ sung giấy tờ |

---

## 5. Lộ Trình & Kế Hoạch Triển Khai Kỹ Thuật (Phasing & Tests)

1. **Giai đoạn 1 (Prisma & Core DTOs)**:
   - Thêm enum và cột mới vào `schema.prisma` (`Order.vehicleType`, `cargoWeightKg`, `cargoNote`, `incidentReason`, `proofMediaId`).
   - Cập nhật DTOs: `UpdateDriverLocationDto`, `ReportOrderIncidentDto`, `UpdateAvailabilityDto`.
   - Chạy Prisma migrate & Prisma generate.
2. **Giai đoạn 2 (Fix Controller & Service Lỗ Hổng Cốt Tử)**:
   - Khai báo `@Patch('location')` trong `drivers.controller.ts`.
   - Cập nhật `AcceptOrderService`: Thêm đối soát `driverProfile.vehicleType === order.vehicleType`.
   - Cập nhật `UpdateOrderStatusService`: Bắt buộc kiểm tra `hasDeliveryProof` và tôn trọng `autoOfflineOnComplete`.
   - Tạo mới `ReportOrderIncidentService` và nối route `POST /driver/orders/:id/incident`.
   - Cập nhật `CancelOrderService`: Phát sự kiện Socket `order:cancelled` tới tài xế.
3. **Giai đoạn 3 (Dynamic Contact & KYC Resumable)**:
   - Cập nhật `mapOrderResponse` và `order-response.mapper.ts`: Chiếu số điện thoại động theo chặng (`PICKUP` -> số người gửi; `IN_TRANSIT` -> số người nhận).
   - Nâng cấp `DriverApplicationService`: Hỗ trợ nộp lại hồ sơ an toàn, không bị kẹt `409`.
   - Thêm gate kiểm tra đủ 3 giấy tờ trong `AdminDriverReviewService.approve`.
4. **Giai đoạn 4 (Kiểm Thử & Verification)**:
   - Chạy trọn vẹn bộ E2E:
     ```bash
     pnpm --filter api test apps/api/src/drivers/availability.e2e-spec.ts
     pnpm --filter api test apps/api/src/drivers/update-location.e2e-spec.ts
     pnpm --filter api test apps/api/src/orders/accept-order.integration-spec.ts
     pnpm --filter api test apps/api/src/orders/order-lifecycle.e2e-spec.ts
     ```
   - Chạy kiểm tra tĩnh:
     ```bash
     pnpm --filter api typecheck
     pnpm --filter api lint
     ```

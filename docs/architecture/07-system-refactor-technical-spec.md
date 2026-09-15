# ĐẶC TẢ KỸ THUẬT, CẤU TRÚC DỮ LIỆU & API/SOCKET CONTRACT ĐIỀU CHỈNH
## (System Refactor Technical Architecture & Contract Specification)

> **Mã tài liệu:** `DOCS-ARCH-07-TECHNICAL-SPEC`  
> **Phiên bản:** `1.0.0`  
> **Ngày ban hành:** 11/09/2026  
> **Dự án:** LEOPARD Logistics Platform  
> **Mục đích:** Đặc tả chính xác các thay đổi kiến trúc mã nguồn, Schema cơ sở dữ liệu PostgreSQL/PostGIS, REST API DTOs, Socket.IO Gateway và Mobile Runtime Architecture để lập trình viên thực hiện trực tiếp không cần suy đoán.  

---

## 1. CẢI CÁCH SCHEMA CƠ SỞ DỮ LIỆU (DATABASE SCHEMA MIGRATION)

### 1.1. Cập nhật Model trong `apps/api/prisma/schema.prisma`

#### A. Mở rộng Model `Order`
Bổ sung các trường lưu trữ thông tin thực tế: loại xe, liên hệ 2 đầu, ghi chú lấy/giao, bốc xếp và sự cố:

```prisma
enum VehicleType {
  MOTORBIKE
  VAN
  TRUCK
}

// Bổ sung các trạng thái sự cố và hoàn trả vào OrderStatus nếu mở rộng lifecycle
enum OrderStatus {
  REQUESTED
  ACCEPTED
  PICKING_UP
  IN_TRANSIT
  DELIVERED
  CANCELLED
  INCIDENT_CANCELLED  // Mới: Tài xế báo sự cố không thể lấy hàng
  DELIVERY_FAILED     // Mới: Giao hàng thất bại (khách bom hàng / sai địa chỉ)
  RETURNED            // Mới: Đã hoàn trả hàng về cho người gửi
}

model Order {
  id              String               @id @default(uuid()) @db.Uuid
  customerId      String               @db.Uuid
  clientRequestId String?
  driverId        String?              @db.Uuid
  status          OrderStatus          @default(REQUESTED)
  
  // === MỚI: Bổ sung loại xe bắt buộc ===
  vehicleType     VehicleType          @default(MOTORBIKE)
  
  // === MỚI: Thông tin liên hệ thực tế đa bên ===
  senderName      String?              @db.VarChar(120)
  senderPhone     String?              @db.VarChar(32)
  receiverName    String?              @db.VarChar(120)
  receiverPhone   String?              @db.VarChar(32)
  pickupNote      String?              @db.Text
  dropoffNote     String?              @db.Text
  
  // === MỚI: Dịch vụ bốc xếp & Hàng hóa ===
  requiresLoadingSupport Boolean       @default(false)
  cargoCategory   String?              @db.VarChar(64)
  cargoWeightKg   Int?
  
  // === MỚI: Báo cáo sự cố từ tài xế ===
  incidentReason       String?         @db.Text
  incidentReportedAt   DateTime?       @db.Timestamptz(3)
  
  routeSnapshot   Json?
  providerSource  ProviderSource?
  distanceMeters  Int?
  durationSeconds Int?
  priceVnd        Int?
  etaSeconds      Int?
  acceptedAt      DateTime?            @db.Timestamptz(3)
  pickingUpAt     DateTime?            @db.Timestamptz(3)
  inTransitAt     DateTime?            @db.Timestamptz(3)
  deliveredAt     DateTime?            @db.Timestamptz(3)
  cancelledAt     DateTime?            @db.Timestamptz(3)
  createdAt       DateTime             @default(now()) @db.Timestamptz(3)
  updatedAt       DateTime             @default(now()) @updatedAt @db.Timestamptz(3)
  
  customer        User                 @relation("CustomerOrders", fields: [customerId], references: [id], onDelete: Restrict)
  driver          User?                @relation("DriverOrders", fields: [driverId], references: [id], onDelete: Restrict)
  stops           OrderStop[]
  statusHistory   OrderStatusHistory[]
  trackingPoints  TrackingPoint[]
  mediaObjects    MediaObject[]
  paymentIntents  PaymentIntent[]
  invoice         Invoice?

  @@unique([customerId, clientRequestId])
  @@index([customerId, createdAt(sort: Desc)])
  @@index([status, createdAt(sort: Desc)])
  @@index([vehicleType, status]) // Mới: Index hỗ trợ query dispatch theo loại xe
}
```

#### B. Mở rộng Model `OrderStop` (Hỗ trợ Multi-Stop chuyên nghiệp)
```prisma
enum StopStatus {
  PENDING
  ARRIVED
  COMPLETED
  FAILED
}

model OrderStop {
  id             String                               @id @default(uuid()) @db.Uuid
  orderId        String                               @db.Uuid
  type           StopType
  sequence       Int
  address        String
  location       Unsupported("geography(Point,4326)")
  
  // === MỚI: Quản trị tiến độ và liên hệ từng điểm dừng ===
  status         StopStatus                           @default(PENDING)
  recipientName  String?                              @db.VarChar(120)
  recipientPhone String?                              @db.VarChar(32)
  note           String?                              @db.Text
  arrivedAt      DateTime?                            @db.Timestamptz(3)
  completedAt    DateTime?                            @db.Timestamptz(3)
  proofMediaId   String?                              @db.Uuid
  
  createdAt      DateTime                             @default(now()) @db.Timestamptz(3)
  updatedAt      DateTime                             @default(now()) @updatedAt @db.Timestamptz(3)
  order          Order                                @relation(fields: [orderId], references: [id], onDelete: Restrict)

  @@unique([orderId, sequence])
  @@index([orderId, status])
}
```

### 1.2. Kế hoạch Migration SQL an toàn (Zero Downtime)
Tạo file migration Prisma có giá trị mặc định để không phá vỡ các đơn hàng đang có trong database:
```sql
-- Migration: 20260911_add_order_field_specs
ALTER TABLE "Order" ADD COLUMN "vehicleType" "VehicleType" NOT NULL DEFAULT 'MOTORBIKE';
ALTER TABLE "Order" ADD COLUMN "senderName" VARCHAR(120);
ALTER TABLE "Order" ADD COLUMN "senderPhone" VARCHAR(32);
ALTER TABLE "Order" ADD COLUMN "receiverName" VARCHAR(120);
ALTER TABLE "Order" ADD COLUMN "receiverPhone" VARCHAR(32);
ALTER TABLE "Order" ADD COLUMN "pickupNote" TEXT;
ALTER TABLE "Order" ADD COLUMN "dropoffNote" TEXT;
ALTER TABLE "Order" ADD COLUMN "requiresLoadingSupport" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "cargoCategory" VARCHAR(64);
ALTER TABLE "Order" ADD COLUMN "cargoWeightKg" INTEGER;
ALTER TABLE "Order" ADD COLUMN "incidentReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "incidentReportedAt" TIMESTAMPTZ(3);

CREATE INDEX "Order_vehicleType_status_idx" ON "Order"("vehicleType", "status");

-- Enum và các cột cho OrderStop
CREATE TYPE "StopStatus" AS ENUM ('PENDING', 'ARRIVED', 'COMPLETED', 'FAILED');
ALTER TABLE "OrderStop" ADD COLUMN "status" "StopStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "OrderStop" ADD COLUMN "recipientName" VARCHAR(120);
ALTER TABLE "OrderStop" ADD COLUMN "recipientPhone" VARCHAR(32);
ALTER TABLE "OrderStop" ADD COLUMN "note" TEXT;
ALTER TABLE "OrderStop" ADD COLUMN "arrivedAt" TIMESTAMPTZ(3);
ALTER TABLE "OrderStop" ADD COLUMN "completedAt" TIMESTAMPTZ(3);
ALTER TABLE "OrderStop" ADD COLUMN "proofMediaId" UUID;
```

---

## 2. CHUẨN HÓA DTO VÀ REST API CONTRACT

### 2.1. Tạo đơn hàng (`POST /api/v1/orders`)

#### Request Body DTO (`CreateOrderDto`)
```typescript
export class CreateOrderDto {
  @IsNotEmpty()
  @IsUUID('4')
  clientRequestId!: string; // Bắt buộc để đảm bảo tính Idempotent chống trừ tiền 2 lần

  @ValidateNested()
  @Type(() => LocationPointDto)
  pickup!: LocationPointDto;

  @ValidateNested()
  @Type(() => LocationPointDto)
  dropoff!: LocationPointDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StopPointDto)
  stops?: StopPointDto[];

  @IsEnum(VehicleType)
  vehicleType!: VehicleType; // MOTORBIKE | VAN | TRUCK

  // Thông tin liên hệ thực tế
  @IsString()
  @IsNotEmpty()
  senderName!: string;

  @IsString()
  @Matches(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, { message: 'Số điện thoại người gửi không hợp lệ' })
  senderPhone!: string;

  @IsString()
  @IsNotEmpty()
  receiverName!: string;

  @IsString()
  @Matches(/^(0|\+84)[3|5|7|8|9][0-9]{8}$/, { message: 'Số điện thoại người nhận không hợp lệ' })
  receiverPhone!: string;

  @IsOptional()
  @IsString()
  pickupNote?: string;

  @IsOptional()
  @IsString()
  dropoffNote?: string;

  @IsOptional()
  @IsBoolean()
  requiresLoadingSupport?: boolean;

  @IsOptional()
  @IsString()
  cargoCategory?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  cargoWeightKg?: number;

  @IsNotEmpty()
  @IsString()
  estimateToken!: string;
}
```

### 2.2. Chuẩn hóa Mapper Trả về Đơn hàng (`order-response.mapper.ts`)
Loại bỏ việc vứt bỏ thông tin liên hệ và phương tiện. `mapOrderResponse` phải chiếu (project) đầy đủ các trường:

```typescript
export interface MappedOrderResponse {
  id: string;
  reference: string;
  customerId: string;
  driverId: string | null;
  status: OrderStatus;
  vehicleType: VehicleType; // Mới
  
  // Liên hệ thực tế
  senderName: string | null;
  senderPhone: string | null;
  receiverName: string | null;
  receiverPhone: string | null;
  pickupNote: string | null;
  dropoffNote: string | null;
  
  // Thông tin liên hệ động phù hợp với vai trò và chặng
  currentContact: {
    role: 'SENDER' | 'RECEIVER';
    name: string;
    phone: string;
    note: string | null;
  } | null;
  
  requiresLoadingSupport: boolean;
  cargoCategory: string | null;
  cargoWeightKg: number | null;
  
  priceVnd: number | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  stops?: MappedOrderStopResponse[];
  statusHistory?: MappedOrderStatusHistoryResponse[];
  media?: Array<{ id: string; type: string; url?: string; createdAt: string }>;
  payment?: MappedPaymentResponse;
}
```

**Quy tắc xác định `currentContact` cho Tài xế:**
```typescript
function resolveCurrentContact(order: Order): MappedOrderResponse['currentContact'] {
  if (order.status === 'ACCEPTED' || order.status === 'PICKING_UP') {
    return {
      role: 'SENDER',
      name: order.senderName || 'Người gửi hàng',
      phone: order.senderPhone || '',
      note: order.pickupNote,
    };
  }
  if (order.status === 'IN_TRANSIT') {
    return {
      role: 'RECEIVER',
      name: order.receiverName || 'Người nhận hàng',
      phone: order.receiverPhone || '',
      note: order.dropoffNote,
    };
  }
  return null;
}
```

### 2.3. Endpoint Mới: Báo cáo Sự cố cho Tài xế (`POST /api/v1/driver/orders/:id/incident`)
- **Mục đích:** Giải phóng tài xế khỏi trạng thái kẹt `BUSY` khi gặp sự cố không thể lấy hàng.
- **Quyền hạn:** Assigned Driver của đơn hàng.
- **Trạng thái hợp lệ để gọi:** `ACCEPTED` hoặc `PICKING_UP`.
- **Payload:**
  ```json
  {
    "clientRequestId": "uuid-v4",
    "reasonCode": "VEHICLE_BREAKDOWN | SENDER_UNREACHABLE | PROHIBITED_CARGO | ACCIDENT | OTHER",
    "description": "Xe bị nổ lốp tại đường Nguyễn Huệ, không thể tiếp tục di chuyển."
  }
  ```
- **Hành vi xử lý:**
  1. Chuyển `order.status = 'INCIDENT_CANCELLED'`.
  2. Ghi nhận `order.incidentReason = description`, `order.incidentReportedAt = NOW()`.
  3. Ghi bản ghi `OrderStatusHistory` với lý do sự cố.
  4. Cập nhật `driverProfile.availability = 'AVAILABLE'`.
  5. Phát Socket Event `order:status-updated` báo cho Khách hàng và Admin biết cuốc xe bị gián đoạn do sự cố kỹ thuật.

### 2.4. Endpoint Quản trị: Thẩm định Hồ sơ KYC (`POST /api/v1/admin/drivers/:id/approve`)
- **Điều kiện Gatekeeper:**
  ```typescript
  const documents = await this.prisma.driverDocument.findMany({
    where: { driverProfile: { userId } },
  });
  const docTypes = new Set(documents.map(d => d.type));
  const hasAllDocs = docTypes.has('LICENSE') && docTypes.has('VEHICLE_REGISTRATION') && docTypes.has('ID_CARD');
  
  if (!hasAllDocs) {
    throw new DomainError('DRIVER_DOCUMENTS_INCOMPLETE', 422, 'Tài xế chưa nộp đủ 3 loại giấy tờ bắt buộc (GPLX, Đăng ký xe, CCCD).');
  }
  ```

---

## 3. CHUẨN HÓA REALTIME SOCKET GATEWAY & EVENTS

### 3.1. Sửa Lỗi Socket Base URL Resolution
Tách biệt triệt để Base URL của REST API (`/api/v1`) và Namespace của Socket.IO:

```typescript
// packages/mobile-core/src/api/socket-client.ts
export function resolveSocketOrigin(apiUrl: string): string {
  try {
    const url = new URL(apiUrl);
    return url.origin; // Chỉ lấy "http://localhost:3000" hoặc "https://api.leopard.vn"
  } catch {
    return apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
  }
}

export function createSocketConnection(namespace: string, token: string): Socket {
  const origin = resolveSocketOrigin(process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000');
  return io(`${origin}${namespace}`, {
    auth: { token },
    transports: ['websocket'],
  });
}
```

### 3.2. Đảm bảo Bắn Sự kiện khi Hủy Đơn Hàng (`CancelOrderService`)
Sửa [`apps/api/src/orders/cancel-order.service.ts`](file:///d:/leopard/apps/api/src/orders/cancel-order.service.ts) để phát sự kiện cho toàn bộ các bên đang lắng nghe:

```typescript
@Injectable()
export class CancelOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersRepository: OrdersRepository,
    private readonly eventsPublisher: OrderEventsPublisher, // BỔ SUNG INJECT
  ) {}

  async cancelOrder(...) {
    // ... thực hiện transaction hủy đơn ...
    
    // Phát event qua Socket sau khi transaction commit thành công
    this.eventsPublisher.publishStatusChanged({
      orderId,
      previousStatus: order.status,
      currentStatus: 'CANCELLED',
      eventId: history.id,
      occurredAt: history.createdAt.toISOString(),
    });
  }
}
```

### 3.3. Customer Realtime Lifecycle Sync
Cập nhật [`apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx`](file:///d:/leopard/apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx):
- Kết nối Socket ngay khi `status === 'REQUESTED'` hoặc `status === 'ACCEPTED'`.
- Khi nhận sự kiện `order:status-updated`:
  - Nếu chuyển từ `REQUESTED` -> `ACCEPTED`: Lập tức gọi `query.refetch()` để lấy thông tin tài xế và chuyển đổi giao diện sang "Tài xế đang đến lấy hàng".
  - Nếu chuyển sang `CANCELLED` hoặc `INCIDENT_CANCELLED`: Hiển thị thông báo và cho phép khách tìm tài xế khác.

---

## 4. MOBILE RUNTIME ARCHITECTURE & UX REFACTOR

### 4.1. Khôi phục Phiên Tài xế An toàn (`apps/driver/app/index.tsx`)
```typescript
export default function DriverIndex() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    void (async () => {
      await sessionStore.hydrate();
      if (!active) return;
      
      const hasRefreshToken = Boolean(await sessionStore.getRefreshToken());
      
      // Nếu có refresh token nhưng chưa có access token trong RAM -> Tự động refresh
      if (hasRefreshToken && !sessionStore.getAccessToken()) {
        const refreshed = await refreshSession();
        if (!refreshed) {
          await sessionStore.clearSession();
        }
      }
      
      const isAuthenticated = sessionStore.isAuthenticated();
      const role = sessionStore.getRole();
      const outcome = resolveDriverLogin({ isAuthenticated, role });
      
      if (outcome.kind === 'enter') {
        router.replace('/orders');
      } else {
        router.replace('/(public)/login');
      }
    })();

    return () => { active = false; };
  }, [router]);

  return <DriverSplashScreen />;
}
```

### 4.2. Sửa Luồng Upload Proof Kẹt Nút DELIVERED (`DriverOrderDetailRuntime.tsx`)
Khi upload proof thành công, cập nhật ngay `primaryTask` chuyển thành `advance-lifecycle` với target `DELIVERED`:

```typescript
// apps/driver/src/features/orders/DriverOrderDetailRuntime.tsx
async function handleSelectProof() {
  const file = await proofPort.selectProof();
  if (!file) return;

  setIsUploadingProof(true);
  try {
    const proofResult = await proofPort.uploadProof(file);
    queryClient.setQueryData(['driver', 'order', orderId], (prev: DriverDetailView) => {
      if (!prev || prev.kind !== 'content') return prev;
      return {
        ...prev,
        proof: proofResult,
        primaryTask: {
          kind: 'advance-lifecycle',
          command: {
            id: `cmd-deliver-${orderId}`,
            orderId,
            label: 'Xác nhận đã giao hàng',
            targetStatus: 'DELIVERED',
          },
        },
      };
    });
  } catch (error) {
    // Hiển thị thông báo lỗi và giữ nút tải lại
  } finally {
    setIsUploadingProof(false);
  }
}
```

### 4.3. Chỉ đường GPS Chính xác theo Chặng và Tọa độ (`DriverOrderDetailScreen.tsx`)
```typescript
function openExternalNavigation(target: { latitude: number; longitude: number; label?: string }) {
  // Ưu tiên truyền tọa độ lat,lng để Google Maps định vị chính xác tuyệt đối
  const url = `https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}`;
  void Linking.openURL(url).catch(() => {});
}

// Khi nhấn nút bản đồ:
const isGoingToPickup = view.order.status === 'ACCEPTED' || view.order.status === 'PICKING_UP';
const targetPoint = isGoingToPickup ? view.order.route.origin : view.order.route.destination;

<Pressable
  accessibilityLabel={isGoingToPickup ? "Chỉ đường tới điểm lấy hàng" : "Chỉ đường tới điểm giao hàng"}
  onPress={() => openExternalNavigation({
    latitude: targetPoint.latitude,
    longitude: targetPoint.longitude,
  })}
>
  <IconRoute color="#0B1E42" size={20} />
</Pressable>
```

### 4.4. Xóa bỏ Toàn bộ Dữ liệu Mock & Hardcoded Strings
1. **Xóa `19001234` và `0901234567`:**
   - Thay bằng `view.order.currentContact?.phone` hoặc `view.order.driverPhone`.
   - Nếu không có số điện thoại, disable nút gọi và hiển thị tooltip: *"Chưa có số liên lạc"*.
2. **Xóa `Xi măng (VLXD)`, `250 kg`, `Có bốc xếp 2 đầu`:**
   - Chỉ hiển thị trường này nếu `order.cargoCategory` hoặc `order.cargoWeightKg` có giá trị thực tế do khách nhập.
   - Nếu `requiresLoadingSupport === false` thì ẩn hẳn mục dịch vụ đi kèm.
3. **Xóa `★ 4.9`, `Xe tải 1.25T`:**
   - Loại xe lấy từ `order.vehicleType` (chuyển đổi nhãn tiếng Việt: Xe máy, Xe bán tải/Van, Xe tải).
   - Đánh giá chỉ hiển thị nếu tài xế có rating thật trong profile.

---

## 5. BẢO MẬT & IDOR ENFORCEMENT

### 5.1. Sửa Lỗ hổng IDOR Media Service
```typescript
// apps/api/src/media/media.service.ts
async getSignedUrl(actor: AuthenticatedActor, mediaId: string) {
  const media = await this.mediaRepository.findById(mediaId);
  if (!media) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy media');

  const order = await this.prisma.order.findUnique({ where: { id: media.orderId } });
  if (!order) throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');

  if (actor.role === 'CUSTOMER' && order.customerId !== actor.userId) {
    throw new DomainError('FORBIDDEN', 403, 'Không có quyền truy cập media này');
  }
  if (actor.role === 'DRIVER' && order.driverId !== actor.userId) {
    throw new DomainError('FORBIDDEN', 403, 'Không có quyền truy cập media này');
  }
  
  // === MỚI: BẢO VỆ PHÂN QUYỀN FLEET OWNER ===
  if (actor.role === 'FLEET_OWNER') {
    if (!order.driverId) {
      throw new DomainError('FORBIDDEN', 403, 'Không có quyền truy cập media này');
    }
    const isDriverInFleet = await this.ordersRepository.isDriverInFleetOwnerFleets(
      actor.userId,
      order.driverId,
    );
    if (!isDriverInFleet) {
      throw new DomainError('FORBIDDEN', 403, 'Không có quyền truy cập media của tài xế thuộc đội xe khác');
    }
  }

  const expiresInSeconds = 3600;
  const url = await this.storageProvider.createReadUrl(media.storageKey, expiresInSeconds);
  return { url, expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString() };
}
```

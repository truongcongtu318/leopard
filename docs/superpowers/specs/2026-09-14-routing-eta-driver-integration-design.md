# Thiết kế: Tích hợp Routing/ETA realtime cho Driver (Giai đoạn A+B)

- **Ngày:** 2026-09-14
- **Nhánh:** feature/mobile-ui-refactor
- **Trạng thái:** Đề xuất (chờ review) — chưa triển khai code
- **Nguồn gốc:** [docs/testing/10-routing-eta-weather-dispatch-gap-analysis.md](../../testing/10-routing-eta-weather-dispatch-gap-analysis.md) — báo cáo kiểm tra 2026-09-14, đề xuất lộ trình 6 giai đoạn A→F
- **Liên quan:** [2026-09-04-vietmap-eta-route-recommendation-design.md](2026-09-04-vietmap-eta-route-recommendation-design.md) xử lý ETA/route-choice phía **Customer estimate** (đa tuyến, `cargoWeightKg` trong token) — spec này xử lý phần **vận hành sau khi có Driver** (route snapshot có version, ETA sống, tiến độ stop). Hai spec không chồng lấn: D4/D7 của spec 09-04 chốt `cargoWeightKg` là input thật cho token estimate; R02 trong tài liệu gốc (mục 4) ghi nhận `createOrder` hiện **chưa đối chiếu đúng** trường này khi verify token — nghĩa là D4/D7 có thể mới chỉ áp dụng phía tạo token, chưa khớp phía verify. Spec này sửa tận gốc bằng cách chuẩn hoá lại toàn bộ input xe (mục 3.1) thay vì vá điểm.

## 1. Phạm vi

Chỉ **Giai đoạn A (sửa nền dữ liệu Vietmap) + Giai đoạn B (vòng vận hành realtime)** theo lộ trình ở mục 11 tài liệu gốc. Trong phạm vi:

- Sửa root cause R01–R08 (trọng lượng/vehicleType không nhất quán giữa estimate và create; route/ETA Driver không đồng bộ với backend; ETA không phân biệt pickup/completion; GPS không tính lại ETA).
- Xây `OrderRouteSnapshot`/`OrderLiveEstimate`/`StopProgressEvent` có version, outbox durable, worker có lease fencing.
- REST + socket contract cho Driver/Customer đọc route/ETA sống.
- Màn hình Driver hiển thị geometry/ETA thật từ backend, ngừng tự tính tuyến trong WebView.

**Ngoài phạm vi (không làm ở đây):**

- Giai đoạn C (dispatch giảm km pickup, `DispatchAttempt/Offer`) — hạ tầng outbox ở đây **có thể tái dùng** sau (đã đặt `OutboxEventType`/`schemaVersion` tổng quát cho mục đích này) nhưng dispatch logic không nằm trong spec.
- Giai đoạn D (thời tiết) — `OrderLiveEstimate.weatherSnapshotVersion`/`adjustmentSource` chỉ là placeholder forward-compat, **chưa** có `WeatherSnapshot`, chưa audit được thời tiết trong phase này. Ghi rõ để không ai hiểu nhầm ETA đã tính thời tiết.
- Giai đoạn E/F (gợi ý chuyến tiếp, backhaul, VRP).
- Chuyển client-side Vietmap routing sang backend cho các mode **preview/location/pin** (Customer location-picker, address-book) — đã tách thành task riêng ngoài spec này (xem mục 8).
- Tích hợp SDK dẫn đường giữ nguyên tuyến Vietmap thay Google Maps external nav — quyết định nghiệp vụ hoãn, xem mục 6.6.

## 2. Ba quyết định kiến trúc nền

1. **Tách interface route thuần túy khỏi estimate có giá.** Module mới `apps/api/src/routing-eta/` sở hữu `EtaService`, gọi một interface route-thuần-túy (không giá) mà `MapsService`/`VietmapProvider` hiện có cung cấp — `maps/` tiếp tục sở hữu tích hợp Vietmap + pricing/estimate Customer; không rò business rule routing/tiến độ/thời tiết vào `maps/`.
2. **Version bảo vệ đúng thứ tự tính toán, không chỉ đánh số.** `Order.routeEtaInputRevision` là version công khai duy nhất (bỏ hẳn một bộ đếm `estimateVersion` riêng — dễ gây lệch, xem mục 3.2 §1). Job tính ETA cho revision cũ hơn revision hiện hành **không được** ghi đè con trỏ current, dù nó hoàn tất sau.
3. **Luồng chuẩn** (áp dụng cho mọi trigger — lifecycle, stop progress, GPS coalesced, void):

```
Input event (lifecycle/stop-progress/GPS coalesced/void)
  → cùng TX: bump Order.routeEtaInputRevision + ghi outbox ROUTE_ETA_RECOMPUTE (có lease fencing)
  → worker claim (FOR UPDATE SKIP LOCKED, leaseGeneration++)
  → gọi Vietmap ngoài TX (at-least-once — có thể gọi lại nếu mất lease)
  → TX2: lock Order, chỉ promote nếu job.inputRevision vẫn là mới nhất
        (kết quả cũ hơn → lưu status=SUPERSEDED để audit, không tạo notify)
  → cập nhật current pointer (kind đúng, cross-order integrity bằng composite FK)
  → outbox ROUTE_ETA_UPDATED / ROUTE_UPDATED
  → RouteEtaRealtimeEmitter phát socket (namespace/room /tracking đã có)
  → client dedupe theo eventId + inputRevision, reconnect luôn GET REST rồi mới nhận socket
```

Đảm bảo: **gọi provider là at-least-once; kết quả DB/pointer là idempotent theo `(orderId, inputRevision, kind)`.**

## 3. Data model (Prisma) — bản chốt cuối cùng

### 3.1 Vehicle profile — tách "xe thật" khỏi "cấu hình quote chuẩn"

```prisma
model VehicleRoutingProfile {
  id               String    @id @default(uuid()) @db.Uuid
  driverProfileId  String    @db.Uuid
  version          Int
  vehicleType      VehicleType   // copy tại thời điểm xác minh — KHÔNG đọc lại DriverProfile.vehicleType khi audit (field đó có thể đổi sau chuyến)
  tareWeightKg     Int
  maxPayloadKg     Int
  maxGrossWeightKg Int
  verifiedAt       DateTime? @db.Timestamptz(3)
  verifiedById     String?   @db.Uuid
  supersededAt     DateTime? @db.Timestamptz(3)
  createdAt        DateTime  @default(now()) @db.Timestamptz(3)

  driverProfile  DriverProfile @relation(fields: [driverProfileId], references: [id], onDelete: Restrict)
  verifiedBy     User?         @relation("VehicleProfileVerifier", fields: [verifiedById], references: [id], onDelete: Restrict)
  routeSnapshots OrderRouteSnapshot[]

  @@unique([driverProfileId, version])
  @@index([driverProfileId, supersededAt])
}

model QuoteVehicleRoutingPolicy {
  id                      String      @id @default(uuid()) @db.Uuid
  vehicleType             VehicleType
  version                 Int
  assumedTareWeightKg     Int
  assumedMaxPayloadKg     Int
  assumedMaxGrossWeightKg Int
  operationalAllowanceKg  Int         @default(0)
  effectiveFrom           DateTime    @db.Timestamptz(3)
  supersededAt            DateTime?   @db.Timestamptz(3)
  createdAt               DateTime    @default(now()) @db.Timestamptz(3)
  routeSnapshots          OrderRouteSnapshot[]

  @@unique([vehicleType, version])
  @@index([vehicleType, supersededAt])
}
```

Raw SQL (migration):

```sql
CREATE UNIQUE INDEX "vehicle_routing_profile_current_key"
  ON "VehicleRoutingProfile" ("driverProfileId") WHERE "supersededAt" IS NULL;
CREATE UNIQUE INDEX "quote_vehicle_routing_policy_current_key"
  ON "QuoteVehicleRoutingPolicy" ("vehicleType") WHERE "supersededAt" IS NULL;

ALTER TABLE "VehicleRoutingProfile" ADD CONSTRAINT "vehicle_routing_profile_weight_bounds"
  CHECK ("tareWeightKg" > 0 AND "maxPayloadKg" >= 0 AND "maxGrossWeightKg" >= "tareWeightKg");
ALTER TABLE "QuoteVehicleRoutingPolicy" ADD CONSTRAINT "quote_vehicle_routing_policy_allowance_bounds"
  CHECK ("operationalAllowanceKg" >= 0);
```

Quy tắc tính (service layer, không phải cột riêng): `actualGrossWeightKg = tareWeightKg + cargoWeightKg + operationalAllowanceKg`. Fail nếu `cargoWeightKg > maxPayloadKg` hoặc `actualGrossWeightKg > maxGrossWeightKg`. `maxGrossWeightKg` là giới hạn đăng kiểm, **không phải** số gửi Vietmap — số gửi Vietmap luôn là `actualGrossWeightKg` đã tính, khắc phục tận gốc R01.

### 3.2 Route snapshot + live estimate

```prisma
enum RouteSnapshotReason   { INITIAL_QUOTE REROUTE STOP_COMPLETED MANUAL_RECOVERY }
enum RouteProviderSource   { VIETMAP DEMO }
enum VehicleProfileSource  { STANDARD_QUOTE_PROFILE ASSIGNED_VEHICLE_PROFILE MANUAL_RECOVERY }
enum RouteSnapshotQuality  { VERIFIED_PROVIDER DEMO LEGACY_RECOVERED PARTIAL }

model OrderRouteSnapshot {
  id                          String   @id @default(uuid()) @db.Uuid
  orderId                     String   @db.Uuid
  version                     Int
  reason                      RouteSnapshotReason
  quality                     RouteSnapshotQuality
  geometry                    String
  geometryEncoding            String   @db.VarChar(16) // 'POLYLINE5' | 'POLYLINE6' — khai báo tường minh, client không tự đoán
  routeHash                   String   @db.VarChar(64)
  inputHash                   String   @db.VarChar(64)
  hashAlgorithmVersion        String   @db.VarChar(16) // đổi thuật toán canonicalization sau này không làm hash cũ vô nghĩa
  providerRouteId             String?
  legs                        Json     // RouteLegJson[] — xem contract mục 4.5
  stopSequence                Json
  normalizedInput             Json     // gồm cargoWeightKg thực tế của chuyến, KHÔNG lưu ở VehicleRoutingProfile
  vehicleProfileSource         VehicleProfileSource
  vehicleRoutingProfileId      String? @db.Uuid  // set khi ASSIGNED_VEHICLE_PROFILE
  quoteVehicleRoutingPolicyId  String? @db.Uuid  // set khi STANDARD_QUOTE_PROFILE
  departureAt                  DateTime @db.Timestamptz(3)
  source                        RouteProviderSource
  calculatedAt                  DateTime @db.Timestamptz(3)
  legacySourceSnapshotJson       Json?    // chỉ set khi quality=LEGACY_RECOVERED — bản sao Order.routeSnapshot cũ đã dùng làm nguồn
  legacyMissingFields            String[]
  recoveryJobVersion             String?
  recoveredAt                    DateTime? @db.Timestamptz(3)
  createdAt                      DateTime @default(now()) @db.Timestamptz(3)

  order                     Order @relation("OrderRouteHistory", fields: [orderId], references: [id], onDelete: Restrict)
  vehicleRoutingProfile     VehicleRoutingProfile?     @relation(fields: [vehicleRoutingProfileId], references: [id], onDelete: Restrict)
  quoteVehicleRoutingPolicy QuoteVehicleRoutingPolicy? @relation(fields: [quoteVehicleRoutingPolicyId], references: [id], onDelete: Restrict)
  quotedForOrders Order[] @relation("QuotedRoute")
  activeForOrders Order[] @relation("ActiveRoute")
  liveEstimates   OrderLiveEstimate[]

  @@unique([orderId, version])
  @@unique([orderId, id], map: "order_route_snapshot_order_id_id_key")
}
```

```sql
ALTER TABLE "OrderRouteSnapshot" ADD CONSTRAINT "order_route_snapshot_profile_source_consistency"
  CHECK (
    ("vehicleProfileSource" = 'STANDARD_QUOTE_PROFILE' AND "quoteVehicleRoutingPolicyId" IS NOT NULL AND "vehicleRoutingProfileId" IS NULL)
    OR ("vehicleProfileSource" = 'ASSIGNED_VEHICLE_PROFILE' AND "vehicleRoutingProfileId" IS NOT NULL AND "quoteVehicleRoutingPolicyId" IS NULL)
    OR ("vehicleProfileSource" = 'MANUAL_RECOVERY' AND "vehicleRoutingProfileId" IS NULL AND "quoteVehicleRoutingPolicyId" IS NULL)
  );
```

`MANUAL_RECOVERY` = cả hai NULL — dữ liệu xe của bản ghi phục hồi cũ không đủ tin cậy để gán vào profile đã xác minh hay policy chuẩn.

```prisma
enum EstimateKind          { NEXT_STOP COMPLETION }
enum LiveEstimateStatus    { AVAILABLE UNAVAILABLE SUPERSEDED }
enum EtaUnavailableReason  { NO_TARGET_STOP GPS_TOO_OLD ROUTE_UNAVAILABLE PROVIDER_EXHAUSTED INVALID_ROUTE_INPUT }
enum EtaAdjustmentSource   { NONE WEATHER OPERATIONAL WEATHER_AND_OPERATIONAL } // WEATHER* chưa dùng ở A+B

model OrderLiveEstimate {
  id                     String   @id @default(uuid()) @db.Uuid
  orderId                String   @db.Uuid
  inputRevision          Int      // = version công khai; KHÔNG có estimateVersion riêng
  kind                   EstimateKind
  targetStopId           String?  @db.Uuid
  routeSnapshotId        String   @db.Uuid
  status                 LiveEstimateStatus
  unavailableReason      EtaUnavailableReason?
  remainingDistanceM     Int?     // null = chưa biết, KHÔNG dùng 0
  remainingDurationS     Int?
  arrivalAt              DateTime? @db.Timestamptz(3)
  baselineDurationS      Int?
  adjustmentDurationS    Int      @default(0)
  baselineSource         RouteProviderSource
  adjustmentSource       EtaAdjustmentSource @default(NONE)
  weatherSnapshotVersion Int?     // forward-compat Giai đoạn D — known gap, chưa audit được thời tiết ở A+B
  policyVersion          Int      @default(1)
  gpsPointId             String?  @db.Uuid
  calculatedAt           DateTime @db.Timestamptz(3)
  validUntil             DateTime @db.Timestamptz(3)
  createdAt              DateTime @default(now()) @db.Timestamptz(3)

  order         Order @relation("OrderLiveEstimateHistory", fields: [orderId], references: [id], onDelete: Restrict)
  routeSnapshot OrderRouteSnapshot @relation(fields: [orderId, routeSnapshotId], references: [orderId, id]) // Prisma-native composite — đã spike, không cần raw SQL
  targetStop    OrderStop?         @relation(fields: [targetStopId], references: [id], onDelete: Restrict)
  gpsPoint      TrackingPoint?     @relation(fields: [gpsPointId], references: [id], onDelete: SetNull)
  currentForNextStop   Order[] @relation("CurrentNextStopEstimate")
  currentForCompletion Order[] @relation("CurrentCompletionEstimate")

  @@unique([orderId, inputRevision, kind])
  @@unique([orderId, id], map: "order_live_estimate_order_id_id_key")
  @@index([orderId, inputRevision])
  @@index([orderId, status, kind])
}
```

```sql
ALTER TABLE "OrderLiveEstimate" ADD CONSTRAINT "order_live_estimate_available_requires_result"
  CHECK (status <> 'AVAILABLE' OR ("remainingDurationS" IS NOT NULL AND "arrivalAt" IS NOT NULL));
ALTER TABLE "OrderLiveEstimate" ADD CONSTRAINT "order_live_estimate_unavailable_requires_reason"
  CHECK (status <> 'UNAVAILABLE' OR "unavailableReason" IS NOT NULL);
```

**§1 — vì sao không có `estimateVersion` riêng:** ban đầu thiết kế có `Order.liveEstimateVersion` tăng độc lập bởi worker; điều này cho phép một revision cũ hoàn tất sau vẫn nhận version số lớn hơn (do worker tính xong trước), khiến client hiển thị ETA cũ dưới nhãn "mới nhất". Đã bỏ hẳn field đó — `inputRevision` (do input event bump, không phải worker) làm version công khai duy nhất; TX2 chỉ promote khi `job.inputRevision == Order.routeEtaInputRevision` hiện hành, nếu không thì lưu `SUPERSEDED` để audit và **không** tạo `ROUTE_ETA_UPDATED`.

### 3.3 Order — pointer + counter

```prisma
model Order {
  // ...existing fields...
  routeEtaInputRevision   Int       @default(0)
  routeSnapshotVersion    Int       @default(0) // tăng riêng, chỉ khi có OrderRouteSnapshot mới (REROUTE/STOP_COMPLETED đổi geometry/MANUAL_RECOVERY) — KHÁC routeEtaInputRevision (tăng cả khi không đổi geometry)
  routeEtaLastBumpAt      DateTime? @db.Timestamptz(3) // state bền cho GPS coalescing
  routeEtaLastGpsPointId  String?   @db.Uuid

  quotedRouteSnapshotId       String? @db.Uuid
  activeRouteSnapshotId       String? @db.Uuid
  currentNextStopEstimateId   String? @db.Uuid
  currentCompletionEstimateId String? @db.Uuid

  quotedRouteSnapshot OrderRouteSnapshot? @relation("QuotedRoute", fields: [id, quotedRouteSnapshotId], references: [orderId, id])
  activeRouteSnapshot OrderRouteSnapshot? @relation("ActiveRoute", fields: [id, activeRouteSnapshotId], references: [orderId, id])
  routeSnapshots      OrderRouteSnapshot[] @relation("OrderRouteHistory")

  currentNextStopEstimate   OrderLiveEstimate? @relation("CurrentNextStopEstimate", fields: [id, currentNextStopEstimateId], references: [orderId, id])
  currentCompletionEstimate OrderLiveEstimate? @relation("CurrentCompletionEstimate", fields: [id, currentCompletionEstimateId], references: [orderId, id])
  liveEstimates             OrderLiveEstimate[] @relation("OrderLiveEstimateHistory")

  stopProgressEvents StopProgressEvent[]
  stopProgressStates StopProgressState[]
}
```

**Đã spike thật (không phải giả định):** 4 composite relation tự tham chiếu trên (`quotedRouteSnapshot`/`activeRouteSnapshot`/`currentNextStopEstimate`/`currentCompletionEstimate`) chạy được **Prisma-native**, xác nhận bằng `prisma validate` + `prisma migrate diff --from-empty --script` (Prisma 7.8.0) trên schema thử nghiệm độc lập — sinh đúng 1 composite FK mỗi pointer, không FK đơn cột trùng chức năng, không drift. Điều kiện bắt buộc: mỗi field composite dùng trong `fields:` của một relation phải có `@@unique` khai báo tường minh đúng bộ đó (Prisma không tự suy luận từ `@id`/`@unique` khác cột). **Không cần raw SQL FK cho 4 pointer này** — khác với kết luận sơ bộ ban đầu.

Kind ownership (current pointer đúng loại `NEXT_STOP`/`COMPLETION`) **không** được composite FK đảm bảo (FK chỉ đảm bảo cùng order) — TX cập nhật pointer phải tự kiểm tra `estimate.kind` trước khi gán, kèm test cố ý gán sai kind phải bị reject (checklist mục 7).

`OrderStop` cần thêm để làm target cho composite FK của `StopProgressEvent`/`StopProgressState`:

```prisma
model OrderStop {
  // ...existing...
  @@unique([id, orderId])
}
```

### 3.4 Stop progress — event log bất biến + con trỏ hiện hành

```prisma
enum StopProgressStep   { ARRIVED SERVICE_STARTED SERVICE_COMPLETED }
enum StopProgressAction { RECORDED VOIDED }

model StopProgressEvent {
  id                String   @id @default(uuid()) @db.Uuid
  orderId           String   @db.Uuid
  stopId            String   @db.Uuid
  step              StopProgressStep
  action            StopProgressAction @default(RECORDED)
  actorId           String   @db.Uuid
  clientRequestId   String?
  occurredAt        DateTime @db.Timestamptz(3)
  supersedesEventId String?  @unique @db.Uuid // chống void 2 lần cùng 1 event
  reason            String?  @db.VarChar(500)
  createdAt         DateTime @default(now()) @db.Timestamptz(3)

  order      Order @relation(fields: [orderId], references: [id], onDelete: Restrict)
  stop       OrderStop @relation(fields: [stopId, orderId], references: [id, orderId], onDelete: Restrict)
  actor      User @relation("StopProgressActor", fields: [actorId], references: [id], onDelete: Restrict)
  supersedes StopProgressEvent? @relation("StopProgressVoid", fields: [orderId, stopId, step, supersedesEventId], references: [orderId, stopId, step, id], onDelete: Restrict)
  supersededBy StopProgressEvent? @relation("StopProgressVoid")
  state      StopProgressState?

  @@unique([stopId, clientRequestId])
  @@unique([orderId, stopId, step, id], map: "stop_progress_event_order_stop_step_id_key")
  @@unique([orderId, stopId, step, supersedesEventId], map: "stop_progress_event_void_target_key")
  @@index([orderId, stopId, step])
}

model StopProgressState {
  orderId       String   @db.Uuid
  stopId        String   @db.Uuid
  step          StopProgressStep
  activeEventId String   @unique @db.Uuid
  updatedAt     DateTime @updatedAt @db.Timestamptz(3)

  order       Order @relation(fields: [orderId], references: [id], onDelete: Restrict)
  stop        OrderStop @relation(fields: [stopId, orderId], references: [id, orderId], onDelete: Restrict)
  activeEvent StopProgressEvent @relation(fields: [orderId, stopId, step, activeEventId], references: [orderId, stopId, step, id], onDelete: Restrict)

  @@id([orderId, stopId, step])
  @@unique([orderId, stopId, step, activeEventId], map: "stop_progress_state_active_event_key")
}
```

(Cả 2 composite relation self/cross trên cũng đã pass spike `prisma validate` + `migrate diff` — xem mục 8.)

```sql
ALTER TABLE "StopProgressEvent" ADD CONSTRAINT "stop_progress_event_recorded_no_supersedes"
  CHECK (action <> 'RECORDED' OR "supersedesEventId" IS NULL);
ALTER TABLE "StopProgressEvent" ADD CONSTRAINT "stop_progress_event_voided_requires_supersedes"
  CHECK (action <> 'VOIDED' OR ("supersedesEventId" IS NOT NULL AND reason IS NOT NULL AND length(trim(reason)) > 0));
```

**RECORDED insert + `StopProgressState` insert trong cùng TX** — PK `(orderId,stopId,step)` tự chặn ghi trùng ở DB, không chỉ ở service. **VOIDED xóa `StopProgressState` row** (cùng TX với insert event VOIDED) để bước sau đó có thể ghi lại (uuid `clientRequestId` mới — mục 6.3).

Ràng buộc nghiệp vụ **không** biểu diễn được bằng CHECK đơn giản (so sánh 2 row khác nhau), enforce trong TX + test bắt buộc (YAGNI — không thêm trigger DB, có thể nâng cấp sau nếu phát hiện lỗ hổng thực tế):
- Event bị void phải cùng `orderId/stopId/step` với event gốc.
- Void `ARRIVED` khi `SERVICE_STARTED` còn hiệu lực phải bị từ chối hoặc void dây chuyền theo thứ tự ngược.
- Command phải lock **`OrderStop`** (`SELECT id FROM "OrderStop" WHERE id=:stopId AND "orderId"=:orderId FOR UPDATE` — không lock `StopProgressState` vì row có thể chưa tồn tại) trước khi đọc 3 `StopProgressState`, theo đúng thứ tự khóa: `OrderStop → StopProgressState → StopProgressEvent → Order/revision/outbox`.

**Ảnh hưởng lifecycle `Order.status`** (service layer, không phải cột riêng):
- `PICKUP.SERVICE_COMPLETED` → chuyển `IN_TRANSIT` trong cùng TX nếu lifecycle guard cho phép.
- Intermediate `SERVICE_COMPLETED` → giữ `IN_TRANSIT`, chọn stop kế tiếp.
- `DROPOFF.SERVICE_COMPLETED` → **không** tự `DELIVERED` nếu chưa có ePOD hợp lệ — đẩy `primaryTask` sang `upload-proof`.
- Đơn 0-stop (không có intermediate): pickup/dropoff progress không hiển thị UI riêng, tiếp tục dùng `executeLifecycle` thô hiện có — chỉ một nguồn điều khiển tại một thời điểm.

### 3.5 Outbox

```prisma
enum OutboxEventType   { ROUTE_ETA_RECOMPUTE ROUTE_ETA_UPDATED ROUTE_UPDATED } // đặt tên tổng quát để Giai đoạn C tái dùng được
enum OutboxEventStatus { PENDING LEASED COMPLETED DEAD_LETTER } // không có FAILED — tránh nghĩa nước đôi với DEAD_LETTER

model OutboxEvent {
  id              String @id @default(uuid()) @db.Uuid
  aggregateType   String @db.VarChar(64)
  aggregateId     String @db.Uuid
  type            OutboxEventType
  schemaVersion   Int @default(1)
  inputRevision   Int?
  payload         Json
  dedupeKey       String @unique
  // ROUTE_ETA_RECOMPUTE: `${orderId}:ROUTE_ETA_RECOMPUTE:${inputRevision}`
  // ROUTE_ETA_UPDATED:   `${orderId}:ROUTE_ETA_UPDATED:${inputRevision}`
  // ROUTE_UPDATED:       `${orderId}:ROUTE_UPDATED:${routeSnapshotVersion}`
  status          OutboxEventStatus @default(PENDING)
  attempts        Int @default(0)
  maxAttempts     Int @default(8)
  leaseOwner      String? @db.VarChar(128)
  leaseGeneration Int @default(0) // fencing — chặn 2 worker cùng commit sau khi lease hết hạn
  leaseExpiresAt  DateTime? @db.Timestamptz(3)
  nextAttemptAt   DateTime @default(now()) @db.Timestamptz(3)
  lastError       String? @db.VarChar(500) // service phải strip query string/API key trước khi ghi
  completedAt     DateTime? @db.Timestamptz(3)
  createdAt       DateTime @default(now()) @db.Timestamptz(3)
  updatedAt       DateTime @default(now()) @updatedAt @db.Timestamptz(3)

  @@index([status, nextAttemptAt])
  @@index([status, leaseExpiresAt])
  @@index([aggregateId, type, inputRevision(sort: Desc)])
}
```

```sql
CREATE INDEX "OutboxEvent_pending_claim_idx" ON "OutboxEvent" ("nextAttemptAt","createdAt") WHERE status = 'PENDING';
CREATE INDEX "OutboxEvent_expired_lease_idx" ON "OutboxEvent" ("leaseExpiresAt") WHERE status = 'LEASED';
```

**Worker lease protocol:**
- Claim: `... WHERE status='PENDING' AND nextAttemptAt<=now() AND attempts<maxAttempts ORDER BY nextAttemptAt FOR UPDATE SKIP LOCKED LIMIT N`, rồi `leaseGeneration+=1, attempts+=1, status=LEASED, leaseOwner, leaseExpiresAt`.
- Reclaim: cùng câu mở rộng `OR (status='LEASED' AND leaseExpiresAt<now())`; nếu `attempts>=maxAttempts` khi reclaim → chuyển thẳng `DEAD_LETTER`, không cấp lease mới.
- Gia hạn lease (job chạy lâu): `UPDATE ... SET leaseExpiresAt=... WHERE id=:id AND status='LEASED' AND leaseOwner=:owner AND leaseGeneration=:generation AND leaseExpiresAt>now()` — **không hồi sinh** lease đã hết hạn (0 row → worker phải bỏ kết quả, không chạy TX2).
- Idempotency chống double-provider-call: trước khi gọi provider, kiểm tra `EXISTS (SELECT 1 FROM "OrderLiveEstimate" WHERE orderId=? AND inputRevision=?)` — nếu đã có (crash trước đó sau TX2 nhưng trước khi mark job COMPLETED) thì bỏ qua gọi provider, chỉ đảm bảo outbox NOTIFY tồn tại rồi mark COMPLETED.
- TX2 là ranh giới atomic duy nhất: ghi 2 row `OrderLiveEstimate` + cập nhật pointer (nếu còn mới nhất) + insert outbox NOTIFY + **mark job gốc COMPLETED** — tất cả trong 1 transaction, và **chỉ commit khi** `status=LEASED AND leaseOwner=self AND leaseGeneration=claimed AND leaseExpiresAt>now()` (điều kiện nằm trong `WHERE` của statement update `OutboxEvent`, 0 row = rollback).
- Publisher (đọc outbox NOTIFY) crash sau khi emit socket, trước khi mark COMPLETED → retry emit lại; client dedupe bằng `eventId = OutboxEvent.id`.
- `DEAD_LETTER` không tự động retry — chỉ một `routeEtaInputRevision` mới thật sự (lifecycle/stop/GPS coalesced/refresh-sau-cooldown, xem mục 4.4) mới tạo job mới, tránh vòng lặp gọi provider vô ích.

## 4. REST + Socket contract

Tái dùng nguyên `/tracking` namespace, room `order:${orderId}` đã có ở [tracking.gateway.ts](../../../apps/api/src/tracking/tracking.gateway.ts) — không mở gateway mới.

### 4.1 Vòng đời join room (tách khỏi GPS-eligibility)

Xác nhận `assertCanViewTracking` ([tracking.policy.ts:40](../../../apps/api/src/tracking/tracking.policy.ts:40)) không giới hạn theo status — join room hiện đã đủ rộng ở server, chỉ cần đổi client:

| Vai trò | Được join room | Được gửi GPS |
|---|---|---|
| Customer sở hữu đơn | REQUESTED → terminal | — |
| Driver được assign | ACCEPTED, PICKING_UP, IN_TRANSIT | PICKING_UP, IN_TRANSIT (không đổi — vẫn `isTrackingEligibleStatus`) |
| Admin/Fleet Owner | khi đang xem và có quyền | — |

Đổi 2 nơi (implementation, không phải server):
- [`tracking-sender.ts`](../../../apps/driver/src/features/orders/tracking-sender.ts): thêm `isRouteEtaSubscribeEligibleStatus` (`ACCEPTED|PICKING_UP|IN_TRANSIT`) cho `join-order`; giữ `isTrackingEligibleStatus` chỉ gate gửi GPS.
- [`CustomerOrderDetailRuntime.tsx`](../../../apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx): mở socket ngay khi mount với mọi status non-terminal.

### 4.2 REST — policy riêng, không tái dùng nguyên `getOrderById`

`GET /orders/:id/route-eta` — policy mới `assertCanViewRouteEta` (404 nhất quán cho mọi trường hợp không có quyền — route/legs/quoted ETA nhạy cảm hơn tracking đơn thuần, khác `assertCanViewTracking` đúng một chỗ: không có nhánh "Driver chưa assigned nhưng REQUESTED"):

```ts
function assertCanViewRouteEta(actor: AuthenticatedActor, order: RouteEtaOrderAccess): void {
  if (actor.role === Role.ADMIN) return;
  if (actor.role === Role.CUSTOMER && order.customerId === actor.userId) return;
  if (actor.role === Role.DRIVER && order.driverId === actor.userId) return;
  if (actor.role === Role.FLEET_OWNER && hasSharedActiveFleet(order.activeOwnerFleetIds, order.activeDriverFleetIds)) return;
  throw new DomainError('RESOURCE_NOT_FOUND', 404, 'Không tìm thấy đơn hàng');
}
```

Response:

```ts
interface RouteEtaResponse {
  orderId: string;
  serverTime: string;                 // backend sở hữu, client chỉ hiển thị đồng hồ UI dựa trên field này
  desiredInputRevision: number;       // Order.routeEtaInputRevision
  currentInputRevision: number | null; // revision của estimate đang là pointer

  recompute: {
    state: 'CURRENT' | 'PENDING' | 'FAILED';
    failedReason: EtaUnavailableReason | null;
    failedInputRevision: number | null;
    nextRetryAt: string | null;
  };

  quotedRoute: QuotedRouteView | null;
  activeRoute: ActiveRouteView | null;
  estimates: { nextStop: CurrentEstimateView | null; completion: CurrentEstimateView | null };
}

interface RouteLegView {
  fromStopId: string; toStopId: string; distanceM: number; durationS: number;
  geometryStartIndex?: number; geometryEndIndex?: number;
  progress: 'COMPLETED' | 'ACTIVE' | 'PENDING';
}

interface ActiveRouteView {
  snapshotId: string; routeSnapshotVersion: number;
  geometryEncoding: 'POLYLINE5' | 'POLYLINE6';
  fullRouteCoords: readonly { lat: number; lng: number }[]; // đã decode ở backend
  legs: readonly RouteLegView[];
  geometryHash: string; // = routeHash, client biết geometry thật sự đổi
  calculatedAt: string; ageSeconds: number;
  source: 'VIETMAP' | 'DEMO'; quality: RouteSnapshotQuality;
}

interface CurrentEstimateView {
  kind: 'NEXT_STOP' | 'COMPLETION';
  outcome: 'AVAILABLE' | 'UNAVAILABLE';
  targetStopId: string | null;
  remainingDistanceM: number | null; remainingDurationS: number | null; arrivalAt: string | null;
  unavailableReason: EtaUnavailableReason | null;
  calculatedAt: string; validUntil: string;
  isStale: boolean; staleSinceAt: string | null; // backend tính 1 lần — xem mục 4.3
}
```

`legs`/geometry có kiểu tường minh — không trả `Json` Prisma thô qua REST.

### 4.3 Stale — backend tính một lần, client chỉ hiển thị

```
isStale =
     now() - calculatedAt > ROUTE_ETA_STALE_AFTER_S   (cấu hình, mặc định 90s)
  OR now() - validUntil   > 0
  OR (có gpsPointId AND now() - gpsPoint.capturedAt > GPS_STALE_AFTER_S)
```

Backend tính `isStale`/`staleSinceAt` một lần, nhét vào `CurrentEstimateView`; client **không** tự định nghĩa lại ngưỡng, chỉ hiển thị + chạy đồng hồ UI dựa trên `serverTime`. `status=SUPERSEDED` không liên quan `isStale` — SUPERSEDED chỉ dùng audit, không bao giờ được current pointer trỏ tới.

Failure contract: nếu route re-fetch fail nhưng `activeRouteSnapshot` cũ còn dùng được (stop sequence không đổi, vehicle profile không đổi, geometry decode được, GPS chưa lệch tuyến quá ngưỡng) → giữ nguyên, trả `ageSeconds`. Nếu ETA recompute cạn retry (`DEAD_LETTER`): còn `AVAILABLE` cũ → giữ pointer, `recompute.state='FAILED'` (client đọc field này, **không** suy từ `isStale`); chưa từng có `AVAILABLE` → pointer trỏ `UNAVAILABLE(PROVIDER_EXHAUSTED)`.

### 4.4 Trigger bump `routeEtaInputRevision`

Cùng TX với thao tác gốc: (1) `AcceptOrderService` → `ACCEPTED`; (2) `StopProgressEvent` insert `action=RECORDED` **hoặc `VOIDED`** (VOID cũng bump — nếu không, void ARRIVED/COMPLETED mà ETA vẫn tính trên progress đã hủy); (3) GPS coalesced (`now()-Order.routeEtaLastBumpAt >= MIN_RECOMPUTE_INTERVAL_S` mặc định 30s **và** (di chuyển `>=MIN_RECOMPUTE_DISTANCE_M` mặc định 50m **hoặc** `validUntil` đã qua)) — mở rộng transaction của `TrackingService.recordPoint()`/`recordPointAtomically()` để chèn coalescing-check+bump+outbox vào **cùng TX** ghi tracking point, không enqueue sau khi hàm đã return; (4) reroute thủ công; (5) refresh sau cooldown khi `DEAD_LETTER` không có trigger tự nhiên nào trong khoảng cấu hình (vd 5 phút) — coi là input revision mới hợp lệ, tránh ETA đứng hình vô thời hạn vì phụ thuộc thời gian khởi hành.

### 4.5 Socket — một event nguyên tử cho cả cặp estimate

```ts
// packages/shared/src/socket.ts — bổ sung TrackingSocketEvent
routeEtaUpdated: 'route-eta:updated',
routeUpdated: 'route:updated',
```

```ts
interface RouteEtaUpdatedEventV1 {
  schemaVersion: 1; eventId: string; orderId: string; inputRevision: number; occurredAt: string;
  estimates: { nextStop: CurrentEstimateView; completion: CurrentEstimateView };
}
interface RouteUpdatedEventV1 {
  schemaVersion: 1; eventId: string; orderId: string; inputRevision: number; occurredAt: string;
  routeSnapshotVersion: number; geometryHash: string;
  reason: 'REROUTE' | 'STOP_COMPLETED' | 'MANUAL_RECOVERY';
}
```

`ROUTE_UPDATED` chỉ phát khi `activeRouteSnapshotId` đổi giá trị thật; ETA đổi trên cùng route chỉ phát `ROUTE_ETA_UPDATED`. **Bỏ hẳn** `eta:updated`/`EtaUpdatedEvent` legacy ([tracking-socket.ts](../../../apps/mobile/src/features/customer/orders/tracking-socket.ts)) — xác nhận không có emitter production nào phụ thuộc (chỉ còn listener), không cần giai đoạn tương thích song song.

`TrackingGateway` implement trực tiếp port `RouteEtaRealtimeEmitter { emitRouteEtaUpdated(); emitRouteUpdated(); }` — publisher đọc outbox NOTIFY gọi thẳng emitter, **không** qua một in-memory publisher trung gian (khác pattern `OrderEventsPublisher` hiện tại) vì route-eta đã có outbox durable, không nên tái tạo một đoạn không durable ở giữa.

**Giới hạn triển khai phải ghi rõ:** nếu chạy nhiều API replica, cần Socket.IO adapter chia sẻ (Redis) để worker ở replica A phát được tới client nối vào replica B. Pilot A+B **giới hạn ở đúng 1 API replica** cho tính năng này cho tới khi adapter được thêm.

### 4.6 Reconciliation — reducer monotonic dùng chung REST + socket

```
onReceive(incoming):
  if incoming.inputRevision < local.inputRevision: bỏ
  elif ==: REST bổ sung field thiếu, không ghi đè bằng null; socket trùng eventId đã xử lý thì bỏ
  else: thay toàn bộ state
```

Reconnect chuẩn: gắn listener → connect → đợi join-order ack → `GET route-eta` → đưa qua reducer y hệt 1 socket event.

### 4.7 Progress/void — idempotent theo vòng đời logical command

```ts
POST /orders/:id/stops/:stopId/progress          { step, clientRequestId, occurredAt }
POST /orders/:id/stops/:stopId/progress/void      { supersedesEventId, clientRequestId, reason, occurredAt } // Admin only

interface StopProgressCommandResponse {
  progressEvent: { id, orderId, stopId, step, action, occurredAt };
  recompute: { inputRevision: number; state: 'QUEUED' };
  currentRouteEta: RouteEtaResponse; // không trả LiveEstimateView đơn lẻ — tránh hiểu nhầm ETA đã phản ánh progress vừa ghi
  replayed: boolean; // true nếu clientRequestId trùng — không bump revision lần 2
}
```

`occurredAt` validate biên so `serverTime` (ngưỡng cấu hình); thứ tự nghiệp vụ luôn dùng lock + server timestamp, không tin đồng hồ thiết bị.

## 5. Màn hình Driver

### 5.1 `RealInteractiveMap` — chính sách route tuyệt đối, không fallback ngầm

```ts
export type RouteResolutionPolicy = 'PROVIDED_ONLY' | 'ALLOW_CLIENT_PREVIEW';
export type RealInteractiveMapProps = Readonly<{
  // ...
  routeResolutionPolicy?: RouteResolutionPolicy; // default 'ALLOW_CLIENT_PREVIEW' — giữ hành vi cũ cho location-picker/address-book
  routeCoords?: readonly RouteCoordinate[]; // packages/shared, KHÔNG import MapCoordinate của mobile-core ngược layer
}>;
```

`buildLeafletHtml` khi `PROVIDED_ONLY`: **không sinh** nhánh gọi Vietmap/OSRM vào chuỗi HTML (không chỉ "không chạy lúc runtime") — dù `routeCoords` rỗng/không hợp lệ, chỉ vẽ marker + banner "Chưa có dữ liệu tuyến đường", tuyệt đối không có URL provider/API key nào trong DOM/JS được render. `MissionMapCanvas` luôn truyền `PROVIDED_ONLY`.

Xác nhận phạm vi: chỉ đóng lộ key cho **Driver tracking mode**. Các mode khác (Customer location-picker/address-book) vẫn nhúng `EXPO_PUBLIC_VIETMAP_API_KEY` — đã tách thành task riêng ngoài spec này (mục 8), không âm thầm bỏ qua.

Marker origin/destination/stop dùng tọa độ thật (`lat/lng` từ backend), **không** gọi `resolveLocationCoords()` trong tracking mode — hàm đó chỉ còn dùng ở preview/location-picker.

### 5.2 Model Driver mới

```ts
type DriverStopProgressStatus = 'PENDING' | 'ARRIVED' | 'IN_SERVICE' | 'COMPLETED';

type DriverRouteStopView = Readonly<{
  id: string; type: 'PICKUP' | 'STOP' | 'DROPOFF'; sequence: number; label: string;
  lat: number | null; lng: number | null;
  progress: DriverStopProgressStatus;
  nextAllowedStep: 'ARRIVED' | 'SERVICE_STARTED' | 'SERVICE_COMPLETED' | null; // isActionable = nextAllowedStep !== null; backend vẫn xác minh lại
}>;

type DriverEtaOutcomeView = Readonly<{
  outcome: 'AVAILABLE' | 'UNAVAILABLE';
  label: string | null; unavailableLabel: string | null;
  isStale: boolean; staleSinceLabel: string | null;
}>;

type DriverRouteEtaView = Readonly<{
  fullRouteCoords: readonly RouteCoordinate[];
  completedRouteCoords: readonly RouteCoordinate[]; // cắt theo legs[].progress — backend project GPS, client không tự suy luận
  activeRouteCoords: readonly RouteCoordinate[];
  pendingRouteCoords: readonly RouteCoordinate[];
  source: 'VIETMAP' | 'DEMO'; quality: RouteSnapshotQuality;
  estimateAgeLabel: string | null; // KHÁC routeAgeLabel — route cũ và ETA cũ là 2 tuổi khác nhau, không gộp
  routeAgeLabel: string | null;
  geometryState: 'AVAILABLE' | 'UNAVAILABLE' | 'LEGACY';
  nextStop: DriverEtaOutcomeView | null; completion: DriverEtaOutcomeView | null;
  recompute: 'CURRENT' | 'PENDING' | 'FAILED';
}>;
```

`packages/shared` thêm `decodePolyline(encoded, encoding): RouteCoordinate[]` — pure function, bảo vệ: encoding cắt giữa chừng, tọa độ ngoài `[-90,90]/[-180,180]`, chuỗi quá lớn, quá nhiều điểm (giới hạn cấu hình, trả lỗi thay vì cho WebView nghẽn), cả `POLYLINE5`/`POLYLINE6` và tọa độ âm.

### 5.3 `MissionMapCanvas`

- Pill chính (bottom-left, vị trí cũ): ETA next-stop — `AVAILABLE→label` / `UNAVAILABLE→unavailableLabel`; khi `isStale` thêm `staleSinceLabel` mờ. Khi `source==='DEMO'` luôn kèm "Dữ liệu mô phỏng" cạnh "ETA dự kiến · Xp" (đúng invariant CLAUDE.md).
- Badge phụ (top-left, cạnh status pill hiện có): `recompute='PENDING'` → "Đang cập nhật ETA…"; `FAILED` → dùng `estimateAgeLabel` (không phải `routeAgeLabel`) trong thông báo.
- Marker giữa đường cho mỗi `DriverRouteStopView`: phân biệt bằng **số thứ tự + icon + `accessibilityLabel`** theo `progress` (không chỉ màu — a11y rule dự án).
- Polyline 3 dải: `completedRouteCoords` (xám mờ) / `activeRouteCoords` (nổi bật) / `pendingRouteCoords` (trung tính) — backend đã cắt theo `legs[].progress`, không tự suy luận ở client.
- `openExternalNavigation` trỏ tới `stops.find(isActionable)`; nếu stop đó không có `lat/lng` thật → nút **disabled** + báo lỗi dữ liệu, không fallback tìm theo label. Wording đổi thành "Mở bản đồ đến điểm tiếp theo" (bỏ hàm ý dẫn theo tuyến Vietmap — Google Maps tự chọn tuyến riêng, không đảm bảo constraint xe tải); `TRUCK` thêm cảnh báo phụ về giới hạn tải trọng khi mở external nav. Tích hợp SDK giữ nguyên tuyến Vietmap là quyết định hoãn (Mở rộng), không phải thiếu sót.

### 5.4 Idempotency theo vòng đời command (không phải theo `(orderId,stopId,step)` cố định)

```
Tap lần đầu cho một step → tạo uuid mới, lưu vào pending-command store (key=`${orderId}:${stopId}:${step}`)
Retry (timeout/mất mạng), pending còn → dùng lại đúng uuid
Thành công → xóa pending
Sau khi Admin void step đó (server báo qua nextAllowedStep mở lại) → tap mới → uuid mới
```

Double-tap chặn ở UI bằng mutation-pending state (disable nút khi đang chờ); backend idempotency là lớp bảo vệ cuối.

### 5.5 `useRouteEtaChannel` — TanStack Query sở hữu, không tạo state thứ hai

```ts
const routeEtaKey = ['driver', 'order', orderId, 'route-eta'];
const routeEtaQuery = useQuery({
  queryKey: routeEtaKey,
  queryFn: () => port.getRouteEta(orderId),
  enabled: isRouteEtaSubscribeEligibleStatus(status),
});
// socket handler và StopProgressCommandResponse đều:
queryClient.setQueryData(routeEtaKey, current => reduceRouteEtaByRevision(current, incoming));
```

Hook chỉ quản lý socket lifecycle (join/reconnect theo đúng thứ tự mục 4.6), không giữ `useState` song song. Map vào view qua pure function riêng (test độc lập):

```ts
const view = query.data.kind === 'content'
  ? mapDriverDetailView(query.data, { tracking: liveTracking, routeEta: routeEtaQuery.data })
  : query.data;
// mapDriverDetailView ghi routeEta vào đúng cấp view.order.route.eta — không ghép object trực tiếp trong component
```

Hook trả 5 trạng thái network (`initialLoading/refreshing/offline/error/content`) tách bạch khỏi `recompute` (business state từ backend) — hai trục độc lập.

## 6. Migration dữ liệu cũ

`Order.routeSnapshot`(Json cũ)/`etaSeconds`/`durationSeconds` **giữ nguyên**, không backfill giả. Field mới (`quotedRouteSnapshotId`, `activeRouteSnapshotId`, `currentNextStopEstimateId`, `currentCompletionEstimateId`) nullable — đơn cũ `NULL`. API/Driver UI đọc field mới trước; null với đơn active → fallback dữ liệu cũ, nhãn "dữ liệu trước nâng cấp".

Job recovery một-lần cho đơn đang chạy (status không terminal) tại thời điểm deploy: **chỉ** tạo `OrderRouteSnapshot(quality=LEGACY_RECOVERED)` khi JSON cũ có đủ tọa độ + geometry hợp lệ, ghi `legacySourceSnapshotJson`/`legacyMissingFields`/`recoveryJobVersion`/`recoveredAt`. Nếu thiếu → **không tạo snapshot giả**, chỉ enqueue `OutboxEvent(ROUTE_ETA_RECOMPUTE)` để pipeline thật tính lại (`quality=VERIFIED_PROVIDER`) ở lượt đầu sau deploy.

Migration phải test trên DB sạch **và** DB có dữ liệu giả lập đơn cũ (test riêng cho job recovery); mọi partial unique index đặt tên cố định (`map:`).

## 7. Checklist kiểm chứng (bổ sung C08-C22 gốc, không thay thế)

**Backend:**
- Unique violation trên `@@unique([orderId,inputRevision,kind])` trong TX2 xử lý như idempotent-success, không phải lỗi worker không phục hồi được.
- Gán sai `kind` vào current pointer phải bị service reject (test riêng).
- Worker mất lease giữa chừng (heartbeat fail) → không chạy TX2, không tạo estimate.
- Hai worker cùng reclaim sau lease hết hạn → chỉ một commit được nhờ `leaseGeneration` fencing.
- Revision cũ hoàn tất sau revision mới → lưu SUPERSEDED, không phát `ROUTE_ETA_UPDATED`.
- Void ARRIVED khi SERVICE_STARTED còn hiệu lực → reject hoặc void dây chuyền đúng cấu hình.
- Retry cùng `clientRequestId` trên `/progress` → trả đúng event cũ, không bump revision lần 2.
- Migration recovery job: đơn đủ dữ liệu → `LEGACY_RECOVERED`; đơn thiếu → không tạo snapshot giả, có outbox chờ tính lại.
- `pnpm --filter api exec prisma validate` và `prisma migrate diff --exit-code` sạch trước khi coi migration xong.

**Driver app:**
- `MissionMapCanvas` đủ 4 tổ hợp `recompute × outcome`.
- `RealInteractiveMap`: có `routeCoords` hợp lệ → không có key/URL provider trong HTML sinh ra (export `buildLeafletHtml` hoặc wrapper thuần để assert chuỗi, **không** trông cậy `WebView` mock hiện đang trả `null` trong Jest); không có/không hợp lệ → vẫn không có key/URL, hiển thị "chưa có dữ liệu tuyến đường"; mode khác (preview/location) giữ hành vi cũ (regression).
- Marker dùng tọa độ thật, không qua `resolveLocationCoords()` trong tracking mode.
- Decoder: polyline5/6, malformed, tọa độ âm, chuỗi quá lớn, quá nhiều điểm.
- Socket revision mới không bị REST revision cũ ghi đè (reducer test).
- Navigation chọn đúng actionable stop khi có nhiều stop; disabled khi thiếu tọa độ thật.
- Pickup/intermediate/dropoff progress cập nhật đúng lifecycle Order.
- `FAILED + AVAILABLE cũ` hiển thị dùng `estimateAgeLabel`, không dùng `routeAgeLabel`.
- Demo source luôn hiện "Dữ liệu mô phỏng".
- **Bắt buộc một lượt kiểm tra thủ công/E2E trên Android thật** trước khi coi Phần Driver nghiệm thu — bộ Jest hiện tại (WebView mock `null`) không phủ được hành vi WebView thật.

## 8. Việc đã tách ra ngoài spec (không lẫn phạm vi khi implement)

- **task_f7e0d42a** — di dời `EXPO_PUBLIC_VIETMAP_API_KEY`/client-side Vietmap routing ra khỏi các mode preview/location/pin của `RealInteractiveMap` (ngoài Driver tracking), hoặc xác nhận đây là public key có domain/app restriction an toàn.
- Spike Prisma composite self-relation (mục 3.3/3.4) đã chạy thật bằng file schema thử nghiệm (`prisma validate` + `prisma migrate diff --from-empty --script`, Prisma 7.8.0), xóa sau khi xong — kết quả đã đưa thẳng vào bản chốt ở mục 3, không còn là việc "cần làm ở Phần 4" nữa.

## 9. Quyết định cần chốt khi bắt đầu triển khai (kế thừa từ tài liệu gốc, thu hẹp theo A+B)

1. Giá trị cụ thể cho `ROUTE_ETA_STALE_AFTER_S`, `GPS_STALE_AFTER_S`, `MIN_RECOMPUTE_INTERVAL_S`, `MIN_RECOMPUTE_DISTANCE_M`, cooldown refresh sau `DEAD_LETTER` — để cấu hình, có baseline đề xuất trong spec này nhưng cần xác nhận trên dữ liệu pilot thật.
2. Ngưỡng "lệch tuyến" dùng để quyết định route cũ còn dùng được hay phải gọi lại provider.
3. Có tích hợp SDK dẫn đường giữ tuyến Vietmap thay Google Maps external nav hay chấp nhận giới hạn đã nêu ở mục 5.3.
4. Ngưỡng độ dài polyline/số điểm tối đa trước khi coi là "quá lớn" cho decoder + WebView.

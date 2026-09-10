# Thiết kế: ETA chuẩn + Gợi ý tuyến đường (Vietmap Route v4 đầy đủ)

- **Ngày:** 2026-09-04
- **Nhánh:** feature/mobile-profile-media-payment
- **Trạng thái:** Đề xuất (chờ review)
- **Tham chiếu UX:** Google Maps / Grab — bottom sheet chọn tuyến, tuyến đề xuất tô đậm, tuyến phụ tô nhạt, badge màu theo mức kẹt xe

---

## 1. Bối cảnh & Vấn đề

Khách hàng (Bên A) yêu cầu bổ sung: *"ETA phải chuẩn đầy đủ các trường hợp, gợi ý tuyến đường hợp lý"*. Đây là thay đổi thuộc Điều 5.4 hợp đồng (*"Thêm thuật toán AI/OR-Tools ở mức vận hành thật"* xét theo tinh thần, dù giải pháp cuối không cần AI riêng) — đã được thống nhất xử lý bằng cách khai thác triệt để Vietmap Route API v4 đang có sẵn trong gói đã ký, thay vì tự xây AI ETA/OR-Tools.

Hiện trạng code (`apps/api/src/maps`):

- `VietmapProvider.route()` gọi `/api/route/v4` nhưng **không gửi** `alternative`, `annotations=congestion`, hay `capacity` — chỉ lấy `paths[0]`, bỏ hết dữ liệu traffic và các tuyến khác Vietmap trả về.
- `RouteInput` chưa có trường khối lượng hàng (`cargoWeightKg`) nên không thể gọi đúng profile `vehicle=truck&capacity=`.
- `MapsService.estimate()` trả về **1 route duy nhất**, 1 `estimateToken` duy nhất — đúng như hợp đồng MVP ("ETA mức MVP: Vietmap ETA + rule cơ bản") nhưng chưa đáp ứng yêu cầu mới.
- Mobile (`CustomerCreateOrderScreen`) chỉ hiển thị 1 khối ETA/giá, không có UI chọn tuyến.

**Đã xác nhận qua docs chính thức Vietmap** (maps.vietmap.vn/docs) — API hiện có nhưng chưa dùng:

| Tham số Route v4 | Vietmap trả về | Trạng thái |
|---|---|---|
| `alternative=true` | Nhiều tuyến trong `paths[]` | Chưa dùng |
| `annotations=congestion` | Mức kẹt xe từng đoạn: `low/moderate/heavy/severe/unknown` theo tốc độ trung bình | Chưa dùng |
| `vehicle=truck&capacity=<kg>` | Route riêng cho xe tải theo tải trọng | Có gửi `vehicle`, **thiếu `capacity` bắt buộc** |

## 2. Mục tiêu

1. ETA được tính dựa trên **thời gian tuyến đường do Vietmap cung cấp**, có bổ sung thông tin congestion theo từng đoạn khi provider trả dữ liệu (`annotations=congestion`) — không claim "chính xác tuyệt đối trong mọi trường hợp"; khi Vietmap không trả annotation (hoặc ở demo fallback), hiển thị `congestionLevel: 'unknown'` thay vì suy diễn.
2. Trả về **nhiều lựa chọn tuyến đường** thay vì 1 tuyến cố định, mỗi tuyến có **giá + estimateToken riêng** — khách chọn tuyến nào thì đặt đơn theo tuyến đó.
3. Route cho xe tải dùng đúng `capacity` (khối lượng hàng thật) để Vietmap tính đường phù hợp tải trọng.
4. UX chọn tuyến giống các app bản đồ/gọi xe phổ biến (Google Maps, Grab): danh sách tuyến, tuyến đề xuất nổi bật, badge màu traffic, chọn tuyến cập nhật polyline + giá ngay trên bản đồ.

## 3. Ngoài phạm vi (Non-goals)

- **VRP/dispatch** (ghép đơn cho tài xế, giảm chạy rỗng) — bài toán khác hẳn, xử lý ở đề xuất riêng (Vietmap VRP API), không nằm trong spec này.
- Toll cost hiển thị/tính vào giá — Vietmap trả `toll_cost` nhưng pricing hiện tại (`PricingService`) không cộng phí cầu đường; giữ nguyên công thức giá hiện có, không mở rộng ở lần này.
- Truck routing "chuyên sâu" (cấm tải/cầu thấp/giờ cấm bằng dữ liệu giao thông riêng) — dựa hoàn toàn vào profile `truck`/`capacity` sẵn có của Vietmap, không tự xây thêm luật.
- Thời tiết, dự báo ETA bằng ML (XGBoost) — đã xác nhận optional/phase sau theo Điều 1.6 hợp đồng, không đổi quyết định đó.

## 4. Quyết định đã chốt

| # | Quyết định | Lý do |
|---|---|---|
| D1 | `MapProvider.route()` đổi kiểu trả về từ `RouteEstimate` (1 object) sang `RouteEstimate[]` (nhiều route) | Vietmap trả `paths[]` trong 1 lần gọi; không cần N request riêng |
| D2 | Mỗi route trong response có **estimateToken riêng** (không chỉ route recommended) | Đã chốt ở vòng trao đổi trước: khách chọn tuyến nào, đặt đơn theo tuyến đó |
| D3 | Mỗi route có **`routeId` ổn định** (`route-0`, `route-1`, `route-2` theo thứ tự trả về), nhúng vào payload token đã ký và trả lại qua `verify()` trong `VerifiedOrderEstimate.routeId` | **Không phải vá lỗ hổng giá** — token vốn ký toàn bộ `{routeInput, estimate, quote}` nên Token A luôn tự mang đúng giá/khoảng cách của Route A, không thể decode ra dữ liệu route khác. `routeId` giải quyết vấn đề khác: **truy vết/audit** (đơn tạo từ route nào) và bắt sớm bug phía client (UI hiển thị route đã chọn nhưng gửi nhầm token khác) — module `orders` **không bắt buộc phải đổi**, `routeId` là field thêm vào, có thể dùng hoặc bỏ qua |
| D4 | `cargoWeightKg` là trường **thật** trong request `/orders/estimate` (không dùng `maxWeightKg` mặc định theo loại xe) | Đã chốt ở vòng trước: cần chính xác theo hàng thực tế; mobile đã có sẵn field `cargoWeight` ở form tạo đơn, giờ nối vào estimate |
| D5 | Route "recommended" = **`durationS` nhỏ nhất** trong các route trả về, không áp thêm phạt congestion vào thứ tự xếp hạng | Giữ đơn giản cho MVP; `congestionLevel` vẫn hiển thị để khách tự cân nhắc, không cần thuật toán scoring phức tạp |
| D6 | Giới hạn tối đa **3 route** trả về cho khách (nếu Vietmap trả nhiều hơn, cắt bớt theo `durationS` tăng dần) | Tránh UI rối, giống Google Maps (thường hiển thị 2-3 lựa chọn) |
| D7 | `cargoWeightKg` được đưa vào phần chuẩn hoá route input mà token ký (HMAC) | Token phải phản ánh đúng khối lượng đã khai báo lúc ước tính, tránh lệch dữ liệu giữa lúc ước tính và lúc tạo đơn |

## 5. Kiến trúc luồng

```
Customer nhập pickup/dropoff/stops + chọn vehicleType (+cargoWeightKg nếu TRUCK)
                          │
                          ▼
        POST /orders/estimate  (EstimateRequestDto + cargoWeightKg?)
                          │
                          ▼
                 MapsService.estimate()
                          │
                          ▼
        MapProvider.route(input) ── 1 lần gọi Vietmap:
        /api/route/v4?...&alternative=true&annotations=congestion
                        &vehicle=truck&capacity=<kg>  (khi TRUCK)
                          │
                          ▼
              RouteEstimate[] (paths[], mỗi cái có congestionLevel)
                          │
              ┌───────────┴────────────┐
              ▼                        ▼
      với MỖI route:            chọn recommended
      PricingService.quote()    (durationS nhỏ nhất,
      EstimateTokenService      cắt còn tối đa 3)
        .issue() → token riêng
              │
              ▼
   { routes: [ { ...RouteEstimate, estimateToken, isRecommended }, ... ] }
                          │
                          ▼
        Mobile: hiển thị bottom sheet chọn tuyến (giống Google Maps/Grab)
        → khách chọn 1 route → gửi estimateToken của route đó khi tạo đơn
                          │
                          ▼
        POST /orders  (estimateToken của route đã chọn)
        → EstimateTokenService.verify(token, routeInput từ request tạo đơn)
        → verify khớp bình thường (D3), không cần sửa module orders
```

## 6. Thay đổi chi tiết theo file

### Backend — `apps/api/src/maps`

**`providers/map-provider.ts`**
```ts
export type CongestionLevel = 'low' | 'moderate' | 'heavy' | 'severe' | 'unknown';

export interface RouteInput {
  pickup: GeoPoint;
  stops: GeoPoint[];
  dropoff: GeoPoint;
  vehicleType: string;
  cargoWeightKg?: number;        // NEW — bắt buộc khi vehicleType === 'TRUCK'
}

export interface RouteEstimate {
  polyline: string;
  distanceM: number;
  durationS: number;
  estimatedArrivalAt: string;
  estimatedPriceVnd: number;
  source: MapProviderSource;
  calculatedAt: string;
  isEstimate: boolean;
  congestionLevel: CongestionLevel;   // NEW — 'unknown' nếu provider không trả (demo)
}

export interface MapProvider {
  search(query: string): Promise<PlaceCandidate[]>;
  geocode(placeId: string): Promise<GeocodeResult>;
  route(input: RouteInput): Promise<RouteEstimate[]>;   // CHANGED: mảng thay vì 1 object
}

export interface VerifiedOrderEstimate extends RouteEstimate {
  routeId: string;              // NEW — đọc lại từ token payload, phục vụ truy vết/audit
  normalizedInput: RouteInput;
  expiresAt: string;
}
```

**`providers/vietmap.provider.ts`**
- `buildRouteUrl()`: thêm `alternative=true`, `annotations=congestion`; khi `input.vehicleType === 'TRUCK'` thêm `capacity=String(input.cargoWeightKg)` (ném `VietmapProviderError` nếu thiếu `cargoWeightKg` cho truck — validate sớm ở controller, đây là lớp phòng thủ thứ 2).
- `firstRoutePath()` → đổi tên `allRoutePaths()`, trả `payload.paths` (toàn bộ mảng, không chỉ phần tử đầu), validate mỗi path có `distance`/`time`/`points` hợp lệ, bỏ qua path lỗi thay vì fail cả request nếu còn ít nhất 1 path hợp lệ.
- Thêm hàm `deriveCongestionLevel(path)`: đọc `path.annotations` (nếu có), trả về mức **nặng nhất** xuất hiện trong tuyến (`severe` > `heavy` > `moderate` > `low`); trả `'unknown'` nếu không có annotation.
- `route()` trả `paths.map(pathToRouteEstimate)`.

**`domain/demo-route-estimator.ts`**
- `estimate()` đổi thành trả `[singleEstimate]` (mảng 1 phần tử), `congestionLevel: 'unknown'` — demo không mô phỏng traffic thật, giữ đúng tinh thần "không claim ETA chính xác cho demo data" đã ghi trong plan gốc.

**`domain/estimate-token.service.ts`**
- `RouteInput`/`normalizeRouteInput()`: thêm chuẩn hoá `cargoWeightKg` (làm tròn về số nguyên kg, `undefined` giữ nguyên `undefined`).
- `isEqualPoint`/so khớp trong `verify()`: thêm so sánh `cargoWeightKg` giữa `normalizedRequested` và `payload.routeInput` (coi `undefined === undefined` là khớp).
- `IssueEstimateTokenInput` thêm `routeId: string`; `EstimateTokenPayload` thêm `routeId: string` (ký cùng payload, không thể sửa sau khi phát hành); `verify()` trả `routeId` trong `VerifiedOrderEstimate` (đọc thẳng từ payload đã giải mã, không cần so khớp thêm gì — đây là **traceability field**, không phải điều kiện pass/fail của `verify()`).
- Không đổi cấu trúc chữ ký `issue()`/`verify()` ngoài field `routeId` — vẫn 1 token = 1 route, gọi `issue()` N lần cho N route; mỗi token tự mang đúng `distanceM/durationS/polyline/giá/routeId` của chính route đó (không thể decode chéo sang route khác).

**`maps.service.ts`**
```ts
async estimate(input: RouteInput): Promise<OrderEstimateResponse> {
  const routeEstimates = await this.withProvider(() => this.mapProvider.route(input));
  const limited = takeTopByDuration(routeEstimates, MAX_ROUTES); // D6: tối đa 3
  const recommendedIndex = indexOfMinDuration(limited);          // D5

  const routes = limited.map((estimate, index) => {
    const routeId = `route-${index}`;
    const quote = this.pricingService.quote({
      vehicleType: input.vehicleType,
      distanceMeters: estimate.distanceM,
      stopCount: input.stops.length,
    });
    const pricedEstimate = { ...estimate, estimatedPriceVnd: quote.amountVnd };
    const estimateToken = this.estimateTokenService.issue({ routeInput: input, estimate: pricedEstimate, quote, routeId });

    return { ...pricedEstimate, routeId, estimateToken, isRecommended: index === recommendedIndex };
  });

  return { routes };
}
```
- `OrderEstimateResponse` đổi thành `{ routes: RouteOptionResponse[] }` với `RouteOptionResponse extends RouteEstimate { routeId: string; estimateToken: string; isRecommended: boolean }`. `routeId` được gán theo thứ tự trong mảng đã giới hạn (`route-0` luôn tồn tại; không đảm bảo `route-0` là recommended — dùng cờ `isRecommended` để biết, không suy từ `routeId`).
- Nếu `routeEstimates` rỗng (không path hợp lệ) → ném lỗi `MAP_PROVIDER_UNAVAILABLE` như hiện tại (không có route nào để trả).

**`maps.controller.ts`**
- `EstimateRequestDto` thêm `cargoWeightKg?: number`.
- `validateEstimateRequest()`: nếu `vehicleType === 'TRUCK'` → `cargoWeightKg` bắt buộc, số nguyên dương, `<= vehicleOption.maxWeightKg` — **tra từ `VEHICLE_OPTIONS` (packages/shared) theo `vehicleType`, không hard-code `3500`**, để không lệch nếu sau này `VEHICLE_OPTIONS` thêm hạng xe tải mới (vd. tải nặng) mà quên đồng bộ chỗ validate.
- `toRouteInput()` truyền `cargoWeightKg` khi có.

### Backend — hợp đồng API

- `apps/api/openapi/openapi.yaml`: cập nhật schema `EstimateRequest` (thêm `cargoWeightKg`) và `OrderEstimateResponse` (đổi hẳn sang `{ routes: [...] }`), đổi từ object sang array theo D2.
- `apps/api/test/openapi-contract.spec.ts`, `apps/api/src/maps/maps.e2e-spec.ts`: cập nhật theo shape mới (thuộc phần TDD viết lại test trước khi sửa implementation).

### Mobile — `apps/mobile/src/features/customer/orders`

- **`model.ts`**: `CustomerCreateFormScreenView.estimate` đổi từ 1 object `ready` sang `{ kind: 'ready', routes: RouteOptionView[], selectedRouteId: string }` (giữ nguyên các kind khác: `loading/error/expired/outdated/idle`).
- **`adapter.ts`**: map response `routes[]` từ API sang `RouteOptionView[]`; thêm action `onSelectRoute(routeId)` cập nhật `selectedRouteId`.
- **`CustomerCreateOrderScreen.tsx`** (`EstimatePanel`): đổi UI theo mẫu Google Maps/Grab —
  - Route **recommended** hiển thị đầu danh sách, khung viền nổi bật + nhãn "Đề xuất".
  - Mỗi route: thời gian, khoảng cách, giá, **badge màu** theo `congestionLevel` (`low`→xanh lá, `moderate`→vàng, `heavy`→cam, `severe`→đỏ, `unknown`→xám "Không rõ traffic").
  - Chạm vào route khác → set làm `selectedRouteId`, cập nhật giá/nút xác nhận theo route đó.
  - Nút "Đặt xe"/xác nhận dùng `estimateToken` của `selectedRouteId`, không phải route đầu tiên mặc định.
  - Khi `vehicleType === 'TRUCK'`: hiện thêm ô nhập **cân nặng hàng (kg)** trước khi gọi estimate (field `cargoWeight` đã có sẵn trong form, chỉ cần nối vào request).
- **`CustomerCreateOrderRuntime.tsx`**: truyền `cargoWeightKg` vào request `/orders/estimate`; khi tạo đơn, gửi `estimateToken` của route đang chọn.
- Bản đồ (nếu đang render polyline, vd. `RouteMapSchematic.tsx`/`RealInteractiveMap.tsx`): route recommended vẽ nét đậm, route phụ vẽ nét nhạt hơn — đúng tinh thần "giống app bản đồ hiện có". *(Phạm vi vẽ polyline nhiều tuyến trên map thật cần xác nhận thêm nếu bản đồ hiện tại chưa hỗ trợ multi-polyline — xem rủi ro §8.)*

## 7. Testing

Theo TDD (RED → GREEN → REFACTOR):

1. `vietmap.provider.spec.ts`: request gửi đúng `alternative=true&annotations=congestion`; khi `vehicle=truck` có `capacity`; parse đúng nhiều `paths[]`; `deriveCongestionLevel` chọn đúng mức nặng nhất; path lỗi bị bỏ qua thay vì fail toàn bộ.
2. `demo-route-estimator.spec.ts`: trả mảng 1 phần tử, `congestionLevel: 'unknown'`.
3. `estimate-token.service.spec.ts`: token với `cargoWeightKg` khác nhau thì **không** verify chéo được; token của route không-recommended vẫn verify hợp lệ; **decode Token A phải trả đúng `routeId: 'route-0'` + `distanceM/durationS/estimatedPriceVnd` của chính Route A, khác với decode Token B (`routeId: 'route-1'`, số liệu khác)** — khẳng định mỗi token tự mang dữ liệu route của chính nó, không lẫn.
4. `maps.service.spec.ts` (mới hoặc mở rộng): recommended đúng route có `durationS` nhỏ nhất; giới hạn đúng 3 route (D6); mỗi route có token riêng, `routeId` riêng, và giá đúng theo `distanceM` của chính nó (không lẫn giữa các route).
5. `maps.controller` validation: thiếu `cargoWeightKg` khi `TRUCK` → 400 rõ ràng; `cargoWeightKg > VEHICLE_OPTIONS['TRUCK'].maxWeightKg` → 400 (test viết theo giá trị đọc từ config, không hard-code `3500` trong assertion để test không rời khỏi thực tế nếu config đổi).
6. `maps.e2e-spec.ts` + `openapi-contract.spec.ts`: cập nhật theo response shape `{ routes: [...] }`.
7. Mobile: cập nhật `adapter.test.ts`, `fixtures.test.ts`, `CustomerScreens.test.tsx` theo model mới; thêm test chọn route khác cập nhật `selectedRouteId` + giá hiển thị.

## 8. Rủi ro & điểm cần xác nhận trước khi code

| Rủi ro | Cách xử lý |
|---|---|
| Gói Vietmap hiện tại (trial, xem ảnh key vừa cấp) có giới hạn request/ngày — chưa rõ có tính phí thêm cho `alternative`/`annotations=congestion`/`capacity` hay không | Bạn xác nhận với Vietmap support trước khi bật ở production; code sẽ thêm các tham số này nhưng **không chặn nếu Vietmap không trả `annotations`** (fallback `congestionLevel: 'unknown'`) |
| `paths[]` Vietmap trả có thể ít hơn 3 (tuỳ tuyến đường thực tế, đôi khi chỉ có 1 tuyến khả thi) | Không phải lỗi — UI chỉ hiển thị số route thực tế nhận được, tối thiểu 1 |
| Vẽ nhiều polyline trên bản đồ mobile — cần xác nhận `RealInteractiveMap`/`RouteMapSchematic` hiện tại có hỗ trợ vẽ nhiều lớp polyline cùng lúc chưa | Nếu chưa hỗ trợ, có thể giảm scope: chỉ vẽ polyline route đang chọn trên map, danh sách route vẫn hiển thị dạng thẻ (không cần vẽ hết trên map cùng lúc) — **cần chốt với bạn trước khi viết plan implementation** |
| Đổi `OrderEstimateResponse` là breaking change với mọi consumer hiện tại | Đã liệt kê đủ các file cần sửa ở §6; không có consumer nào khác ngoài mobile + openapi/test đã biết |

## 9. Việc KHÔNG đổi

- Công thức `PricingService.quote()` (base + per-km + stop surcharge, sàn minimum fare) — giữ nguyên, không cộng toll.
- Flow tạo đơn (module `orders`) — không sửa file nào trong đó (theo D3).
- `DemoMapProvider`/`ResilientMapProvider` fallback behavior — giữ nguyên cơ chế fallback khi Vietmap lỗi, chỉ đổi shape dữ liệu đi qua.

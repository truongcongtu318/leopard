# Thiết kế integration provider

## Interfaces

```ts
interface MapProvider {
  search(query: string): Promise<PlaceCandidate[]>;
  geocode(placeId: string): Promise<GeoPoint>;
  route(input: RouteInput): Promise<RouteEstimate>;
}

interface OtpProvider {
  verify(idToken: string): Promise<VerifiedPhoneIdentity>;
}

interface StorageProvider {
  put(input: UploadInput): Promise<StoredObject>;
  createReadUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

interface PaymentProvider {
  createQr(input: PaymentRequest): Promise<PaymentQr>;
}
```

## Map và ETA

`VietmapProvider` được chọn khi `MAP_PROVIDER=vietmap` và credential hợp lệ. `DemoEtaProvider` được chọn khi `MAP_PROVIDER=demo`; staging chỉ fallback nếu `ALLOW_DEMO_PROVIDER=true`.

Demo route dùng khoảng cách Haversine giữa các chặng nhân hệ số đường bộ `1.25`. Duration bằng distance chia tốc độ cấu hình mặc định 30 km/h, cộng 5 phút cho mỗi stop. Kết quả làm tròn đến phút, không dùng random và luôn trả `source=DEMO`, `isEstimate=true`.

## OTP, storage và payment

- `FirebaseOtpProvider` xác minh ID token; `DemoOtpProvider` chỉ bật local/test.
- `LocalStorageProvider` chỉ dùng local; `S3StorageProvider` dùng staging/pilot.
- `PayOsProvider`/`VietQrProvider` tạo QR; `DemoPaymentProvider` tạo payload xác định và không xác nhận tiền về.

## Failure policy

- Timeout provider mặc định 5 giây; tối đa một retry cho request idempotent.
- Không retry upload hoặc create payment nếu chưa có idempotency key.
- Log provider, latency, outcome và requestId; không log token, secret hoặc nội dung file.

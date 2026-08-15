# Socket.IO events

Namespace: `/tracking`. Handshake: `auth: { token: <accessToken> }`.

Mọi ack dùng discriminated envelope ổn định:

```json
{"ok":true}
```

hoặc:

```json
{"ok":false,"error":{"code":"TRACKING_INVALID_POINT","message":"Tracking point is invalid"}}
```

## Client events

### `tracking:join-order`

Payload: `{"orderId":"uuid"}`. Ack thành công dùng `{"ok":true,"latestPoint":null}` hoặc `latestPoint` là persisted `TrackingPoint`. Actor phải là owner, assigned Driver, Fleet Owner có active membership cùng fleet với assigned Driver hoặc Admin.

### `tracking:leave-order`

Payload: `{"orderId":"uuid"}`. Ack `{"ok":true}` và thao tác leave luôn idempotent.

### `tracking:send-point`

```json
{
  "orderId":"uuid",
  "clientPointId":"uuid",
  "latitude":10.7769,
  "longitude":106.7009,
  "accuracyM":12,
  "capturedAt":"2026-07-11T08:00:00.000Z"
}
```

Chỉ assigned Driver và active order. Ack thành công trả `{"ok":true,"point":{...}}`; ack lỗi dùng `{ok:false,error:{code,message}}` và không disconnect socket.

## Server events

- `tracking:point-updated`: gồm `orderId` và `point` là persisted `TrackingPoint`.
- `order:status-updated`: gồm `orderId`, `previousStatus`, `currentStatus`.
- `session:error`: gồm `code`, `message`; client phải refresh qua REST rồi reconnect.

Mọi server event dùng flat envelope; payload nằm cùng cấp với metadata:

```json
{
  "eventId":"persisted-resource-id",
  "occurredAt":"2026-08-09T08:00:00.000Z",
  "orderId":"uuid",
  "point":{}
}
```

`eventId` là deterministic persisted point/status-history ID khi có. Client loại duplicate theo `eventId` và bỏ point cũ hơn marker hiện tại.

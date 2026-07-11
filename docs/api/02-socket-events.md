# Socket.IO events

Namespace: `/tracking`. Handshake: `auth: { token: <accessToken> }`.

## Client events

### `tracking:join-order`

Payload: `{"orderId":"uuid"}`. Ack thành công: `{"ok":true,"latestPoint":null}` hoặc latest point. Actor phải là owner, assigned Driver, Fleet Owner của assigned Driver hoặc Admin.

### `tracking:leave-order`

Payload: `{"orderId":"uuid"}`. Ack luôn idempotent.

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

Chỉ assigned Driver và active order. Ack trả persisted point hoặc error envelope rút gọn `{ok:false,error:{code,message}}`.

## Server events

- `tracking:point-updated`: persisted point cùng `orderId`.
- `order:status-updated`: `orderId`, previous status, current status, changedAt.
- `session:error`: token invalid/expired; client phải refresh qua REST rồi reconnect.

Event có `eventId` và `occurredAt`. Client loại duplicate theo `eventId` và bỏ point cũ hơn marker hiện tại.

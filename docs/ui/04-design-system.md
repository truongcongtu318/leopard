# Design system

## Foundations

- Font: `Inter`, fallback `system-ui`, base 16 px; không scale font theo viewport.
- Spacing: 4, 8, 12, 16, 24, 32 px.
- Radius: 6 px cho control/card; pill chỉ dành cho status badge.
- Border trung tính rõ; shadow nhẹ chỉ cho popover/modal.
- Content max-width: Customer/Driver 768 px; Admin 1440 px.

## Semantic colors

| Token | Dùng cho |
| --- | --- |
| `neutral` | Nền, border, text phụ |
| `brand` | Primary action và focus |
| `info` | `REQUESTED`, thông tin ETA |
| `warning` | `PICKING_UP`, `UNPAID`, cảnh báo |
| `active` | `ACCEPTED`, `IN_TRANSIT`, tracking |
| `success` | `DELIVERED`, `PAID_MANUAL` |
| `danger` | `CANCELLED`, destructive/error |

Màu phải đạt contrast WCAG AA; badge luôn có text.

## Components bắt buộc

- Button: primary, secondary, destructive, icon; height 40 px desktop và tối thiểu 44 px touch.
- Input/select/textarea/address search với label, hint và inline error ổn định.
- StatusBadge, OrderTimeline, RouteSummary, EtaIndicator và PaymentStatus.
- DataTable, Pagination, FilterBar và EmptyState cho Admin.
- Dialog cho xác nhận destructive; Toast cho kết quả không chặn; Alert cho lỗi cần chú ý.
- MapPanel có skeleton, fallback message và retry.

Component không được thay đổi kích thước khi loading; label dài phải wrap và không che nội dung khác.

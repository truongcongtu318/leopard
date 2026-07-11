# LEOPARD Multi-Agent Execution Guide

Bộ tài liệu này biến đặc tả SDLC của LEOPARD thành các task có thể chạy trong nhiều Codex session và git worktree độc lập.

## Bắt đầu

1. Đọc [design đã duyệt](./specs/2026-07-12-multi-agent-delivery-design.md).
2. Mở [master orchestration](./plans/00-master-orchestration.md) và chọn task có dependency `VERIFIED`.
3. Dùng [session prompt template](./prompts/session-prompt-template.md) để tạo prompt độc lập cho đúng một task.
4. Tạo worktree từ baseline SHA do Orchestrator công bố.
5. Sau review, dùng [wave integration prompt](./prompts/wave-integration-prompt.md) để tích hợp theo dependency.

## Bật multi-agent trong Codex

Codex cần cấu hình sau trong `~/.codex/config.toml`:

```toml
[features]
multi_agent = true
```

Khởi động lại Codex sau khi đổi cấu hình. Mỗi session phải nhận một task, một branch và một file ownership riêng; không dùng nhiều agent ghi chung worktree.

## Session theo wave

| Wave | Implementation sessions tối đa | Reviewer sessions | Ghi chú |
| --- | ---: | ---: | --- |
| 0 | 1 | 1 | Foundation tuần tự |
| 1 | 4 | 2 | Backend, Expo, Web, Platform |
| 2 | 5 | 2 | Auth, Order, Map và hai design-system lanes |
| 3 | 4 | 2 | Tracking, Media/Payment, Fleet, Admin |
| 4 | 4 | 2 | Một role journey mỗi worktree |
| 5 | 1–2 | 2 | Integration tuần tự; security review độc lập |

Giới hạn thực tế dựa trên file ownership. Nếu hai task cần cùng controlled surface, giảm concurrency và tạo contract task đi trước.

## Plan index

- [01 Foundation](./plans/01-foundation.md)
- [02 Backend Core](./plans/02-backend-core.md)
- [03 Expo Mobile Foundation](./plans/03-expo-mobile-foundation.md)
- [04 Operations Web Foundation](./plans/04-operations-web-foundation.md)
- [05 Auth and Access](./plans/05-auth-and-access.md)
- [06 Order and Driver](./plans/06-order-and-driver.md)
- [07 Map, Pricing and ETA](./plans/07-map-pricing-eta.md)
- [08 Realtime Tracking](./plans/08-realtime-tracking.md)
- [09 Media and Payment](./plans/09-media-and-payment.md)
- [10 Fleet Owner](./plans/10-fleet-owner.md)
- [11 Admin Operations](./plans/11-admin-operations.md)
- [12 Cross-Client Integration](./plans/12-cross-client-integration.md)
- [13 Quality, Security and Pilot Release](./plans/13-quality-security-pilot-release.md)

## Trạng thái chuẩn

`NOT_STARTED -> READY -> IN_PROGRESS -> IN_REVIEW -> INTEGRATED -> VERIFIED`

`BLOCKED` được dùng khi thiếu dependency hoặc cần đổi controlled contract. Agent phải gửi Blocker Report trong master plan và dừng chỉnh sửa surface đó.

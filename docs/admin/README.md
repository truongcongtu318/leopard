# LEOPARD Admin Web — Bộ tài liệu phát triển

> **Phạm vi:** `apps/admin` (package `web`) — dashboard vận hành cho vai trò `ADMIN` và `FLEET_OWNER`.
>
> **Mục tiêu:** Mở rộng Admin web từ 7 trang hiện tại thành mặt quản trị đầy đủ cho **toàn bộ hệ thống** LEOPARD, bám sát PRD và năng lực backend đã có.
>
> **Ngày lập:** 2026-09-15 · **Nhánh:** `feature/admin-web-dev` (tách từ `origin/develop`).

Tài liệu này **không thay thế** SRS, API contract, authorization hay business rule phía backend. Nó phân tích hiện trạng, chỉ ra khoảng trống và đề xuất lộ trình để `apps/admin` phủ hết nghiệp vụ vận hành.

## Mục lục

| # | Tài liệu | Nội dung |
|---|----------|----------|
| 01 | [01-system-analysis.md](./01-system-analysis.md) | Phân tích hiện trạng: kiến trúc admin, bản đồ năng lực backend ↔ trang admin đang khai thác |
| 02 | [02-gap-analysis.md](./02-gap-analysis.md) | Phân tích khoảng trống: các trang còn thiếu, phân loại theo mức độ sẵn sàng của backend |
| 03 | [03-roadmap.md](./03-roadmap.md) | Lộ trình theo Wave + danh sách task có ID, tiêu chí hoàn thành |
| 04 | [04-page-spec-template.md](./04-page-spec-template.md) | Template đặc tả một trang admin mới theo khuôn `port/adapter/model/runtime` |
| 05 | [05-implementation-plan.md](./05-implementation-plan.md) | **Plan thực thi toàn bộ**: các bước chạy được cho từng task (BE + shared + admin + test), bảng tiến độ |
| 06 | [06-ai-execution-prompt.md](./06-ai-execution-prompt.md) | **Prompt giao AI** thực hiện toàn bộ 23 task (tự-đủ, kèm ràng buộc & điểm chặn) |

## Nguyên tắc xuyên suốt

1. **Read-first, command có audit.** Mọi lệnh thay đổi trạng thái phải đi qua `executeAuditedCommand` với `reason` + `contextVersion` (chống xung đột), và ghi `Audit Rail` (actor–action–reason–requestId).
2. **UI tĩnh nhận dữ liệu qua port.** Không tự suy diễn lifecycle, không tự xác nhận payment, không quyết định quyền ở client — backend là nguồn sự thật.
3. **Nhãn bắt buộc.** ETA luôn ghi "ETA dự kiến"; dữ liệu mô phỏng luôn hiển thị "Dữ liệu mô phỏng".
4. **Giữ khuôn kiến trúc.** Mỗi trang mới: thêm capability vào `port.ts` → view model trong `model.ts` → `adapter.ts` gọi API → `fixtures.ts` cho preview → test. Xem [04-page-spec-template.md](./04-page-spec-template.md).
5. **Tuân thủ NexaFleet Modern Bento** (xem `docs/ui/10-admin-operations-system-design.md`) và WCAG 2.2 AA, keyboard-first, tiếng Việt.

## Tài liệu liên quan đã có

- `docs/ui/10-admin-operations-system-design.md` — presentation contract của admin (bento, audit rail).
- `docs/superpowers/plans/11-admin-operations.md` — plan triển khai admin operations gốc.
- `docs/superpowers/plans/2026-09-15-apple-2026-admin-redesign-plan.md` — redesign gần nhất.
- `CLAUDE.md` (root) — kiến trúc monorepo, invariants, lệnh dev/test.

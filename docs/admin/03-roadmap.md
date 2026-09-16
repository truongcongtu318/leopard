# 03 — Lộ trình & danh sách công việc

> Bám theo Feature Implementation Workflow: Research → Plan → TDD → Code Review → Commit. Mỗi task có tiêu chí hoàn thành (DoD) và test đi kèm (mục tiêu coverage ≥ 80%).

## Thứ tự Wave

| Wave | Chủ đề | Lý do ưu tiên |
|------|--------|---------------|
| **W1** | Tài chính & minh bạch + Audit | Giá trị vận hành cao, phần lớn backend đã có; củng cố tuân thủ |
| **W2** | Tăng trưởng & xử lý sự cố | PRD-critical, cần thêm backend (promotions, reports, dispatch) |
| **W3** | Vận hành nâng cao & bổ trợ | Hoàn thiện (broadcast, pricing, live-map, settings, support) |

## Wave 1 — Tài chính, Payouts, Audit

| Task ID | Việc | Phụ thuộc | DoD |
|---------|------|-----------|-----|
| `ADM-W1-T01` | ADR đối chiếu **withdrawals vs payouts**; chốt hợp nhất/tách | — | ADR trong `docs/architecture/adr`, quyết định rõ ràng |
| `ADM-W1-T02` | Backend `GET admin/payments` (list + lọc) | T01 | Endpoint + spec test, `@RequireRoles('ADMIN')` |
| `ADM-W1-T03` | Trang `/admin/payments` (port→model→adapter→fixtures→test) | T02 | Danh sách + xác nhận thủ công qua `CONFIRM_MANUAL_PAYMENT`; preview + unit test |
| `ADM-W1-T04` | Backend `GET admin/invoices` (list) | — | Endpoint + test |
| `ADM-W1-T05` | Trang `/admin/invoices` (list, download, gửi lại) | T04 | Cảnh báo thiếu email; preview + test |
| `ADM-W1-T06` | Trang `/admin/payouts` (nếu tách khỏi withdrawals) | T01 | approve/reject idempotent (`clientRequestId`) + audit |
| `ADM-W1-T07` | Backend `GET admin/audit` (list + lọc) | — | Endpoint + test |
| `ADM-W1-T08` | Trang `/admin/audit` (tái dùng `AdminAuditEntryView`) | T07 | Tra cứu actor/action/thời gian; preview + test |

## Wave 2 — Promotions, Reports/khiếu nại, Dispatch, Reviews

| Task ID | Việc | Phụ thuộc | DoD |
|---------|------|-----------|-----|
| `ADM-W2-T01` | Backend CRUD `admin/promotions` (+ migration nếu cần) | — | GET/POST/PATCH + test; bật/tắt có audit |
| `ADM-W2-T02` | Trang `/admin/promotions` (list + form tạo/sửa) | T01 | Validate hiệu lực/giới hạn; preview + test |
| `ADM-W2-T03` | Backend `GET admin/reports` + command xử lý/đóng | — | Endpoint + command audit + test |
| `ADM-W2-T04` | Trang `/admin/reports` (hàng đợi khiếu nại) | T03 | Gán trạng thái, liên kết đơn; preview + test |
| `ADM-W2-T05` | Backend `GET admin/reviews` (+ command ẩn nếu cần) | — | Endpoint + test |
| `ADM-W2-T06` | Trang `/admin/reviews` (lọc điểm thấp) | T05 | preview + test |
| `ADM-W2-T07` | Backend phơi trạng thái dispatch + command gán thủ công | — | Controller mới + test |
| `ADM-W2-T08` | Trang `/admin/dispatch` (monitor + gán thủ công) | T07 | Hàng đợi + gán; realtime; preview + test |

## Wave 3 — Broadcast, Pricing, Live-map, Settings, Support

| Task ID | Việc | Phụ thuộc | DoD |
|---------|------|-----------|-----|
| `ADM-W3-T01` | Backend `POST admin/notifications/broadcast` | — | Chọn nhóm đối tượng + test |
| `ADM-W3-T02` | Trang `/admin/notifications` (soạn + **xác nhận trước khi gửi**) | T01 | Lịch sử gửi; preview + test |
| `ADM-W3-T03` | Backend cấu hình giá `GET/PUT admin/pricing` | — | Lưu cấu hình + audit + test |
| `ADM-W3-T04` | Trang `/admin/pricing` | T03 | Bảng giá theo loại xe; preview + test |
| `ADM-W3-T05` | Trang `/admin/live-map` (full-page) | — | Realtime; nhãn "ETA dự kiến"; preview |
| `ADM-W3-T06` | Trang `/admin/settings` (trạng thái provider, cờ demo) | — | Hiển thị nhãn "Dữ liệu mô phỏng" |
| `ADM-W3-T07` | Trang `/admin/support` (chat) | — | preview + test |

## Definition of Done chung cho mỗi trang

- [ ] Thêm capability vào `port.ts`; view model trong `model.ts` (immutable, `Readonly`).
- [ ] `adapter.ts`/`runtime.ts` gọi API + ánh xạ; xử lý lỗi/empty/loading rõ ràng.
- [ ] `fixtures.ts` + scenario preview (`dev:preview`).
- [ ] Thêm mục nav (`RoleNavigation` + icon) và route guard.
- [ ] Unit test (Jest + Testing Library) cho model/adapter/screen; coverage ≥ 80%.
- [ ] Lệnh thay đổi trạng thái: đi qua `executeAuditedCommand`, có `reason`, `contextVersion`, ghi Audit Rail.
- [ ] `pnpm --filter web typecheck` + `lint` + `test` xanh.
- [ ] Tuân thủ WCAG AA, keyboard-first, tiếng Việt, NexaFleet Modern Bento.

## Lệnh làm việc nhanh

```bash
pnpm --filter web dev:preview
```
```bash
pnpm --filter web typecheck && pnpm --filter web lint && pnpm --filter web test
```

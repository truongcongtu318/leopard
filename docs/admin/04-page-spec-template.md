# 04 — Template đặc tả trang Admin mới

> Sao chép mục "## Đặc tả trang: …" bên dưới cho mỗi trang mới. Khuôn này bám đúng kiến trúc `apps/admin/src/features/admin` (Ports & Adapters) đang dùng.

## Checklist triển khai (theo thứ tự)

1. **`model.ts`** — định nghĩa view model `Readonly` cho trang (danh sách, item, filters, boundary/notice). Tái dùng type có sẵn (`AdminListView`, `AdminAuditEntryView`, …) khi phù hợp.
2. **`port.ts`** — thêm capability mới vào `AdminPort` và `ADMIN_OPERATIONS_CAPABILITIES` (ví dụ `readInvoices`). Lệnh mới: bổ sung `AdminCommandKind`.
3. **`adapter.ts` / `runtime.ts`** — cài đặt capability: gọi endpoint qua client (`src/lib/api`), ánh xạ response → view model; xử lý lỗi bằng `AdminBoundaryView`.
4. **`fixtures.ts` + `src/preview/scenario.ts`** — dữ liệu mô phỏng cho `dev:preview` (nhớ nhãn "Dữ liệu mô phỏng").
5. **Route** — `src/app/(admin)/admin/<slug>/page.tsx` (Server Component nạp dữ liệu qua port) + màn hình trong `features/admin`.
6. **Nav** — thêm `NavItem` và icon trong `components/shell/RoleNavigation.tsx`; cập nhật route guard nếu cần.
7. **Test** — `*.test.tsx`/`*.test.ts` cho model/adapter/screen; mock port; coverage ≥ 80%.
8. **Verify** — `typecheck` + `lint` + `test`; kiểm tra bằng preview.

## Đặc tả trang: `<Tên trang>`

### Meta
- **Route:** `/admin/<slug>`
- **Vai trò:** `ADMIN` (và/hoặc `FLEET_OWNER` nếu áp dụng)
- **Nhóm/Wave:** `<A/B/C/D>` — `<ADM-Wx-Tyy>`
- **Mức công sức:** `<S/M/L>`

### Mục tiêu người dùng
> Admin cần trả lời câu hỏi gì / ra quyết định gì trên trang này?

### Dữ liệu hiển thị (đọc)
| Trường | Nguồn (endpoint) | Ghi chú/nhãn |
|--------|------------------|--------------|
| … | `GET admin/…` | ETA → "ETA dự kiến"; demo → "Dữ liệu mô phỏng" |

### Bộ lọc & phân trang
- Lọc: `<trạng thái / thời gian / vai trò / …>`
- Sắp xếp: `<updated-desc / …>`
- Phân trang: `pageSize ∈ {20, 50, 100}`

### Lệnh (nếu có thay đổi trạng thái)
| Lệnh (`AdminCommandKind`) | Đối tượng | `reason` bắt buộc? | Hậu quả / irreversible? | Idempotency |
|---------------------------|-----------|--------------------|-------------------------|-------------|
| `<COMMAND_KIND>` | `<targetId>` | có/không | … | `clientRequestId` |

- Mọi lệnh đi qua `executeAuditedCommand(input)` với `contextVersion` (chống xung đột → trả `state: 'conflict'`).
- Ghi **Audit Rail**: actor–action–reason–requestId.
- Hành động outward-facing (gửi email/thông báo, publish) **phải xác nhận trước khi thực thi**.

### Trạng thái biên (boundary)
- `loading` · `error` · `no-results` · `permission-denied` · `session-expired` — dùng `AdminBoundaryView` / `AdminNoticeView`.

### Backend cần bổ sung (nếu có)
- `<Endpoint mới>` — method, query params, response shape, `@RequireRoles('ADMIN')`, transaction, audit.

### Test tối thiểu
- [ ] Model: ánh xạ đúng, xử lý empty/lỗi.
- [ ] Adapter: gọi đúng endpoint, map response, boundary khi lỗi.
- [ ] Screen: render danh sách, filter, lệnh (mock port); trạng thái biên.
- [ ] (Lệnh) xung đột `contextVersion` hiển thị đúng.

### DoD
Xem "Definition of Done chung" trong [03-roadmap.md](./03-roadmap.md).

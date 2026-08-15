# W4-DS00-DOCS — Core Design Audit Handoff

> **Owner:** ECC Design System Owner
>
> **Date:** 2026-08-15
>
> **Baseline:** `198bd42`
>
> **Status:** `DOCS_COMPLETE — READY_FOR_ROLE_SPECS`
>
> **Full W4-DS00:** runtime parity/preview evidence còn pending

## Outcome

Card tài liệu đã:

- Mở rộng `docs/ui/04-design-system.md` thành LEOPARD Core contract mà không thay đổi
  SRS, acceptance criteria, API hoặc backend ownership.
- Khóa direction `operational clarity`: guided Customer, action-first Driver,
  compact/scannable Fleet Owner và dense/filter-first Admin.
- Định nghĩa ba tầng Core → Platform → Role, `Route Spine`, canonical status mapping,
  token vocabulary, typography/density/focus/motion và system-state vocabulary.
- Tạo reusable scorecard tại `docs/ui/11-ui-quality-scorecard.md`: mỗi role cần
  `>=85/100`, không category dưới `8/10`, accessibility/AI-slop gate pass và không
  blocker.
- Ghi dark mode là `N/A` cho pilot và chặn partial implementation.
- Không sửa runtime code, tests, package/lockfile, API hoặc role docs 07–10.

`DOCS_COMPLETE` cho phép W4-DS01..DS04 bắt đầu role specification sau khi Integration
Owner xác nhận ownership lock W4-S00. Nó không đồng nghĩa `STATIC_GATE_PASSED` và
không đánh dấu PH-12 verified.

## Skill evidence

| Skill                       | Evidence đã tạo                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `design-system`             | Audit 10 dimensions, token/component inventory, current-interface research, before score và AI-slop gate trong core doc/scorecard     |
| `frontend-design-direction` | Purpose, audience, tone, role density, first-scan priority, `Route Spine` memorable detail và constraints                             |
| `frontend-a11y`             | Semantic form/control rules, keyboard/focus/dialog requirements, live-region/reduced-motion rules và blocking accessibility checklist |

## Baseline audit evidence

Audit dùng source đã commit tại `198bd42`, không dùng uncommitted work của lane khác.
Dark mode là N/A nên score định lượng là `48/90`, tương đương `53/100` khi chuẩn hóa
chín dimension có điểm.

| Dimension             | Before score | Evidence chính                                                                                                                                                                                                                                                                                                                         |
| --------------------- | -----------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Color consistency     |         6/10 | Core palette đã parity ở `apps/mobile/src/theme/tokens.ts:41` và `packages/ui/src/tokens.css:3`; raw hex còn ở `apps/admin/src/components/shell/OperationsShell.tsx:112` và `apps/admin/src/features/auth/LoginForm.tsx:123`; status mapping lệch giữa `packages/ui/src/StatusBadge.tsx:6` và `apps/mobile/src/ui/StatusBadge.tsx:14`. |
| Typography hierarchy  |         6/10 | Mobile có semantic scale tại `apps/mobile/src/theme/tokens.ts:20`; web mới có font family tại `packages/ui/src/tokens.css:48`; role page dùng inline heading tại `apps/admin/src/app/(admin)/admin/page.tsx:10`.                                                                                                                       |
| Spacing rhythm        |         7/10 | Scale 4/8/12/16/24/32 đã đồng bộ tại `apps/mobile/src/theme/tokens.ts:1` và `packages/ui/src/tokens.css:36`; app composition vẫn có inline/arbitrary values.                                                                                                                                                                           |
| Component consistency |         5/10 | Mobile ScreenState có permission/offline tại `apps/mobile/src/ui/ScreenState.tsx:7`, web chỉ có bốn state tại `packages/ui/src/ScreenState.tsx:6`; badge web dùng control radius tại `packages/ui/src/StatusBadge.tsx:41`.                                                                                                             |
| Responsive behavior   |         5/10 | Shell có 1024 px switch tại `apps/admin/src/components/shell/OperationsShell.tsx:295`; Customer/Fleet role pages còn placeholder tại `apps/mobile/app/(customer)/orders/index.tsx:3` và `apps/admin/src/app/(fleet)/fleet/page.tsx:7`.                                                                                                 |
| Dark mode             |          N/A | Pilot không có dark-mode requirement; core contract cấm partial dark styles.                                                                                                                                                                                                                                                           |
| Animation             |         5/10 | Spin/pulse/transition có tại `packages/ui/src/Button.tsx:64`, `packages/ui/src/DataTable.tsx:22`, `packages/ui/src/ScreenState.tsx:14`; chưa có reduced-motion contract trong runtime.                                                                                                                                                 |
| Accessibility         |         6/10 | Mobile label/error foundation tốt tại `apps/mobile/src/ui/FormField.tsx:22`; drawer có trap/restore tại `apps/admin/src/components/shell/OperationsShell.tsx:30`; sortable `th` chỉ click tại `packages/ui/src/DataTable.tsx:50`, FilterBar dùng `aria-label` thay visible label tại `packages/ui/src/FilterBar.tsx:88`.               |
| Information density   |         4/10 | Fleet/Admin pages tại `apps/admin/src/app/(fleet)/fleet/page.tsx:7` và `apps/admin/src/app/(admin)/admin/page.tsx:7` chưa có operational content để chứng minh scan hierarchy.                                                                                                                                                         |
| Polish                |         4/10 | Mobile có stable field error/ETA copy tại `apps/mobile/src/ui/FormField.tsx:37` và `apps/mobile/src/ui/EtaIndicator.tsx:26`; web map/state còn placeholder/generic English tại `packages/ui/src/MapPanel.tsx:11` và `packages/ui/src/ScreenState.tsx:59`.                                                                              |

### Factual findings cần xử lý trước static gate

1. **P0 semantic drift:** `REQUESTED`, `ACCEPTED`, `IN_TRANSIT`, `UNPAID`,
   `PAID_MANUAL` và User `ACTIVE` không có mapping nhất quán giữa mobile/web.
2. **P1 token bypass:** Operations shell/login/page dùng inline raw colors/type/spacing
   thay vì platform tokens.
3. **P1 state parity:** Web ScreenState thiếu permission-denied/offline và chưa biểu
   diễn stale/reconnecting/conflict khi journey cần.
4. **P1 accessibility:** sortable table header không keyboard-operable; visible filter
   labels, reduced-motion và full live-region evidence chưa có.
5. **P1 readiness:** role screens đang là placeholder nên responsive, density, long
   copy và complete state coverage chưa được chứng minh.

## Core decisions handed to role owners

- Một semantic palette dùng chung; platform khác implementation nhưng không khác ý
  nghĩa.
- Canonical status semantics/nhãn tiếng Việt nằm ở core contract; adapter/view model
  map enum theo domain.
- Typography mở rộng với `bodyCompact`, `sectionTitle`, `pageTitle`; runtime parity là
  foundation task, role lane không tự khai báo lại.
- `Route Spine` có `route-full`, `route-compact`, `status-spine`; Admin có `audit-rail`
  tách khỏi physical route.
- System state gồm loading, empty/no-results, error, success, permission-denied,
  offline, stale, reconnecting, session-expired và conflict khi áp dụng.
- Motion chỉ truyền đạt state, có reduced-motion fallback; dark mode giữ N/A.
- Static gate dùng 10-category scorecard, accessibility gate và AI-slop gate; điểm cao
  không bù blocker.

## Secondary interface research

### Quan sát nguồn chính thức

- [Onfleet Map & Sidebar](https://support.onfleet.com/hc/en-us/articles/360023669612-Map-Sidebar):
  map + sidebar là hai vùng chính; selection ở sidebar ảnh hưởng map focus.
- [Samsara Fleet Overview Map](https://kb.samsara.com/hc/en-us/articles/41266933936269-Monitor-Your-Fleet-on-the-Fleet-Overview-Map):
  search/filter cập nhật asset list và live map, detail/action mở theo entity.
- [Motive Fleet View 2.0](https://helpcenter.gomotive.com/hc/en-us/articles/36088175670685-Fleet-View-2-0):
  smart clustering, synced list/map, saved viewport và configurable asset cards.

### Suy luận, không phải requirement nguồn ngoài

- Fleet/Admin giữ list/filter/map selection đồng bộ và không mất context khi inspect.
- Dense map cần clustering/summary strategy, last-updated timestamp và in-context
  detail.
- Chỉ lưu view preference nếu không che scope/status/exception bắt buộc.

Không chuyển giao palette, branding, telematics depth, paid feature hoặc workflow nằm
ngoài LEOPARD pilot.

## Runtime follow-up để hoàn tất full W4-DS00

Các mục này cố ý không thực hiện trong card docs do ownership restriction:

- Thêm parity tests cho semantic colors, canonical status mapping, spacing/radius,
  typography và state vocabulary.
- Bổ sung platform token cho type/motion/focus còn thiếu; thay app-level raw semantic
  values theo từng scoped implementation card.
- Đồng bộ web ScreenState/StatusBadge contracts và sửa keyboard semantics của
  DataTable/FilterBar.
- Tạo local component/state preview catalogue shell có production fixture guard và
  banner dữ liệu mô phỏng.
- Chạy contrast, reduced-motion và viewport evidence trên implementation thật.

Role spec có thể bắt đầu; role screen implementation chỉ bắt đầu sau khi core/platform
foundation owner công bố parity/preview evidence tương ứng.

## Risks

| Risk                                                      | Impact                                | Mitigation / owner                                                                 |
| --------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| Role lane copy raw token trước khi parity foundation xong | Drift quay lại và khó merge           | DS01..DS04 chỉ viết spec; foundation owner cung cấp platform API trước screen code |
| Global status map trộn enum cùng tên                      | Sai semantic User/Order/Driver        | View model map theo domain; parity test từng enum group                            |
| Fixture quyết định lifecycle/permission                   | UI tĩnh tạo business behavior sai     | Adapter chỉ map scenario do coordinator khóa; backend vẫn là authority             |
| Dense web dùng card/KPI giả để lấp placeholder            | AI-slop, giảm khả năng quét           | Scorecard category 8/10 + AI-slop gate bắt buộc                                    |
| Reduced motion/a11y để cuối lane                          | Rework component composition          | Role spec phải ghi interaction/focus/live-region trước implementation              |
| Một lane thêm partial dark style                          | Contrast/state parity không kiểm soát | Source scan ở mỗi review; automatic blocker                                        |
| Wave 3 sửa client path trùng lane                         | Conflict và contract drift            | Integration Owner kiểm tra ownership/diff trước khi mở implementation branch       |

## Next actions W4-DS01..DS04

### W4-DS01 — Customer mobile system design

- Tạo `docs/ui/07-customer-mobile-system-design.md` từ core contract.
- Khóa guided create-order anatomy và `route-full` cho 0–3 stops.
- Chứng minh long address/cargo copy, keyboard + sticky safe area, estimate/demo label,
  payment/tracking/cancel states ở 360/390 px.
- Role spec phải map đủ mười scorecard category và không để design decision quan
  trọng chưa có owner trước khi code screen.

### W4-DS02 — Driver mobile system design

- Tạo `docs/ui/08-driver-mobile-system-design.md` với action-first/outdoor direction.
- Khóa current status, exactly-one next action, active-trip rail, tracking health và
  proof readiness.
- Bao phủ offline/permission, stale/reconnect, upload retry và accept-race conflict;
  kiểm tra one-handed reach, Dynamic Type và screen-reader announcements.

### W4-DS03 — Fleet Owner operations system design

- Tạo `docs/ui/09-fleet-owner-system-design.md` với read-only/exception-first density.
- Fleet-scope marker luôn hiện; không có mutation affordance.
- Định nghĩa table desktop, reduced columns tablet, row-detail dưới 768 px và
  list/filter/map synchronized selection.
- Bao phủ stale last-known location, no-results, map fallback và foreign-resource
  permission denial.

### W4-DS04 — Admin operations system design

- Tạo `docs/ui/10-admin-operations-system-design.md` với dense/filter-first direction.
- Khóa investigation hierarchy, canonical status, `audit-rail` và command dialog có
  reason/note, irreversible warning, pending/error/success, focus restore.
- Bao phủ long identifiers, health/readiness warning, failed command, keyboard-only
  journey, live-region feedback và reduced motion.

## Acceptance checklist

- [x] Core contract giữ product source-of-truth và backend authority.
- [x] Purpose, audience, operational direction, platform layers và Route Spine được
      ghi rõ.
- [x] Token/type/density/focus/motion/state/anti-pattern contracts được ghi rõ.
- [x] Factual 10-dimension baseline có exact file references và scores.
- [x] Dark mode ghi N/A; partial implementation là blocker.
- [x] Reusable role scorecard yêu cầu `>=85/100`, không category dưới `8/10`.
- [x] Accessibility và AI-slop gates có blocking checklist.
- [x] Ba current-interface references là nguồn phụ; facts và inference tách riêng.
- [x] Next action cho W4-DS01..DS04 và runtime follow-up được bàn giao.
- [x] Không sửa file ngoài ownership của W4-DS00-DOCS.

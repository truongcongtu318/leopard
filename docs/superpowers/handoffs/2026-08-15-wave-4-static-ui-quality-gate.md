# Wave 4 Static UI Quality Gate Handoff

- **Ngày review:** 2026-08-16 (Asia/Ho_Chi_Minh)
- **Branch:** `codex/integration-wave-4-ui`
- **Implementation base:** `d4b9db9`
- **Milestone:** `STATIC_UI_IMPLEMENTED · LOCAL_INTEGRATION_READY`
- **Product phase:** PH-12 vẫn `IN_PROGRESS`
- **Independent reviewer:** Gauss (`01a004a1-73f2-78f0-b078-d74d24989693`)
- **Scorecard contract:** `docs/ui/11-ui-quality-scorecard.md`

## 1. Kết luận và ranh giới

Presentation tĩnh cho Customer, Driver, Fleet Owner và Admin đã có đủ route, state,
feature-local immutable view model/port, fixture xác định và preview guard. Tuy nhiên,
runtime visual review ngày 2026-08-15 xác nhận art direction, hierarchy và responsive
density chưa đạt quality bar đã thống nhất. Vì vậy evidence bên dưới là baseline của
vòng đầu, **không phải** gate pass; scorecard phải được chấm lại sau visual remediation.

Các vấn đề đã xác nhận gồm mobile còn text-heavy/wireframe, web dùng quá nhiều surface
đồng dạng, map/media fallback chưa có đủ cấu trúc thị giác và Fleet table tại `768 px`
ép status badge vào cột không đọc được. Independent review cũng mở lại một P1 về detail
route ID binding và hai P2 về preview navigation cùng dialog ở text zoom `200%`.

Milestone này **không** chứng minh API, Socket.IO, upload, GPS, VietQR/payOS,
persistence sau refresh hoặc cross-client journey đã hoạt động. W4-I01..W4-I05 và
PH-12 chỉ được đóng sau handoff Wave 3, real adapter integration và release E2E.

## 2. Phạm vi implementation đã review

| Role        | Routes                                                                                            | Static contract chính                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Customer    | `/customer/orders`, `/customer/orders/new`, `/customer/orders/:id`                                | Guided create/list/detail, 0–3 stops, estimate/ETA provenance, tracking/payment/media/cancel states    |
| Driver      | `/driver/orders`, `/driver/orders/:id`                                                            | Availability, active trip, public requested orders, exactly-one next task, proof/tracking states       |
| Fleet Owner | `/fleet`, `/fleet/drivers`, `/fleet/orders`, `/fleet/orders/:id`                                  | Fleet scope visible, filters/pagination, read-only detail, no lifecycle/payment/admin mutation surface |
| Admin       | `/admin`, `/admin/orders`, `/admin/orders/:id`, `/admin/users`, `/admin/fleets`, `/admin/drivers` | Filter-first operations, investigation + Audit Rail, capability-driven privileged command dialogs      |

Runtime QA phát hiện và sửa một route defect trước khi chốt gate: Expo Router loại
segment trong ngoặc khỏi URL, nên `(customer)` và `(driver)` không thể tạo hai prefix
hiển thị mong muốn. Commit `d4b9db9` chuyển sang `app/customer/**` và
`app/driver/**`, đồng bộ role redirects và test; browser sau sửa không còn
`Unmatched Route`.

## 3. Verification tự động

| Gate                  | Kết quả                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| Mobile unit/component | `23` suites, `219` tests pass                                                                                   |
| Web unit/component    | `26` suites, `246` tests pass                                                                                   |
| Shared UI             | `7` suites, `147` tests pass                                                                                    |
| Shared config         | `5` tests pass                                                                                                  |
| Typecheck             | Mobile, Web và `@leopard/ui` pass                                                                               |
| Lint                  | Mobile, Web, `@leopard/ui` và `@leopard/config` pass                                                            |
| Build/export          | `pnpm --filter web build` và `pnpm --filter mobile export` pass                                                 |
| Browser E2E           | `7/7` Playwright tests pass: login, Admin/Fleet matrices, drawer focus, investigation privacy, Fleet ID click-through và Admin detail ở text zoom `200%` |
| Diff hygiene          | `git diff --check` pass; không sửa root dependency, lockfile, API, Prisma, OpenAPI hoặc shared backend contract |

Local dùng Node `26.7.0` trong khi repository khai báo Node `>=24 <25`, nên các lệnh
có engine warning. Không lệnh verification nào thất bại vì warning này; CI Node 24
vẫn là môi trường chuẩn.

## 4. Coverage theo package sau remediation

| Package           | Statements | Branches | Functions |  Lines | Gate |
| ----------------- | ---------: | -------: | --------: | -----: | ---- |
| Mobile            |     92.95% |   85.10% |    94.49% | 94.61% | PASS |
| Web               |     91.59% |   82.86% |    97.35% | 93.52% | PASS |
| `@leopard/ui`     |     95.97% |   89.23% |    98.50% | 96.87% | PASS |

Mọi lane vượt ngưỡng `80%` ở cả bốn metric tổng hợp; không hạ threshold hiện có.

## 5. Runtime viewport và interaction evidence

- Customer/Driver: `5` route compositions × `360×800` và `390×844` = `10/10`.
  Mọi composition trả HTTP `200`, có preview banner, không horizontal overflow,
  không console/HTTP error và không `Unmatched Route`; interactive target nhỏ nhất
  `44 px`, Driver primary target `48 px`.
- Fleet Owner: `4` routes × năm viewport `360×800`, `390×844`, `768×1024`,
  `1024×768`, `1440×900`; Playwright xác nhận scope marker, table/row-detail switch,
  map tối thiểu `280 px`, không mutation button và không HTTP error.
- Admin: `7` compositions × cùng năm viewport = `35/35`; Playwright xác nhận một
  `h1`, table priority columns, responsive rows, map tối thiểu `280 px`, Audit Rail
  8/4 từ `1024 px`, dialog nằm trong viewport và không HTTP error.
- Keyboard/focus: drawer có initial focus, `Escape` an toàn và restore trigger;
  CommandDialog có focus trap/restore, pending lock và field error tests.
- Text zoom: Admin investigation tại `390×844` với root text size `200%` vẫn hiện
  page title, preview banner, Audit Rail và không horizontal overflow.

Ảnh chụp session-local được tạo dưới `/tmp/leopard-wave4-*.png`, gồm Customer, Driver,
Fleet Owner, Fleet order `002` và Admin. Assertions có thể tái lập bằng
`pnpm --filter web test:e2e`; ảnh tạm không được commit vào repository.

## 6. Contrast và token consistency

Mobile và Web dùng cùng semantic values trong `apps/mobile/src/theme/tokens.ts` và
`packages/ui/src/tokens.css`. WCAG contrast calculation trên các cặp foreground /
background đang render:

| Pair                       |     Ratio |
| -------------------------- | --------: |
| Neutral text / background  | `16.45:1` |
| Neutral muted / background |  `7.56:1` |
| Brand text / background    |  `7.56:1` |
| Brand soft                 |  `8.24:1` |
| Info                       |  `6.59:1` |
| Warning                    |  `8.15:1` |
| Active                     |  `8.49:1` |
| Success                    |  `8.30:1` |
| Danger                     |  `8.20:1` |

Status luôn có text/domain label; màu không phải tín hiệu duy nhất.

## 7. Implementation scorecard vòng đầu — INVALIDATED

|   # | Category                | Customer | Driver | Fleet Owner |  Admin | Evidence chính                                                                   |
| --: | ----------------------- | -------: | -----: | ----------: | -----: | -------------------------------------------------------------------------------- |
|   1 | Color consistency       |        9 |      9 |           9 |      9 | Token parity, canonical StatusBadge và contrast table mục 6                      |
|   2 | Typography hierarchy    |        9 |      9 |           9 |      9 | Heading tree/RN roles, long Vietnamese copy và một page title                    |
|   3 | Spacing rhythm          |        9 |      9 |           9 |      9 | Core 4/8/12/16/24/32 scale, divider-first density, không nested cards            |
|   4 | Component consistency   |        9 |      9 |           9 |      9 | Shared/mobile primitive tests, stable pending/disabled/error variants            |
|   5 | Responsive behavior     |        9 |      9 |          10 |     10 | Runtime matrix, table→row-detail, no overflow, map/dialog constraints            |
|   6 | Motion & reduced motion |        8 |      8 |           8 |      8 | Reduced-motion tests; không animation trang trí hoặc continuous fake tracking    |
|   7 | Accessibility           |        8 |      8 |           9 |     10 | RN semantic tree, 44/48 targets, labels/live regions, keyboard/focus + 200% zoom |
|   8 | Information density     |        9 |     10 |          10 |     10 | Guided Customer, action-first Driver, exception-first Fleet, filter-first Admin  |
|   9 | State completeness      |       10 |     10 |          10 |     10 | Deterministic fixture catalogues + permission privacy and conflict tests         |
|  10 | Polish & AI-slop        |        9 |      9 |           9 |      9 | Visual review, Vietnamese copy, purposeful map/media fallback, source scan       |
|     | **Total**               |   **89** | **90** |      **92** | **93** | Threshold `>=85`; lowest category của mọi role là `8`                            |

Các điểm trên đã bị invalidated bởi runtime visual review. Không dùng bảng này để claim
`STATIC_GATE_PASSED`; vòng remediation phải thu lại screenshot, chấm lại độc lập và
không tiêu chí nào được tự xác nhận chỉ từ test structure.

## 8. Accessibility, AI-slop và privacy gates

### Accessibility gate — cần chạy lại sau remediation

- Native/semantic heading, form, table, link, button, dialog và status roles có test.
- Visible labels, required/error association, busy/disabled state và live region có
  test ở mobile/shared UI/Admin screens.
- Dialog/drawer keyboard lifecycle, focus trap/restore và safe `Escape` có test.
- Touch target `44 px`, Driver primary `48 px`, long copy wrapping, map text
  alternative, text zoom và permission privacy boundary đều có evidence.
- VoiceOver/TalkBack trên thiết bị thật vẫn là release-device walkthrough ở W4-I05;
  static gate dùng RN accessibility-tree assertions và browser keyboard journey.

### AI-slop và no-partial-dark — PASS theo source/runtime inspection

Source review và ảnh runtime mới không thấy purple gradient, glassmorphism, decorative
hero, card lồng card, partial dark mode hoặc map/media placeholder rỗng. Runtime đã có
operations-ledger hierarchy, role-specific density và route schematic có text fallback.
Dark mode tiếp tục là `N/A` cho pilot. Motion/device walkthrough và full scorecard vẫn
chưa được tự động nâng thành PASS chỉ từ static browser evidence.

### Security/privacy boundary — remediation bắt buộc trước gate

- Không hardcoded secret, raw phone/email, provider credential hoặc production PII.
  Fixture dùng UUID/name/address có nhãn “Mô Phỏng” và masked contact.
- Denied/expired fixtures scrub private descendants; tests xác nhận private content
  không mount trước hoặc sau boundary.
- Fleet port chỉ có read/subscription capability; mutation labels được kiểm tra là
  không render. Admin chỉ render command từ `availableCommands`; static callback
  không mutate fixture và persisted success cần audit receipt.
- URL adapters dùng UUID/date/enum allow-list; raw free-text search không được
  serialize vào URL.
- E2E auth server chỉ bind `127.0.0.1`, chỉ phục vụ `/api/v1/me`, dùng token QA không
  phải credential và luôn đóng ở teardown.

Independent reviewers Dalton và Schrodinger xác nhận P1 route identity đã được sửa:
Fleet detail truyền `orderId`, bind đúng fixture theo ID và fail closed với foreign UUID.
Preview context được giữ qua order list, driver list và dashboard; helper URL cũng xử lý
đúng query/hash hiện có. Hai mobile route-identity tests đã được đưa vào commit scope.
Formal scorecard vẫn ghi `INC` cho motion/device walkthrough và một số accessibility/state
evidence vì đây là điều kiện review độc lập bổ sung, không phải lỗi runtime đã biết.

## 9. Dependency audit debt kế thừa

`pnpm audit --prod` trả `21` advisory transitive: `12 high`, `8 moderate`, `1 low`,
không có critical. Wave 4 không sửa package manifest hoặc `pnpm-lock.yaml`; phần lớn
đường dẫn nằm trong Expo/Jest CLI và Prisma tooling. Đây không phải regression của
static UI diff, nhưng vẫn là release security debt và phải có dependency-remediation
task riêng trước production release. Gate này không tuyên bố repository audit sạch.

## 10. Wave 3 handoff còn bắt buộc

- W4-I01: map DTO/event/error/pagination contract thật vào các UI ports.
- W4-I02: nối Customer/Driver query, command, cache/invalidation và 409 refresh.
- W4-I03: nối Socket.IO, GPS sender, media/proof upload và payment refresh.
- W4-I04: nối Fleet/Admin server-side filters, scope authorization và audited commands.
- W4-I05: chạy persistence/reconnect/cross-client E2E, Maestro/device accessibility và
  repository release gate.

Chỉ sau W4-I05 mới được đổi PH-12 sang `VERIFIED`.

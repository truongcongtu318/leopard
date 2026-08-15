# Wave 4 Static UI Agent Board

- **Updated:** 2026-08-15 (Asia/Ho_Chi_Minh)
- **Integration branch:** `codex/integration-wave-4-ui`
- **Published baseline:** `198bd42` (`origin/develop`)
- **Source plan:** `docs/superpowers/plans/2026-08-15-wave-4-static-ui-parallel-plan.md`

## Control rules

- Agent chính là Integration Owner và là owner duy nhất của merge, conflict resolution và push.
- Mỗi card có write scope riêng; agent không sửa file ngoài ownership và không revert thay đổi của agent khác.
- Code card dùng TDD: test chạy RED vì behavior thiếu, implementation tối thiểu chạy GREEN, sau đó typecheck/lint và diff review.
- Design card phải có evidence theo skill, không chỉ nêu tên skill.
- Fixture chỉ bật trong local/test preview; production phải fail closed.
- Không sửa API, Prisma, OpenAPI, `packages/shared`, root config/lockfile hoặc client paths thuộc Wave 3.

## Agent Kanban

| Card                     | Owner                                               | State         | Write scope                                                    | Acceptance                                                                                                          | Merge gate                                                                                                                                                        |
| ------------------------ | --------------------------------------------------- | ------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| W4-GIT-00 Publish plan   | Integration Owner                                   | `MERGED`      | Wave 4 plan only                                               | Plan commit có đúng một file                                                                                        | Commit `198bd42`, pre-push lint/typecheck/test/build xanh                                                                                                         |
| W4-S00-MOBILE            | Dalton → Socrates/Franklin review                   | `DONE`        | `apps/mobile/src/preview/**`                                   | Trusted build binding, lazy guarded selection, immutable fixtures, preview banner and composition root              | RED `1871412`, `15d1b13`, `1a15cc8`; GREEN `b171790`, `85f3b33`, `b8e329e`; 120 full tests/export; final guard review no findings                                 |
| W4-S00-WEB               | Harvey → Kierkegaard/Franklin review                | `DONE`        | `apps/admin/src/preview/**`, shared-theme entrypoint           | Trusted runtime binding, lazy guarded selection, immutable fixtures, accessible preview banner and composition root | RED `6702298`, `ee9d53c`, `275fe85`, `6395dc8`, `1a15cc8`; GREEN `6a5f9da`, `1dbe9a9`, `1d7c789`, `b8e329e`; 107 full tests/build; final guard review no findings |
| W4-DS00-DOCS             | Erdos → Ohm review                                  | `DONE`        | Core design doc, scorecard, dedicated audit handoff            | Factual 10-category audit, complete domain statuses, stable sources, accessibility/AI-slop gates                    | Docs commits `b3d8e59`, `94eced4`, `06c7801`; reviewer P1/P2 remediated                                                                                           |
| W4-DS00-PARITY           | Integration Owner                                   | `DONE`        | `packages/ui/src/StatusBadge.tsx`, `tokens.css`, focused tests | Web status semantics and badge radius map to the approved core/mobile vocabulary                                    | RED `82b822a`, `2f32d8c`; GREEN `af84c8b`, `ce94cc1`; 59 tests and 100% focused coverage                                                                          |
| W4-DS00-PARITY-REVIEW    | Darwin (`01a0037a-49cd-74d1-8506-37089018e01d`)     | `DONE`        | Read-only review through `ce94cc1`                             | Correctness, parity, accessibility, security and regression review                                                  | No findings after remediation; 59 tests/typecheck/lint independently pass                                                                                         |
| W4-DS00-WEB-STATE        | Lorentz (`01a00391-748e-7b20-a7df-3167cbbad561`)    | `DONE`        | `ScreenState.tsx` + dedicated/legacy tests                     | State parity, Vietnamese copy, privacy, live regions, reduced motion                                                | RED test co-committed in `1d7c789`; GREEN `bdc66b5`; 93 full tests, focused coverage 96% lines/100% branches/functions                                            |
| W4-DS00-WEB-A11Y         | Galileo (`01a00391-7451-7e90-b819-5063027f10c4`)    | `DONE`        | `DataTable.tsx`, `FilterBar.tsx`, owned test sections          | Keyboard sort, visible labels, domain-scoped status options, reduced motion                                         | RED `2445920`; GREEN `7f0c519`; 20 focused tests, typecheck/lint pass, changed-file coverage >=85% branches                                                       |
| W4-DS01 Customer         | Kant → Helmholtz review                             | `DONE`        | `docs/ui/07-customer-mobile-system-design.md`                  | Customer direction and state catalogue approved                                                                     | Independent review: no P0/P1/P2; runtime score/evidence pending                                                                                                   |
| W4-DS02 Driver           | Raman → Halley review                               | `DONE`        | `docs/ui/08-driver-mobile-system-design.md`                    | Driver direction and state catalogue approved                                                                       | Independent review: no P0/P1/P2; server-offered command remains integration gate                                                                                  |
| W4-DS03 Fleet            | Plato → Newton review                               | `DONE`        | `docs/ui/09-fleet-owner-system-design.md`                      | Fleet direction and state catalogue approved                                                                        | Independent review: no P0/P1/P2; read-only/privacy contract approved                                                                                              |
| W4-DS04 Admin            | Hume → Pauli review                                 | `DONE`        | `docs/ui/10-admin-operations-system-design.md`                 | Admin direction and state catalogue approved                                                                        | One P2 for F-11/US-15 log ownership remediated and confirmed resolved                                                                                             |
| W4-S01 Mobile foundation | Archimedes (`01a003b5-075d-7390-af7f-a67f8c593f28`) | `RUNNING`     | `apps/mobile/src/ui/**`, mobile theme tokens                   | Shared mobile components/state/status parity                                                                        | TDD, >=80% changed-file coverage, test/typecheck/lint/export                                                                                                      |
| W4-S04 Web foundation    | Wegener (`01a003b7-5893-7001-8a0f-7c0879247ae5`)    | `RUNNING`     | `packages/ui/src/**`, operations shell                         | Shared operations components/dialog/map/status/shell                                                                | TDD, >=80% changed-file coverage, UI/web test/typecheck/lint/build                                                                                                |
| W4-FOUNDATION-REVIEW     | Jason (`01a003b3-b44c-7763-aa96-88eafd64f755`)      | `REMEDIATING` | Read-only review                                               | Core foundation regression review                                                                                   | P1 conflict context + P2 FilterBar stale debounce assigned to W4-S04                                                                                              |

## Wave 3 overlap check

- `origin/develop` tại lúc mở board là `198bd42`.
- Không có remote branch Wave 3 mới chứa thay đổi trong `apps/mobile/**`, `apps/admin/**` hoặc `packages/ui/**` tại thời điểm kiểm tra.
- Remote branch `origin/codex/add-fleet-owner-lite-scope` chỉ có commit tài liệu cũ và không sửa client implementation paths.
- Nếu thành viên Wave 3 có branch chưa push, ownership lock trong source plan vẫn là điều kiện bắt buộc trước integration.

## Merge sequence

1. Review và tích hợp W4-S00-MOBILE, W4-S00-WEB, W4-DS00-DOCS theo từng commit/patch riêng.
2. Chạy token parity card và full W4-S00/DS00 gate.
3. Công bố core-design SHA.
4. Mở W4-DS01..DS04 song song trên bốn write scopes tách biệt. `DONE`.
5. Chỉ mở mobile/web foundation sau khi role specs tương ứng được duyệt. `RUNNING`.

## Evidence log

- Plan publish: ECC pre-push chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; tất cả pass trước khi `198bd42` được push vào `develop`.
- W4-DS00-PARITY: vòng đầu xác nhận 5 mismatch; reviewer tìm thêm `ACTIVE`, `AVAILABLE`, `BUSY` và pill-radius gap. Sau hai vòng RED/GREEN có 59/59 test pass, 100% statements/branches/functions/lines cho `StatusBadge.tsx`, `@leopard/ui` typecheck và lint pass. Mobile mapping đã đúng sẵn nên không cần sửa.
- W4-S00 composition roots: `b8e329e` buộc preview-enabled luôn render banner cùng injected fixture, còn guard đóng chỉ render runtime path; web 107/107 và mobile 120/120 test pass, cả hai typecheck/lint pass.
- W4-DS00 web foundation: `7f0c519` loại raw-status map toàn cục khỏi FilterBar và thêm native sortable headers; `bdc66b5` mở rộng ScreenState lên 11 state, giữ context cho offline/stale/reconnecting và không mount private children khi permission-denied. Full `@leopard/ui` 93/93 test pass.
- W4-DS01..DS04: bốn role system-design documents đã qua independent review. Customer, Driver và Fleet không có finding; Admin có một P2 vì phần structured log của F-11/US-15 chưa có owner/surface, đã được sửa thành backend/observability handoff và reviewer xác nhận resolved.
- Foundation review sau checkpoint tìm thấy `conflict` chưa giữ snapshot (P1) và FilterBar debounce có thể phát filters cũ (P2); cả hai đã được đưa vào regression scope của W4-S04 trước role implementation.
- Node runtime local là 26.x trong khi project khai báo Node 24.x; đây là warning môi trường, không phải gate failure. CI Node 24 vẫn là nguồn xác nhận chính.

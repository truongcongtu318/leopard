# Continuation Prompt — Tách Driver thành App Standalone (SDD execution)

> Ngày tạo: 2026-09-10. Dùng prompt này để tiếp tục thực thi liền mạch ở phiên mới. Đọc hết trước khi chạm code.

---

## 0. Nhiệm vụ một câu

Tách trải nghiệm tài xế khỏi app gộp `apps/mobile` thành app Expo độc lập `apps/driver`, dùng chung backend + hệ tài khoản (identity model A), bỏ role-based routing ở client, thay bằng guard "chỉ tài xế" tại login. Đang thực thi theo quy trình **superpowers:subagent-driven-development**.

## 1. Quyết định đã chốt với người dùng (ràng buộc, không tự đổi)

- **Phạm vi:** "App riêng, chung tài khoản" — identity model A. 1 SĐT = 1 vai trò (`User.role` enum đơn, `User.phone @unique`). KHÔNG đa vai trò.
- **Cách dùng chung code:** "Hoist lên `packages/mobile-core`" (phương án sạch) — cả `apps/mobile` và `apps/driver` cùng consume 1 package React Native chung.
- **Thời điểm:** "Làm ngay, chấp nhận rủi ro" — nhưng **giữ `apps/mobile` gộp làm bản demo dự phòng** xuyên suốt; chỉ gỡ nhánh driver khỏi nó ở Phase 4 (Task 13), sau khi app driver đã verify.
- **Backend = 0 thay đổi.** Không đụng `apps/api`, Prisma schema, migration. (Ràng buộc Điều 4.3 hợp đồng: không đổi CSDL/kiến trúc sát ngày bảo vệ; deadline Final MVP 15/09/2026.)
- **Không import chéo** giữa feature customer và feature driver (hiện đang sạch — giữ nguyên).

## 2. Tài liệu & vị trí quan trọng

- **Plan chi tiết (14 task):** `docs/superpowers/plans/2026-09-09-split-driver-standalone-app.md` — nguồn yêu cầu chính, có code/lệnh verbatim cho từng task.
- **Ledger tiến độ (SDD):** `.superpowers/sdd/2026-09-09-split-driver-standalone-app/progress.md` — bản đồ hồi phục; tin ledger + `git log` hơn trí nhớ.
- **Brief từng task:** `.superpowers/sdd/2026-09-09-split-driver-standalone-app/task-<N>-brief.md` (T2,T3,T4 đã tạo). Tạo brief mới bằng script bên dưới.
- **Report implementer:** `.superpowers/sdd/.../task-<N>-report.md`.
- **Scripts SDD:** `C:/Users/ADMIN/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/subagent-driven-development/scripts/` — `task-brief PLAN N`, `review-package PLAN BASE HEAD`, `sdd-workspace PLAN`.
- **Mốc dự phòng:** git tag `demo-fallback-combined-app` @ `dcbe24b` (app gộp đầy đủ, chạy được — quay về nếu tách hỏng).
- **Nhánh làm việc:** `feature/mobile-ui-refactor` (in-place, KHÔNG worktree riêng).

## 3. Quy trình thực thi (SDD) & lưu ý môi trường

- Mỗi task: tạo brief → dispatch **1 implementer subagent** (`general-purpose`) → nhận report → tạo review-package → dispatch **1 reviewer subagent** → nếu có finding Critical/Important thì fix-loop (tối đa 5 vòng) → ghi ledger `Task N: complete (...)`.
- **Lưu ý model (quan trọng):** Agent tool ở môi trường này **404 khi set `model` = haiku/sonnet** (map sang backend không tồn tại). → **Dispatch subagent KHÔNG truyền tham số `model`** (kế thừa model phiên, đang chạy tốt). Đừng cố set model.
- Không chạy 2 implementer song song. Controller (bạn) không tự sửa code — luôn qua implementer để giữ context sạch + được review.
- Verify chuẩn mỗi task đụng mobile: `pnpm --filter mobile typecheck` (phải exit 0) + `pnpm --filter mobile test` (phải xanh). **Baseline đã xác nhận xanh:** typecheck exit 0, test 635/635 pass (67 suites).
- Lệnh chạy từ root: `pnpm --filter mobile <script>`, `pnpm --filter driver <script>`, `pnpm --filter @leopard/mobile-core <script>`.

## 4. Rulings đã ghi (áp dụng tiếp)

1. **In-place trên `feature/mobile-ui-refactor`**, không worktree (không phải main; scope không đè 21 file admin dở; tránh reinstall node_modules).
2. **Subagent không set model** (xem mục 3).
3. **T5 + T6 gộp làm 1 dispatch** — vì `api/http-client` + `socket-client` import `auth/session-store`; package không được phụ thuộc app, nên move api + shared-auth cùng lúc.
4. **T9 dùng COPY (không move)** feature driver sang app driver, để `apps/mobile` vẫn xanh; bản driver trong mobile chỉ xóa ở T13.
5. Task scaffold verbatim tí hon (như T2) có thể controller-verify; task substantive luôn có reviewer đầy đủ.

## 5. Tiến độ đã hoàn thành ✅

| Task | Nội dung | Commit | Trạng thái |
|---|---|---|---|
| T1 | Tag fallback + baseline | tag @ dcbe24b | ✅ baseline xanh (typecheck 0, test 635/635) |
| T2 | Scaffold `packages/mobile-core` rỗng | `adfbab9` | ✅ controller-verified |
| T3 | Move `theme/` + `media/` vào package, sửa 77 import, +alias tsconfig | `c0c36c4` | ✅ reviewer Approved; typecheck PASS, 635/635 |

HEAD hiện tại: **`c0c36c4`**.

Minor deferred (chưa chặn): `apps/mobile/package.json` chưa khai báo `@leopard/mobile-core` là `workspace:*` dep (đối xứng `@leopard/shared`) — **sẽ được T7 thêm**.

## 6. TASK ĐANG LÀM DỞ — T4 (move `ui/`) ⚠️ CHƯA COMMIT, CHƯA VERIFY

Có thay đổi Task 4 **nằm sẵn trong working tree, chưa commit** (do dispatch trước đó bị ngắt giữa chừng). **Phải đánh giá và hoàn tất trước khi làm tiếp.** Trạng thái quan sát được (đọc `git status` để xác nhận lại):

Đã làm:
- `apps/mobile/src/ui/**` đã `git mv` sang `packages/mobile-core/src/ui/**` (git nhận diện rename — lịch sử giữ).
- `packages/mobile-core/src/index.ts` đã thêm `export * from './ui/<...>'` cho **tất cả** component + `./ui/icons/CoreIcons`.
- `packages/mobile-core/package.json` đã thêm peerDeps `expo-router`, `react-native-qrcode-svg` và devDep `@types/react`.
- Thư mục `packages/mobile-core/assets/brand/` (4 ảnh: brand_login, leopard-emblem, leopard-wordmark, order-boxes-3d) — **untracked**, chưa `git add`.
- 72 file trong `apps/mobile` đã trỏ `@leopard/mobile-core`.

**CÒN THIẾU / phải kiểm & sửa để hoàn tất T4:**
1. **Còn 1 import cũ sót:** `apps/mobile/src/features/customer/orders/CustomerOrderDetailScreen.tsx` vẫn còn `from '../..(/)ui/...'`. Phải đổi sang `@leopard/mobile-core`. (Chạy `grep -rEn "from '(\.\./)+ui/" apps/mobile/src apps/mobile/app` để tìm hết — kỳ vọng 0 sau khi sửa.)
2. **Kiểm import nội bộ trong `packages/mobile-core/src/ui/**`:** phải là đường dẫn TƯƠNG ĐỐI trong package (`../theme/tokens`, `../media/...`), **tuyệt đối không** `@leopard/mobile-core` (tránh self-import/require cycle). Kiểm: `grep -rn "@leopard/mobile-core" packages/mobile-core/src` → kỳ vọng 0.
3. **Assets:** xác định ui component nào tham chiếu `assets/brand/*` (vì sao 4 ảnh này bị copy vào package). Nếu ui cần → `git add packages/mobile-core/assets` và đảm bảo đường dẫn require/import ảnh trong ui trỏ đúng vị trí mới. Nếu không cần → bỏ. (Lưu ý: brand assets gốc nằm ở `apps/mobile/assets/brand/` — cân nhắc để asset ở app, hoặc chuyển hẳn; quyết định nhất quán và ghi ledger.)
4. **Kiểm jest.mock stale:** tìm `jest.mock('..(/)ui/...')` còn trỏ path cũ; sửa thành mock barrel `{ ...jest.requireActual('@leopard/mobile-core'), <symbol>: jest.fn() }`, giữ nguyên assertion.
5. **Kiểm export name collision:** vì dùng `export *` cho ~24 file ui, nếu 2 file export trùng tên symbol sẽ nhập nhằng — `pnpm --filter @leopard/mobile-core typecheck` sẽ báo; nếu có, đổi sang named re-export.
6. **Verify:** `pnpm --filter mobile typecheck` (phải PASS) + `pnpm --filter mobile test` (phải xanh, so với 635/635). Ghi rõ pass/fail; nếu fail, phân biệt pre-existing vs mới.
7. **Commit** đúng scope (chỉ `packages/mobile-core` + `apps/mobile`): `refactor(mobile-core): move UI design system into shared package`.
8. Sau commit → tạo review-package `review-package PLAN <BASE=c0c36c4> <HEAD mới>` → dispatch reviewer → xử lý finding → ghi ledger `Task 4: complete (...)`.

> Cách tiếp cận đề xuất cho phiên mới: KHÔNG vứt bỏ working tree. Dispatch 1 implementer với chỉ thị "hoàn tất Task 4 từ trạng thái dở trong working tree" kèm 8 điểm trên + brief `task-4-brief.md`. Nếu muốn nền sạch hơn, có thể `git stash` rồi để implementer làm lại từ đầu theo brief — nhưng tận dụng phần đã làm nhanh hơn.

## 7. Các task còn lại (sau khi T4 xanh)

Thứ tự dispatch: **T5+6 (gộp) → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14.**

- **T5+T6 (GỘP 1 dispatch):** Move `api/` (api-error, http-client, query-client, socket-client) + `auth/` shared (AuthHeroHeader, LoginScreen, OtpSixCellInput, firebase, firebase-auth, phone, secure-session-storage, session-store + các unit test của chúng) vào `packages/mobile-core`. **Giữ lại trong `apps/mobile/src/auth`** các route-test: `login-route.test.tsx`, `customer-address-route.test.tsx`, `customer-register-route.test.tsx`. Thêm `packages/mobile-core/jest.config.cjs` (preset `jest-expo`) + devDeps test cho package (`jest`, `jest-expo`, `@jest/globals`, `@testing-library/react-native`, `react-test-renderer`). Import nội bộ trong package = tương đối. Verify cả `@leopard/mobile-core test` lẫn `mobile typecheck+test`. Commit: `refactor(mobile-core): move api + shared auth into package`.
- **T7:** `apps/mobile/metro.config.js` (monorepo: `watchFolders=[workspaceRoot]`, `nodeModulesPaths`, `disableHierarchicalLookup=true`) + thêm `@leopard/mobile-core: workspace:*` vào `apps/mobile/package.json` deps (đóng luôn Minor của T3). Verify `pnpm --filter mobile export` (bundle web) không lỗi resolve. Commit: `chore(mobile): add metro monorepo config...`.
- **T8:** Scaffold `apps/driver` (Expo app mới): package.json (name `driver`, dep `@leopard/mobile-core`), app.json (name "LEOPARD Driver", bundle `com.leopard.driver`, scheme `leoparddriver`, slug `leopard-driver`, plugin expo-router/image-picker/location), tsconfig (2 alias: `@leopard/shared` + `@leopard/mobile-core`), babel.config.js + metro.config.js (copy từ mobile), `app/_layout.tsx` (providers) + `app/index.tsx` tạm + `+not-found.tsx`, copy assets brand. Verify `pnpm --filter driver typecheck && export`. Commit.
- **T9:** **COPY** (không move) `apps/mobile/src/features/driver/*` → `apps/driver/src/features/*` và `navigation/Driver{DrawerContext,MenuButton,SidebarDrawer}` → `apps/driver/src/navigation/`; đổi import shared sang `@leopard/mobile-core`. `apps/mobile` giữ nguyên (vẫn xanh). Verify mobile + driver typecheck.
- **T10:** Tạo route driver: nâng `app/driver/*` → root `app/*` của driver app (orders, chat, earnings, history, kyc, performance, profile, profile-edit, settings, wallet); thêm `app/(public)/login.tsx` + `app/(public)/driver-register.tsx`; `_layout.tsx` bọc `DriverDrawerProvider`; `index.tsx` splash→redirect. Chuyển `driver-register-route.test.tsx` sang app driver. Verify driver typecheck+test; mobile vẫn xanh.
- **T11:** Verify driver boot thật: `pnpm --filter driver export` (+ start thủ công nếu có thiết bị), khởi động vào `/(public)/login`.
- **T12 (TDD — hành vi mới):** `apps/driver/src/navigation/driver-session.ts` với `resolveDriverLogin({isAuthenticated, role})` → `{kind:'enter'|'not-a-driver'|'unauthenticated'}` + test. Nối vào login (`onLoginSuccess`: role DRIVER→`/orders`; khác→hiện "Tài khoản chưa phải tài xế" + nút Đăng ký tài xế + Đăng xuất) và index redirect. Đây là phần "chỉnh authen cho chuẩn" người dùng nhấn mạnh.
- **T13 (Phase 4 — CỔNG DỪNG):** Chỉ làm khi T11+T12 xanh. Gỡ `app/driver/*`, `src/features/driver`, `navigation/Driver*` khỏi `apps/mobile`; rút gọn `role-router.ts` (bỏ nhánh driver: DRIVER→`/(public)/login`) + sửa test; sửa link `/driver/*`. Verify mobile typecheck+test+export. **Nếu sát bảo vệ mà chưa yên tâm → DỪNG cuối T12: đã có app driver riêng chạy được, mobile vẫn là bản gộp demo.**
- **T14:** Cập nhật README + `docs/development/01-local-setup.md` (thêm app driver, bundle id, lệnh chạy).

Sau T14: final whole-branch review (`review-package PLAN <merge-base main HEAD> HEAD` → reviewer model mạnh nhất) → nếu sạch, xóa workspace SDD, dùng superpowers:finishing-a-development-branch.

## 8. "Chỉnh authen cho chuẩn" — ghi chú người dùng nhấn mạnh

Điểm cốt lõi về auth (model A): backend GIỮ NGUYÊN role trên token; app driver không dùng role-routing kiểu cũ mà **kiểm role ngay tại login** (T12). Tài khoản không phải DRIVER đăng nhập vào app driver → chặn có thông báo rõ + CTA đăng ký tài xế (`/driver/apply` đã tồn tại, nâng CUSTOMER→DRIVER). Tùy chọn defense-in-depth (KHÔNG bắt buộc, chỉ làm nếu người dùng yêu cầu, và phải giữ "không đổi backend"): cho `/auth/firebase` nhận `expectedRole` để backend trả 403 sớm — cân nhắc sau, không nằm trong 14 task.

## 9. Lệnh verify nhanh (copy dùng)

```bash
cd /d/leopard
git status --short                     # xem trạng thái T4 dở
grep -rEn "from '(\./|(\.\./)+)ui/" apps/mobile/src apps/mobile/app   # phải rỗng sau khi sửa T4
grep -rn "@leopard/mobile-core" packages/mobile-core/src             # phải rỗng (không self-import)
pnpm --filter @leopard/mobile-core typecheck
pnpm --filter mobile typecheck
pnpm --filter mobile test
```

Baseline tham chiếu: mobile typecheck exit 0, test **635/635 pass (67 suites)**.

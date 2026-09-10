# Continuation Prompt v2 — Tách Driver thành App Standalone (SDD)

> Ngày: 2026-09-10. Prompt này thay thế v1 (`2026-09-10-split-driver-standalone-continuation-prompt.md`) về phần tiến độ. Đọc hết trước khi chạm code. Dùng cho phiên mới tiếp tục liền mạch.

---

## 0. Nhiệm vụ một câu
Tách trải nghiệm tài xế khỏi app gộp `apps/mobile` thành app Expo độc lập `apps/driver`, dùng chung backend + hệ tài khoản (identity model A), bỏ role-routing ở client, thay bằng guard "chỉ tài xế" tại login. Đang thực thi theo quy trình **superpowers:subagent-driven-development**.

## 1. Quyết định đã chốt (ràng buộc, không tự đổi)
- **Identity model A:** 1 SĐT = 1 vai trò (`User.role` enum đơn, `User.phone @unique`). KHÔNG đa vai trò.
- **Hoist lên `packages/mobile-core`** (phương án sạch): cả `apps/mobile` và `apps/driver` cùng consume 1 package RN chung.
- **Làm ngay nhưng giữ `apps/mobile` gộp làm demo dự phòng**; chỉ gỡ nhánh driver khỏi nó ở T13, sau khi app driver verify xong.
- **Backend = 0 thay đổi** (không đụng `apps/api`, Prisma, migration). Deadline Final MVP 15/09/2026.
- **Không import chéo** feature customer ↔ driver.

## 2. Tài liệu & vị trí
- Plan 14 task: `docs/superpowers/plans/2026-09-09-split-driver-standalone-app.md` (nguồn yêu cầu chính).
- Ledger SDD: `.superpowers/sdd/2026-09-09-split-driver-standalone-app/progress.md` (tin ledger + `git log` hơn trí nhớ).
- Briefs: `.superpowers/sdd/.../task-<N>-brief.md` (T2–T6 đã tạo). Reports: `.../task-<N>-report.md`.
- Scripts SDD: `C:/Users/ADMIN/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/subagent-driven-development/scripts/` → `task-brief PLAN N`, `review-package PLAN BASE HEAD`, `sdd-workspace PLAN`.
- Mốc dự phòng: git tag `demo-fallback-combined-app` @ `dcbe24b`.
- Nhánh: `feature/mobile-ui-refactor` (in-place, KHÔNG worktree).

## 3. Quy trình & lưu ý môi trường
- Mỗi task: brief → dispatch 1 implementer (`general-purpose`) → report → `review-package` → dispatch reviewer → fix-loop nếu có Critical/Important → ghi ledger `Task N: complete`.
- **MODEL:** Agent tool ở máy này **404 khi set `model`** (haiku/sonnet map sai backend). → **Dispatch subagent KHÔNG truyền `model`** (kế thừa model phiên). Đừng set model.
- Không chạy 2 implementer song song. Controller không tự sửa code (qua implementer để được review).
- Verify chuẩn: `pnpm --filter mobile typecheck`+`test`, `pnpm --filter @leopard/mobile-core typecheck`+`test`, (app driver sau này) `pnpm --filter driver ...`.
- **Baseline xanh đã xác nhận:** mobile typecheck exit 0; mobile test 571/571; mobile-core test 74/74.

## 4. Rulings đang áp dụng
1. In-place trên `feature/mobile-ui-refactor`, không worktree.
2. Dispatch subagent KHÔNG set model.
3. **T5+T6 gộp** (api import auth → move cùng lúc).
4. **T9 dùng COPY (không move)** feature driver sang app driver; bản trong mobile chỉ xóa ở T13.
5. Task scaffold verbatim tí hon → controller-verify; task substantive → reviewer đầy đủ.
6. **MediaImage** (ui) import `../api/http-client` nên KHÔNG move được ở T4; đã fold vào T5+6 (sau khi api vào package). (Lỗ hổng plan do review loop phát hiện.)

## 5. ĐÃ HOÀN THÀNH & ĐÃ COMMIT ✅ (HEAD = `c5665b7`)
| Task | Nội dung | Commit(s) |
|---|---|---|
| T1 | Tag fallback + baseline xanh | tag @ dcbe24b |
| T2 | Scaffold `packages/mobile-core` | `adfbab9` |
| T3 | Move `theme/` + `media/`, 77 import, +alias tsconfig | `c0c36c4` (reviewer ✅) |
| T4 | Move toàn bộ `ui/` (22 comp), 72 import, +jest config/devdeps | `cbb99df`, `c5665b7` (reviewer APPROVED_WITH_NOTES) |

Minor deferred: T4 note — `ErrorScreen` phụ thuộc `expo-router`, `PaymentSummary` phụ thuộc `react-native-qrcode-svg` (đã khai peerDeps; chấp nhận cho pilot). T3 minor (mobile thiếu `@leopard/mobile-core` dep) → **T7 sẽ thêm**.

## 6. ĐANG DỞ — T5+6 (+MediaImage): NẰM TRONG WORKING TREE, CHƯA COMMIT, CHƯA VERIFY ⚠️
Người dùng đã áp các thao tác move vào working tree rồi tạm dừng để bàn giao. Chạy `git status` để xác nhận. Trạng thái quan sát (trên nền HEAD `c5665b7`):
- ✅ `api/` (5 file: api-error, http-client, http-client.test, query-client, socket-client) đã move → `packages/mobile-core/src/api/` (staged renames). `apps/mobile/src/api/` **đã rỗng**.
- ✅ shared `auth/` (12 file: AuthHeroHeader, LoginScreen, LoginScreen.test, OtpSixCellInput, expo-secure-store.d.ts, firebase, firebase-auth, phone, phone.test, secure-session-storage, session-store, session-store.test) đã move → `packages/mobile-core/src/auth/`. `apps/mobile/src/auth/` **chỉ còn 4 route test** (login-route, customer-address-route, customer-register-route, driver-register-route — đều MODIFIED, giữ đúng; driver-register-route sẽ move ở T10).
- ✅ `MediaImage.tsx` + test đã move → `packages/mobile-core/src/ui/`. `apps/mobile/src/ui/` **đã rỗng**.
- `packages/mobile-core/src/index.ts` (barrel) + `package.json` MODIFIED (staged). Thêm asset `packages/mobile-core/assets/brand/auth-truck-background.jpg` (staged).
- ⚠️ **Sửa lẻ CHƯA rõ chủ đích (unstaged), phải kiểm trước khi commit:** `packages/mobile-core/src/theme/tokens.ts`, `packages/mobile-core/src/ui/FloatingNavBar.tsx` — xác nhận có thuộc về task này không; nếu lạc thì tách ra.

### Việc PHẢI làm để đóng T5+6 (theo thứ tự):
1. **Kiểm package thuần:** `grep -rn "@leopard/mobile-core" packages/mobile-core/src` → kỳ vọng RỖNG (không self-import). `grep -rn "from '.*apps/mobile" packages/mobile-core/src` và tìm mọi import trong package trỏ ngược về app → kỳ vọng RỖNG (package KHÔNG được phụ thuộc app). Các import nội bộ phải tương đối (`../auth/session-store`, `../api/http-client`, `../theme/tokens`, …).
2. **Kiểm leftover import ở app:** `grep -rEn "from '(\./|(\.\./)+)(api|auth)/'" apps/mobile/src apps/mobile/app` → chỉ còn (nếu có) import feature nội bộ của 4 route test; mọi `api/*` và auth-shared phải là `@leopard/mobile-core`.
3. **Kiểm barrel đủ export:** index.ts phải export api (api-error, http-client, query-client, socket-client), auth dùng bởi app (session-store, firebase-auth, phone, LoginScreen, AuthHeroHeader, OtpSixCellInput, secureSessionStorage…), và MediaImage. Nếu `export *` va chạm tên → đổi named re-export.
4. **Kiểm jest.mock stale** trong 4 route test + test đã move: path cũ `'../api/..'`/`'../auth/..'` → mock barrel `{ ...jest.requireActual('@leopard/mobile-core'), <symbol>: jest.fn() }`, giữ assertion.
5. **Làm rõ 2 sửa lẻ** (theme/tokens.ts, FloatingNavBar.tsx): nếu cần cho task thì giữ, nếu lạc thì tách.
6. **4 cổng verify phải xanh:** `pnpm --filter @leopard/mobile-core typecheck`, `pnpm --filter @leopard/mobile-core test`, `pnpm --filter mobile typecheck`, `pnpm --filter mobile test`. So baseline (mobile 571/571, core 74/74 — core sẽ tăng vì nhận thêm test api/auth). Fail → phân biệt pre-existing vs mới.
7. **Commit scoped** (chỉ path split; KHÔNG add file lạc: `apps/mobile/src/features/home/*`, `apps/admin/*`, các untracked `.agent*`, ảnh, v.v.): ví dụ `refactor(mobile-core): move api + shared auth into package` (+ `refactor(mobile-core): move MediaImage into shared package (finish ui hoist)` nếu tách).
8. Sau commit → `review-package PLAN c5665b7 <HEAD mới>` → dispatch reviewer → xử lý finding → ghi ledger `Task 5+6: complete`.

## 7. CÁC TASK CÒN LẠI (sau T5+6)
Thứ tự: **T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14.**
- **T7:** `apps/mobile/metro.config.js` (monorepo: `watchFolders=[workspaceRoot]`, `nodeModulesPaths`, `disableHierarchicalLookup=true`) + thêm `@leopard/mobile-core: workspace:*` vào `apps/mobile/package.json` deps (đóng Minor T3). Verify `pnpm --filter mobile export` không lỗi resolve.
- **T8:** Scaffold `apps/driver` (Expo): package.json (name `driver`, dep `@leopard/mobile-core`), app.json (name "LEOPARD Driver", bundle `com.leopard.driver`, scheme `leoparddriver`, slug `leopard-driver`, plugins expo-router/image-picker/location), tsconfig (alias `@leopard/shared` + `@leopard/mobile-core`), babel/metro copy từ mobile, `app/_layout.tsx`+`app/index.tsx` tạm+`+not-found.tsx`, copy assets brand. Verify `pnpm --filter driver typecheck && export`.
- **T9:** **COPY** `apps/mobile/src/features/driver/*` → `apps/driver/src/features/*` và `navigation/Driver{DrawerContext,MenuButton,SidebarDrawer}` → `apps/driver/src/navigation/`; đổi import shared → `@leopard/mobile-core`. Mobile giữ nguyên (vẫn xanh).
- **T10:** Route driver: nâng `app/driver/*` → root `app/*` của driver app; thêm `app/(public)/login.tsx` + `driver-register.tsx`; `_layout.tsx` bọc `DriverDrawerProvider`; `index.tsx` splash→redirect. Move `driver-register-route.test.tsx` sang app driver.
- **T11:** Verify driver boot: `pnpm --filter driver export`, khởi động vào `/(public)/login`.
- **T12 (TDD — "chỉnh authen cho chuẩn"):** `apps/driver/src/navigation/driver-session.ts` với `resolveDriverLogin({isAuthenticated, role}) → {kind:'enter'|'not-a-driver'|'unauthenticated'}` + test. Nối vào login (`onLoginSuccess`: DRIVER→`/orders`; khác→màn "Tài khoản chưa phải tài xế" + nút Đăng ký tài xế + Đăng xuất) và index redirect.
- **T13 (CỔNG DỪNG):** Chỉ khi T11+T12 xanh. Gỡ `app/driver/*`, `src/features/driver`, `navigation/Driver*` khỏi `apps/mobile`; rút gọn `role-router.ts` (DRIVER→`/(public)/login`) + sửa test; sửa link `/driver/*`. Verify mobile. **Sát bảo vệ mà chưa chắc → DỪNG cuối T12** (đã có app driver riêng chạy được, mobile vẫn là bản gộp demo).
- **T14:** README + `docs/development/01-local-setup.md` (thêm app driver).
- Sau T14: final whole-branch review → nếu sạch, xóa workspace SDD, dùng superpowers:finishing-a-development-branch.

## 8. Lệnh verify nhanh
```bash
cd /d/leopard
git status --short
grep -rn "@leopard/mobile-core" packages/mobile-core/src              # phải rỗng (no self-import)
grep -rEn "from '(\./|(\.\./)+)(api|auth)/'" apps/mobile/src apps/mobile/app  # chỉ còn import feature nội bộ của 4 route test
pnpm --filter @leopard/mobile-core typecheck && pnpm --filter @leopard/mobile-core test
pnpm --filter mobile typecheck && pnpm --filter mobile test
```
Baseline: mobile typecheck 0, mobile test 571/571; mobile-core 74/74 (sẽ tăng sau khi nhận test api/auth).

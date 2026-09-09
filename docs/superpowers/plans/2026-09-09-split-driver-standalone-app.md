# Tách Driver thành App Standalone — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tách toàn bộ trải nghiệm tài xế khỏi app gộp `apps/mobile` thành một app Expo độc lập `apps/driver`, dùng chung backend và cùng hệ tài khoản (identity model A), bỏ role-based routing ở client và thay bằng guard "chỉ tài xế" ngay tại màn login.

**Architecture:** Nâng phần runtime dùng chung của mobile (`api`, `auth`, `media`, `theme`, `ui`) từ `apps/mobile/src` lên một workspace package React Native mới `packages/mobile-core` mà cả hai app cùng consume. Tạo `apps/driver` (bundle `com.leopard.driver`) chứa route + feature tài xế. Backend **không đổi** (token vẫn mang `role=DRIVER`, mọi guard giữ nguyên); driver app chỉ kiểm role ở tầng UI sau login. `apps/mobile` giữ xanh xuyên suốt để làm bản demo dự phòng; nhánh driver trong nó chỉ bị gỡ ở phase cuối, sau khi driver app đã verify.

**Tech Stack:** Expo 57 (expo-router 57), React Native 0.86, React 19.2, pnpm workspace, Metro (monorepo), TypeScript strict, Jest (jest-expo), TanStack Query, socket.io-client, expo-secure-store, firebase.

**Spec:** Phân tích trong hội thoại ngày 2026-09-09 (câu trả lời người dùng: "App riêng, chung tài khoản" + "Làm ngay, chấp nhận rủi ro"). Không có file spec riêng; plan này là hiện thực hoá phân tích đó.

## Global Constraints

- **Không thay đổi backend, schema Prisma, hay migration.** `User.role` giữ enum đơn; `User.phone` giữ `@unique`. 1 SĐT = 1 vai trò. (Ràng buộc Điều 4.3 hợp đồng: không đổi CSDL/kiến trúc backend sát bảo vệ.)
- **`apps/mobile` phải luôn build/test/boot được sau MỖI task** — nó là bản demo dự phòng. Bất kỳ task nào làm `apps/mobile` đỏ là task fail.
- **Không import chéo giữa feature customer và feature driver** (hiện đã sạch — phải giữ nguyên nguyên tắc này).
- Package chung tên `@leopard/mobile-core`, `private: true`, `main`/`types` trỏ `./src/index.ts`, version `workspace:*` — mirror cách `@leopard/shared` và `@leopard/ui` được khai báo.
- Bundle id driver app: iOS `com.leopard.driver`, Android `com.leopard.driver`, scheme `leoparddriver`, expo slug `leopard-driver`.
- Mọi lệnh chạy từ root bằng pnpm filter: `pnpm --filter mobile <script>`, `pnpm --filter @leopard/mobile-core <script>`, `pnpm --filter driver <script>`.
- Không thêm unit test giả cho thao tác di chuyển file thuần tuý; cổng hồi quy cho move là `typecheck` + bộ jest hiện có + app boot. Chỉ viết test mới cho **hành vi mới** (driver login role-guard, Task 12).

---

## File Structure (biên giới sau khi tách)

**`packages/mobile-core/src/`** — shared, cả hai app consume:
- `api/` → `api-error.ts`, `http-client.ts`, `http-client.test.ts`, `query-client.ts`, `socket-client.ts`
- `auth/` → `AuthHeroHeader.tsx`, `LoginScreen.tsx`, `LoginScreen.test.tsx`, `OtpSixCellInput.tsx`, `expo-secure-store.d.ts`, `firebase.ts`, `firebase-auth.ts`, `phone.ts`, `phone.test.ts`, `secure-session-storage.ts`, `session-store.ts`, `session-store.test.ts`
- `media/` → `device-image-picker.ts` (+test), `form-data.ts` (+test)
- `theme/` → `tokens.ts`
- `ui/` → toàn bộ component + `icons/` (design system dùng chung)
- `index.ts` → barrel re-export các entry cần thiết.

**`apps/driver/`** — driver-only:
- `app/(public)/login.tsx`, `app/(public)/driver-register.tsx`
- `app/_layout.tsx`, `app/index.tsx`, `app/+not-found.tsx`
- `app/orders/index.tsx`, `app/orders/[id].tsx`, `app/chat/[id].tsx`, `app/earnings.tsx`, `app/history.tsx`, `app/kyc.tsx`, `app/performance.tsx`, `app/profile.tsx`, `app/profile-edit.tsx`, `app/settings.tsx`, `app/wallet.tsx` (từ `app/driver/*` nâng lên root)
- `src/features/*` (từ `apps/mobile/src/features/driver/*`)
- `src/navigation/` → `DriverDrawerContext`, `DriverMenuButton`, `DriverSidebarDrawer` + guard mới `driver-session.ts`

**`apps/mobile/`** — customer-only (sau phase cuối):
- Giữ `src/features/{customer,home,deliveries,tracking,splash,onboarding}`
- `src/navigation/` giữ `TabBar`, `root-layout`, `role-router` (rút gọn chỉ customer)
- Route tests cấp route ở `src/auth` (`login-route.test.tsx`, `customer-*-route.test.tsx`) **ở lại** app này; `driver-register-route.test.tsx` chuyển sang `apps/driver`.

**Các file test tham chiếu feature (KHÔNG chuyển vào package):**
`src/auth/customer-address-route.test.tsx`, `src/auth/customer-register-route.test.tsx`, `src/auth/login-route.test.tsx` → ở lại `apps/mobile`. `src/auth/driver-register-route.test.tsx` → sang `apps/driver`.

---

## Phase 0 — An toàn & mốc dự phòng

### Task 1: Đóng mốc dự phòng của app gộp

**Files:**
- Không sửa code; chỉ thao tác git.

- [ ] **Step 1: Xác nhận cây sạch hoặc commit dở dang**

Run: `git status --short`
Nếu có thay đổi chưa commit không liên quan, dừng và hỏi người dùng trước khi tiếp tục.

- [ ] **Step 2: Tạo tag mốc demo dự phòng trên commit hiện tại**

```bash
git tag demo-fallback-combined-app
git tag -n1 demo-fallback-combined-app
```

Expected: tag hiện ra, trỏ vào commit gộp hiện tại. Đây là bản để quay về nếu tách hỏng sát bảo vệ.

- [ ] **Step 3: Ghi lại baseline xanh của app hiện tại**

Run: `pnpm --filter mobile typecheck && pnpm --filter mobile test`
Expected: PASS cả hai. Ghi lại số suite/test pass để so sánh về sau (regression baseline).

---

## Phase 1 — Tạo `packages/mobile-core` và cho `apps/mobile` consume

### Task 2: Khởi tạo package rỗng `@leopard/mobile-core`

**Files:**
- Create: `packages/mobile-core/package.json`
- Create: `packages/mobile-core/tsconfig.json`
- Create: `packages/mobile-core/src/index.ts` (tạm rỗng)

**Interfaces:**
- Produces: workspace package `@leopard/mobile-core`, entry `./src/index.ts`.

- [ ] **Step 1: Viết `package.json`**

```json
{
  "name": "@leopard/mobile-core",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "jest --runInBand --config jest.config.cjs",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "expo": "*",
    "expo-image-picker": "*",
    "expo-location": "*",
    "expo-secure-store": "*",
    "firebase": "*",
    "react": "*",
    "react-native": "*",
    "react-native-svg": "*",
    "@tanstack/react-query": "*",
    "socket.io-client": "*"
  },
  "devDependencies": {
    "@leopard/config": "workspace:*"
  }
}
```

- [ ] **Step 2: Viết `tsconfig.json`** (mirror mobile, kế thừa expo base)

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "paths": {
      "@leopard/shared": ["../shared/src/index.ts"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Viết `src/index.ts` tạm**

```ts
export {};
```

- [ ] **Step 4: Cài đặt lại workspace để symlink package**

Run: `pnpm install`
Expected: pnpm nhận `@leopard/mobile-core`, không lỗi.

- [ ] **Step 5: Commit**

```bash
git add packages/mobile-core
git commit -m "chore(mobile-core): scaffold shared React Native package"
```

### Task 3: Di chuyển `theme` + `media` (lá, ít phụ thuộc nhất) vào package

**Files:**
- Move: `apps/mobile/src/theme/tokens.ts` → `packages/mobile-core/src/theme/tokens.ts`
- Move: `apps/mobile/src/media/{device-image-picker.ts,device-image-picker.test.ts,form-data.ts,form-data.test.ts}` → `packages/mobile-core/src/media/`
- Modify: `packages/mobile-core/src/index.ts` (thêm export)
- Modify: mọi file `apps/mobile` đang import `../theme/tokens`, `../media/*` → đổi sang `@leopard/mobile-core`

**Interfaces:**
- Produces: `export * from './theme/tokens'`, `export * from './media/device-image-picker'`, `export * from './media/form-data'` trong barrel.

- [ ] **Step 1: Di chuyển file bằng git mv (giữ lịch sử)**

```bash
git mv apps/mobile/src/theme/tokens.ts packages/mobile-core/src/theme/tokens.ts
git mv apps/mobile/src/media packages/mobile-core/src/media
```

- [ ] **Step 2: Thêm export vào barrel `packages/mobile-core/src/index.ts`**

```ts
export * from './theme/tokens';
export * from './media/device-image-picker';
export * from './media/form-data';
```

- [ ] **Step 3: Cập nhật import trong `apps/mobile`**

Tìm mọi tham chiếu cũ và đổi sang package:

```bash
cd apps/mobile
grep -rl "theme/tokens\|media/device-image-picker\|media/form-data" src app
```

Với mỗi file, đổi `import { ... } from '../../theme/tokens'` (độ sâu bất kỳ) → `import { ... } from '@leopard/mobile-core'`. Gộp các named import cùng nguồn thành một dòng.

- [ ] **Step 4: Thêm path alias để mobile resolve package lúc typecheck**

Modify `apps/mobile/tsconfig.json` — thêm vào `paths`:

```json
"@leopard/mobile-core": ["../../packages/mobile-core/src/index.ts"]
```

- [ ] **Step 5: Verify app mobile vẫn xanh**

Run: `pnpm --filter mobile typecheck && pnpm --filter mobile test`
Expected: PASS, số test không giảm so với baseline Task 1. Các test `device-image-picker.test`, `form-data.test` giờ chạy dưới package (Task 5 sẽ nối jest cho package); tạm thời chúng vẫn nằm trong glob mobile nếu chưa đổi — nếu jest mobile không còn thấy chúng, xác nhận chúng chạy khi `pnpm --filter @leopard/mobile-core test` sau Task 5.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(mobile-core): move theme + media into shared package"
```

### Task 4: Di chuyển `ui/` (design system) vào package

**Files:**
- Move: toàn bộ `apps/mobile/src/ui/` → `packages/mobile-core/src/ui/`
- Modify: `packages/mobile-core/src/index.ts`
- Modify: mọi import `ui/*` trong `apps/mobile`

**Interfaces:**
- Consumes: `@leopard/mobile-core` theme/media (các component ui import `../theme/tokens` nội bộ — sau khi cùng vào package, đổi thành `../theme/tokens` tương đối trong package).
- Produces: export các component ui (`Button`, `ScreenScaffold`, `ScreenState`, `StatusBadge`, `StatusTimeline`, `Skeleton`, `RealInteractiveMap`, `FormField`, `icons/CoreIcons`, …) qua barrel.

- [ ] **Step 1: Di chuyển thư mục**

```bash
git mv apps/mobile/src/ui packages/mobile-core/src/ui
```

- [ ] **Step 2: Sửa import nội bộ trong `ui/` trỏ theme/media**

Trong `packages/mobile-core/src/ui/**`, các import `../theme/tokens`, `../media/*` phải trỏ đúng vị trí mới trong package (đường dẫn tương đối `../theme/tokens`, `../media/...`). Không dùng `@leopard/mobile-core` bên trong chính package (tránh vòng self-import).

- [ ] **Step 3: Thêm export ui vào barrel**

```ts
export * from './ui/Button';
export * from './ui/ScreenScaffold';
export * from './ui/ScreenState';
export * from './ui/StatusBadge';
export * from './ui/StatusTimeline';
export * from './ui/Skeleton';
export * from './ui/RealInteractiveMap';
export * from './ui/FormField';
export * from './ui/icons/CoreIcons';
// ... thêm mọi component còn được app import (đối chiếu danh sách src/ui đã liệt kê)
```

- [ ] **Step 4: Cập nhật import `ui/*` trong `apps/mobile`**

```bash
cd apps/mobile
grep -rl "from '\(\.\./\)\+ui/" src app
```

Đổi mọi `from '../../ui/Button'` (độ sâu bất kỳ) → `from '@leopard/mobile-core'`. Lưu ý các import `ui/icons/CoreIcons` cũng gộp về `@leopard/mobile-core`.

- [ ] **Step 5: Verify mobile xanh**

Run: `pnpm --filter mobile typecheck && pnpm --filter mobile test`
Expected: PASS, không giảm test.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(mobile-core): move UI design system into shared package"
```

### Task 5: Di chuyển `api/` + nối Jest cho package

**Files:**
- Move: `apps/mobile/src/api/{api-error.ts,http-client.ts,http-client.test.ts,query-client.ts,socket-client.ts}` → `packages/mobile-core/src/api/`
- Create: `packages/mobile-core/jest.config.cjs`
- Modify: `packages/mobile-core/src/index.ts`
- Modify: import `api/*` trong `apps/mobile`

**Interfaces:**
- Produces: `export * from './api/http-client'`, `./api/api-error`, `./api/query-client`, `./api/socket-client`.

- [ ] **Step 1: Di chuyển**

```bash
git mv apps/mobile/src/api packages/mobile-core/src/api
```

- [ ] **Step 2: Tạo `packages/mobile-core/jest.config.cjs`** (mirror preset jest-expo của mobile)

```js
module.exports = {
  preset: 'jest-expo',
  testPathIgnorePatterns: ['/node_modules/'],
};
```

- [ ] **Step 3: Thêm `jest-expo` + deps test vào devDependencies package**

Modify `packages/mobile-core/package.json` devDependencies: thêm `"jest": "29.7.0"`, `"jest-expo": "57.0.2"`, `"@jest/globals": "29.7.0"`, `"@testing-library/react-native": "14.0.1"`, `"react-test-renderer": "19.2.7"`, `"@types/react": "19.2.7"` (khớp version mobile). Chạy `pnpm install`.

- [ ] **Step 4: Sửa import nội bộ trong `api/` + thêm export barrel**

`socket-client`/`http-client` import `../auth/session-store` — auth chưa vào package (Task 6). Tạm thời import tương đối trỏ ngược sang app **KHÔNG** được phép (package không được phụ thuộc app). Vì vậy Task 6 (auth) phải đi liền: nếu `api` cần `auth`, thực hiện Task 5 và Task 6 như **một commit gộp**. Kiểm tra: `grep -rn "auth/session-store\|auth/http" packages/mobile-core/src/api`. Nếu có, làm tiếp Task 6 trước khi verify.

- [ ] **Step 5: Cập nhật import `api/*` trong `apps/mobile`** → `@leopard/mobile-core`.

- [ ] **Step 6: Verify** (sau khi Task 6 xong nếu có phụ thuộc auth)

Run: `pnpm --filter mobile typecheck && pnpm --filter mobile test && pnpm --filter @leopard/mobile-core test`
Expected: PASS.

- [ ] **Step 7: Commit** (gộp với Task 6 nếu phụ thuộc)

```bash
git add -A
git commit -m "refactor(mobile-core): move api layer into shared package"
```

### Task 6: Di chuyển `auth/` shared (trừ route tests) vào package

**Files:**
- Move sang `packages/mobile-core/src/auth/`: `AuthHeroHeader.tsx`, `LoginScreen.tsx`, `LoginScreen.test.tsx`, `OtpSixCellInput.tsx`, `expo-secure-store.d.ts`, `firebase.ts`, `firebase-auth.ts`, `phone.ts`, `phone.test.ts`, `secure-session-storage.ts`, `session-store.ts`, `session-store.test.ts`
- **Ở lại** `apps/mobile/src/auth/`: `login-route.test.tsx`, `customer-address-route.test.tsx`, `customer-register-route.test.tsx`
- **Chuyển sang `apps/driver`** ở Task 10: `driver-register-route.test.tsx` (tạm để nguyên tại `apps/mobile/src/auth` cho tới Task 10)
- Modify: `packages/mobile-core/src/index.ts`
- Modify: import `auth/*` trong `apps/mobile`

**Interfaces:**
- Consumes: `@leopard/mobile-core` api (`http-client`, `api-error`), theme, ui (LoginScreen dùng ui/theme). Trong package dùng import tương đối.
- Produces: `export * from './auth/session-store'`, `./auth/firebase-auth`, `./auth/phone`, `export { LoginScreen } from './auth/LoginScreen'`, `export { AuthHeroHeader }`, `export { OtpSixCellInput }`, `export { secureSessionStorage }` (theo các symbol thực có).

- [ ] **Step 1: Di chuyển các file auth shared (không đụng 4 route test)**

```bash
git mv apps/mobile/src/auth/AuthHeroHeader.tsx packages/mobile-core/src/auth/AuthHeroHeader.tsx
git mv apps/mobile/src/auth/LoginScreen.tsx packages/mobile-core/src/auth/LoginScreen.tsx
git mv apps/mobile/src/auth/LoginScreen.test.tsx packages/mobile-core/src/auth/LoginScreen.test.tsx
git mv apps/mobile/src/auth/OtpSixCellInput.tsx packages/mobile-core/src/auth/OtpSixCellInput.tsx
git mv apps/mobile/src/auth/expo-secure-store.d.ts packages/mobile-core/src/auth/expo-secure-store.d.ts
git mv apps/mobile/src/auth/firebase.ts packages/mobile-core/src/auth/firebase.ts
git mv apps/mobile/src/auth/firebase-auth.ts packages/mobile-core/src/auth/firebase-auth.ts
git mv apps/mobile/src/auth/phone.ts packages/mobile-core/src/auth/phone.ts
git mv apps/mobile/src/auth/phone.test.ts packages/mobile-core/src/auth/phone.test.ts
git mv apps/mobile/src/auth/secure-session-storage.ts packages/mobile-core/src/auth/secure-session-storage.ts
git mv apps/mobile/src/auth/session-store.ts packages/mobile-core/src/auth/session-store.ts
git mv apps/mobile/src/auth/session-store.test.ts packages/mobile-core/src/auth/session-store.test.ts
```

- [ ] **Step 2: Sửa import nội bộ trong package** — `LoginScreen`, `session-store`, `firebase-auth` phải trỏ api/theme/ui bằng đường dẫn tương đối trong package (`../api/http-client`, `../ui/Button`, …), không dùng `@leopard/mobile-core`.

- [ ] **Step 3: Thêm export barrel** cho các symbol auth mà app đang dùng (`sessionStore`, `LoginScreen`, `AuthHeroHeader`, `OtpSixCellInput`, `refreshSession` nếu ở http-client, hàm firebase-auth, phone utils).

- [ ] **Step 4: Cập nhật import trong `apps/mobile`**

Các file còn lại của app (kể cả 4 route test ở lại) đổi `../auth/session-store` → `@leopard/mobile-core`; `../auth/LoginScreen` → `@leopard/mobile-core`. Route test import `LoginScreen`/`sessionStore` từ package, và import feature code (`../features/...`) từ app như cũ.

- [ ] **Step 5: Verify toàn bộ**

Run: `pnpm --filter @leopard/mobile-core typecheck && pnpm --filter @leopard/mobile-core test && pnpm --filter mobile typecheck && pnpm --filter mobile test`
Expected: PASS tất cả; tổng số test (package + mobile) ≥ baseline Task 1.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(mobile-core): move shared auth (login, session, firebase) into package"
```

### Task 7: Cấu hình Metro monorepo cho `apps/mobile`

**Files:**
- Create: `apps/mobile/metro.config.js`
- Modify: `apps/mobile/package.json` (thêm dependency `@leopard/mobile-core`)

**Interfaces:**
- Produces: Metro resolve được `@leopard/mobile-core` từ workspace lúc chạy thật (không chỉ typecheck).

- [ ] **Step 1: Thêm `@leopard/mobile-core` vào dependencies mobile**

Modify `apps/mobile/package.json`:

```json
"@leopard/mobile-core": "workspace:*"
```

Run: `pnpm install`

- [ ] **Step 2: Tạo `apps/mobile/metro.config.js`** (chuẩn Expo monorepo — watch root, resolve node_modules gốc + local)

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
```

- [ ] **Step 3: Verify app boot thật (Metro bundle) trên web**

Run: `pnpm --filter mobile export` (expo export web — bundle không cần thiết bị)
Expected: export thành công, không lỗi "Unable to resolve @leopard/mobile-core". Nếu lỗi resolve, kiểm tra `disableHierarchicalLookup`/`nodeModulesPaths`.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/metro.config.js apps/mobile/package.json
git commit -m "chore(mobile): add metro monorepo config for shared package resolution"
```

**Phase 1 Done-check:** `apps/mobile` typecheck + test + export web đều xanh, consume hoàn toàn `@leopard/mobile-core`. Bản demo dự phòng vẫn nguyên chức năng (cả customer lẫn driver còn nằm trong app này). Chưa gỡ gì của driver.

---

## Phase 2 — Dựng `apps/driver`

### Task 8: Scaffold app Expo `apps/driver` (rỗng, boot được)

**Files:**
- Create: `apps/driver/package.json`
- Create: `apps/driver/app.json`
- Create: `apps/driver/tsconfig.json`
- Create: `apps/driver/babel.config.js`
- Create: `apps/driver/metro.config.js`
- Create: `apps/driver/app/_layout.tsx`
- Create: `apps/driver/app/index.tsx` (tạm "Hello driver")
- Create: `apps/driver/assets/` (copy brand assets cần cho icon/splash từ `apps/mobile/assets/brand`)

**Interfaces:**
- Produces: app Expo `driver` boot được, consume `@leopard/mobile-core`.

- [ ] **Step 1: `package.json`** (mirror mobile, đổi tên, thêm dep mobile-core)

```json
{
  "name": "driver",
  "version": "0.0.0",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "test": "jest --runInBand",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "export": "expo export --platform web"
  },
  "dependencies": {
    "@leopard/mobile-core": "workspace:*",
    "@tanstack/react-query": "5.101.2",
    "expo": "57.0.4",
    "expo-image-picker": "~57.0.12",
    "expo-location": "~57.0.16",
    "expo-router": "57.0.4",
    "expo-secure-store": "57.0.1",
    "firebase": "^12.18.0",
    "react": "19.2.7",
    "react-dom": "19.2.7",
    "react-hook-form": "7.81.0",
    "react-native": "0.86.0",
    "react-native-qrcode-svg": "^6.3.22",
    "react-native-safe-area-context": "5.8.0",
    "react-native-svg": "15.15.4",
    "react-native-web": "0.21.2",
    "react-native-webview": "13.16.1",
    "react-native-worklets": "0.10.0",
    "socket.io-client": "4.8.3"
  },
  "devDependencies": {
    "@jest/globals": "29.7.0",
    "@leopard/config": "workspace:*",
    "@testing-library/react-native": "14.0.1",
    "@types/react": "19.2.7",
    "babel-preset-expo": "57.0.3",
    "jest": "29.7.0",
    "jest-expo": "57.0.2",
    "react-test-renderer": "19.2.7"
  },
  "jest": {
    "preset": "jest-expo",
    "testPathIgnorePatterns": ["/node_modules/", "/e2e/"]
  }
}
```

- [ ] **Step 2: `app.json`** (bundle/scheme riêng, giữ plugin location + image-picker)

```json
{
  "expo": {
    "name": "LEOPARD Driver",
    "slug": "leopard-driver",
    "version": "0.0.0",
    "orientation": "portrait",
    "scheme": "leoparddriver",
    "userInterfaceStyle": "light",
    "backgroundColor": "#EEF3F9",
    "icon": "./assets/brand/leopard-emblem.png",
    "newArchEnabled": true,
    "ios": { "bundleIdentifier": "com.leopard.driver", "supportsTablet": false },
    "android": { "package": "com.leopard.driver" },
    "web": { "bundler": "metro", "output": "single", "favicon": "./assets/brand/leopard-emblem.png", "name": "LEOPARD Driver", "shortName": "LEOPARD Driver", "lang": "vi", "themeColor": "#1E5BB8", "backgroundColor": "#EEF3F9", "display": "standalone", "orientation": "portrait", "startUrl": "/", "scope": "/" },
    "plugins": [
      "expo-router",
      ["expo-image-picker", { "photosPermission": "LEOPARD Driver cần quyền truy cập thư viện ảnh để tải ảnh xác nhận giao hàng và giấy tờ." }],
      ["expo-location", { "locationWhenInUsePermission": "LEOPARD Driver cần vị trí của bạn để nhận đơn gần bạn và cập nhật tracking khi đang giao hàng." }]
    ]
  }
}
```

- [ ] **Step 3: `tsconfig.json`** (mirror mobile, có 2 path alias)

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "jsx": "react-jsx",
    "paths": {
      "@leopard/shared": ["../../packages/shared/src/index.ts"],
      "@leopard/mobile-core": ["../../packages/mobile-core/src/index.ts"]
    }
  },
  "include": ["app", "src"]
}
```

- [ ] **Step 4: `babel.config.js`** — copy nguyên từ `apps/mobile/babel.config.js`.

- [ ] **Step 5: `metro.config.js`** — copy nguyên từ `apps/mobile/metro.config.js` (Task 7 Step 2), giữ `projectRoot = __dirname`.

- [ ] **Step 6: Root `app/_layout.tsx`** (copy providers từ mobile: QueryClientProvider + SafeAreaProvider + Slot + ErrorBoundary; `queryClient` lấy từ `@leopard/mobile-core`).

- [ ] **Step 7: `app/index.tsx` tạm**

```tsx
import { Text, View } from 'react-native';
export default function DriverIndex() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>LEOPARD Driver</Text>
    </View>
  );
}
```

- [ ] **Step 8: Copy assets brand cần cho icon/splash**

```bash
mkdir -p apps/driver/assets/brand
cp apps/mobile/assets/brand/leopard-emblem.png apps/driver/assets/brand/
```
(Copy thêm asset nào `app.json` tham chiếu.)

- [ ] **Step 9: Cài + verify boot**

Run: `pnpm install && pnpm --filter driver typecheck && pnpm --filter driver export`
Expected: typecheck PASS, export web PASS (bundle "Hello driver").

- [ ] **Step 10: Commit**

```bash
git add apps/driver
git commit -m "feat(driver): scaffold standalone driver Expo app"
```

### Task 9: Chuyển feature driver + navigation driver sang `apps/driver`

**Files:**
- Move: `apps/mobile/src/features/driver/*` → `apps/driver/src/features/*`
- Move: `apps/mobile/src/navigation/DriverDrawerContext.*`, `DriverMenuButton.*`, `DriverSidebarDrawer.*` → `apps/driver/src/navigation/`
- Modify: import trong các file vừa chuyển: `../../ui/*`, `../../theme/tokens`, `../../api/*`, `../../media/*`, `../../auth/session-store` → `@leopard/mobile-core`; import `../navigation/Driver*` giữ tương đối trong app driver.

**Interfaces:**
- Consumes: `@leopard/mobile-core` (ui, theme, api, media, auth).
- Produces: cây `apps/driver/src/features/*` + `apps/driver/src/navigation/Driver*`.

- [ ] **Step 1: Di chuyển feature + navigation driver**

```bash
git mv apps/mobile/src/features/driver apps/driver/src/features
mkdir -p apps/driver/src/navigation
git mv apps/mobile/src/navigation/DriverDrawerContext.tsx apps/driver/src/navigation/DriverDrawerContext.tsx
git mv apps/mobile/src/navigation/DriverMenuButton.tsx apps/driver/src/navigation/DriverMenuButton.tsx
git mv apps/mobile/src/navigation/DriverSidebarDrawer.tsx apps/driver/src/navigation/DriverSidebarDrawer.tsx
```
(Tên file chính xác đối chiếu `ls apps/mobile/src/navigation` — điều chỉnh nếu có `.test` kèm theo, chuyển cả test.)

- [ ] **Step 2: Đổi import shared sang package**

Trong `apps/driver/src/**`, đổi mọi `from '(../)+ui/...'`, `theme/tokens`, `api/...`, `media/...`, `auth/session-store` → `from '@leopard/mobile-core'`. Import `navigation/Driver*` sửa thành đường dẫn tương đối mới trong app driver.

- [ ] **Step 3: Verify typecheck driver** (routes chưa nối — có thể còn thiếu; chấp nhận lỗi "unused" nhưng không lỗi resolve import package)

Run: `pnpm --filter driver typecheck`
Expected: không còn lỗi "Cannot find module '@leopard/mobile-core'" hay import feature. Lỗi còn lại (nếu có) chỉ do route chưa tạo (Task 10).

- [ ] **Step 4: Verify mobile không vỡ** (đã bớt feature driver nhưng app/driver/* vẫn còn — sẽ đỏ vì route trỏ feature vừa move)

Vì `apps/mobile/app/driver/*` vẫn import `../../src/features/driver/*` (vừa move đi), **mobile sẽ đỏ ở bước này**. Đây là lý do Task 9 và Task 13 (gỡ route driver khỏi mobile) thuộc cùng một mạch — nhưng để giữ fallback, **KHÔNG gỡ khỏi mobile ở đây**. Thay vào đó: tạm thời để `apps/mobile/app/driver/*` import feature driver từ vị trí mới bằng path tương đối tới app driver **là không được phép** (app không phụ thuộc app).

  → Quyết định: **Sao chép (copy, không move) feature driver ở Task 9** để cả hai app cùng có bản của mình trong giai đoạn chuyển tiếp; bản trong `apps/mobile` sẽ bị xoá ở Phase 4. Sửa Step 1 dùng `cp -r` thay `git mv`:

```bash
cp -r apps/mobile/src/features/driver apps/driver/src/features
mkdir -p apps/driver/src/navigation
cp apps/mobile/src/navigation/DriverDrawerContext.tsx apps/driver/src/navigation/
cp apps/mobile/src/navigation/DriverMenuButton.tsx apps/driver/src/navigation/
cp apps/mobile/src/navigation/DriverSidebarDrawer.tsx apps/driver/src/navigation/
```

Chỉ sửa import ở **bản copy trong `apps/driver`**; bản trong `apps/mobile` giữ nguyên (vẫn xanh). Trùng lặp tạm thời là chủ ý, được dọn ở Phase 4.

- [ ] **Step 5: Verify cả hai**

Run: `pnpm --filter mobile typecheck && pnpm --filter mobile test && pnpm --filter driver typecheck`
Expected: mobile PASS (nguyên vẹn); driver chỉ còn lỗi thiếu route.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(driver): copy driver features + navigation into standalone app"
```

### Task 10: Tạo route driver (nâng `app/driver/*` lên root) + public login/register

**Files:**
- Create trong `apps/driver/app/`: `orders/index.tsx`, `orders/[id].tsx`, `chat/[id].tsx`, `earnings.tsx`, `history.tsx`, `kyc.tsx`, `performance.tsx`, `profile.tsx`, `profile-edit.tsx`, `settings.tsx`, `wallet.tsx`, `+not-found.tsx`
- Create: `apps/driver/app/(public)/login.tsx`, `apps/driver/app/(public)/driver-register.tsx`
- Create/replace: `apps/driver/app/_layout.tsx` (DriverDrawerProvider bọc Slot), `apps/driver/app/index.tsx` (splash → điều hướng)
- Move: `apps/mobile/src/auth/driver-register-route.test.tsx` → `apps/driver/` (đặt cạnh route tương ứng), sửa import feature/contract sang đường dẫn app driver + `@leopard/mobile-core`.

**Interfaces:**
- Consumes: feature driver (Task 9), `@leopard/mobile-core` LoginScreen.
- Produces: cây route driver hoàn chỉnh; entry `app/index.tsx`.

- [ ] **Step 1: Copy nội dung route từ `apps/mobile/app/driver/*` sang `apps/driver/app/*`** (bỏ tiền tố `driver/`), sửa import trỏ `../src/features/*` (app driver) + `@leopard/mobile-core`. Copy `app/(public)/driver-register.tsx` từ mobile, đổi import tương tự.

- [ ] **Step 2: `app/_layout.tsx`** — bọc `DriverDrawerProvider` (từ `src/navigation`) quanh `Slot`, kèm providers gốc (query/safearea/errorboundary). Tham chiếu `apps/mobile/app/driver/_layout.tsx` để giữ hành vi `useDriverIdlePing`.

- [ ] **Step 3: `app/index.tsx`** — splash → nếu có session & role DRIVER thì `router.replace('/orders')`, ngược lại `router.replace('/(public)/login')`. (Guard chi tiết ở Task 12.)

- [ ] **Step 4: `app/(public)/login.tsx`** — render `LoginScreen` từ `@leopard/mobile-core`, truyền `onLoginSuccess` xử lý theo Task 12.

- [ ] **Step 5: Chuyển route test driver-register**

```bash
git mv apps/mobile/src/auth/driver-register-route.test.tsx apps/driver/app/\(public\)/driver-register-route.test.tsx
```
Sửa import `openDriverContractPdf` và feature trỏ `../../src/features/*` của app driver; `LoginScreen`/`sessionStore` từ `@leopard/mobile-core`.

- [ ] **Step 6: Verify driver typecheck + test**

Run: `pnpm --filter driver typecheck && pnpm --filter driver test`
Expected: PASS.

- [ ] **Step 7: Verify mobile vẫn xanh** (driver-register-route.test rời đi; xác nhận không phá jest mobile)

Run: `pnpm --filter mobile typecheck && pnpm --filter mobile test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(driver): add driver routes and public login/register"
```

### Task 11: Verify driver app boot thật (Metro export)

- [ ] **Step 1: Export web driver**

Run: `pnpm --filter driver export`
Expected: bundle thành công, không lỗi resolve. Điều hướng khởi động vào `/(public)/login`.

- [ ] **Step 2 (thủ công, nếu có thiết bị/emulator):** `pnpm --filter driver start` → mở app → thấy màn login driver. Ghi lại ảnh chụp cho hồ sơ demo. Nếu môi trường không có thiết bị, dừng ở export web.

- [ ] **Step 3: Commit** (nếu có chỉnh nhỏ để boot)

```bash
git add -A
git commit -m "chore(driver): verify standalone boot to login"
```

---

## Phase 3 — Guard "chỉ tài xế" tại login (hành vi mới, TDD)

### Task 12: Driver login role-guard

**Files:**
- Create: `apps/driver/src/navigation/driver-session.ts`
- Create: `apps/driver/src/navigation/driver-session.test.ts`
- Modify: `apps/driver/app/(public)/login.tsx` (dùng guard)
- Modify: `apps/driver/app/index.tsx` (dùng guard cho redirect khởi động)

**Interfaces:**
- Consumes: `sessionStore` từ `@leopard/mobile-core` (`getRole()`, `isAuthenticated()`), `Role` từ `@leopard/shared`.
- Produces:
  - `type DriverLoginOutcome = { kind: 'enter' } | { kind: 'not-a-driver' } | { kind: 'unauthenticated' }`
  - `function resolveDriverLogin(input: { isAuthenticated: boolean; role: Role | null }): DriverLoginOutcome`

- [ ] **Step 1: Viết test thất bại**

```ts
// apps/driver/src/navigation/driver-session.test.ts
import { resolveDriverLogin } from './driver-session';

describe('resolveDriverLogin', () => {
  it('cho vào khi đã xác thực và role DRIVER', () => {
    expect(resolveDriverLogin({ isAuthenticated: true, role: 'DRIVER' })).toEqual({ kind: 'enter' });
  });

  it('chặn khi đã xác thực nhưng không phải DRIVER (CUSTOMER)', () => {
    expect(resolveDriverLogin({ isAuthenticated: true, role: 'CUSTOMER' })).toEqual({ kind: 'not-a-driver' });
  });

  it('chặn khi role là FLEET_OWNER hoặc ADMIN', () => {
    expect(resolveDriverLogin({ isAuthenticated: true, role: 'FLEET_OWNER' })).toEqual({ kind: 'not-a-driver' });
    expect(resolveDriverLogin({ isAuthenticated: true, role: 'ADMIN' })).toEqual({ kind: 'not-a-driver' });
  });

  it('coi là chưa đăng nhập khi không có session', () => {
    expect(resolveDriverLogin({ isAuthenticated: false, role: null })).toEqual({ kind: 'unauthenticated' });
  });
});
```

- [ ] **Step 2: Chạy test — kỳ vọng FAIL**

Run: `pnpm --filter driver test -- driver-session`
Expected: FAIL "resolveDriverLogin is not defined".

- [ ] **Step 3: Cài đặt tối thiểu**

```ts
// apps/driver/src/navigation/driver-session.ts
import type { Role } from '@leopard/shared';

export type DriverLoginOutcome =
  | { kind: 'enter' }
  | { kind: 'not-a-driver' }
  | { kind: 'unauthenticated' };

export function resolveDriverLogin(input: {
  isAuthenticated: boolean;
  role: Role | null;
}): DriverLoginOutcome {
  if (!input.isAuthenticated || input.role === null) {
    return { kind: 'unauthenticated' };
  }
  if (input.role !== 'DRIVER') {
    return { kind: 'not-a-driver' };
  }
  return { kind: 'enter' };
}
```

- [ ] **Step 4: Chạy test — kỳ vọng PASS**

Run: `pnpm --filter driver test -- driver-session`
Expected: PASS.

- [ ] **Step 5: Nối guard vào login + index**

Trong `app/(public)/login.tsx`: `onLoginSuccess={(role) => { const o = resolveDriverLogin({ isAuthenticated: true, role }); if (o.kind === 'enter') router.replace('/orders'); else setNotDriver(true); }}`. Khi `not-a-driver`: hiển thị thông báo "Tài khoản này chưa phải tài xế" + nút "Đăng ký tài xế" điều hướng `/(public)/driver-register`, và nút "Đăng xuất" gọi `sessionStore.clearSession()`.
Trong `app/index.tsx`: dùng `resolveDriverLogin` với `sessionStore.isAuthenticated()`/`getRole()` để chọn redirect khởi động (`enter`→`/orders`, còn lại→`/(public)/login`).

- [ ] **Step 6: Verify**

Run: `pnpm --filter driver typecheck && pnpm --filter driver test && pnpm --filter driver export`
Expected: PASS cả ba.

- [ ] **Step 7: Commit**

```bash
git add apps/driver
git commit -m "feat(driver): reject non-driver accounts at login with apply CTA"
```

---

## Phase 4 — Dọn nhánh driver khỏi `apps/mobile` (chỉ sau khi driver app đã verify)

> **Cổng bắt buộc:** Chỉ bắt đầu Phase 4 khi Task 11 + Task 12 xanh và (nếu có thiết bị) đã chạy thử driver app thủ công. Nếu sát ngày bảo vệ mà chưa yên tâm, **dừng ở cuối Phase 3**: lúc này đã có driver app riêng chạy được, còn `apps/mobile` vẫn là bản gộp đầy đủ để demo — không mất gì.

### Task 13: Gỡ route + feature driver khỏi `apps/mobile`

**Files:**
- Delete: `apps/mobile/app/driver/` (toàn bộ)
- Delete: `apps/mobile/src/features/driver/`
- Delete: `apps/mobile/src/navigation/DriverDrawerContext.*`, `DriverMenuButton.*`, `DriverSidebarDrawer.*`
- Modify: `apps/mobile/src/navigation/role-router.ts` (rút gọn — bỏ nhánh driver)
- Modify: `apps/mobile/src/navigation/role-router.test.ts` (bỏ ca driver)
- Modify: `apps/mobile/app/(public)/onboarding.tsx` / bất kỳ nơi nào link tới `/driver/*`

**Interfaces:**
- Produces: `role-router` chỉ còn `MobileProtectedRouteGroup = 'customer'`; `getMobileHome` map DRIVER → thông báo/redirect login (driver dùng app khác).

- [ ] **Step 1: Cập nhật `role-router.ts` trước (để test bắt tương ứng)**

Rút `MobileProtectedRouteGroup` còn `'customer'`. Trong `getMobileRouteDecision`, role `DRIVER` xử lý như `unsupported-mobile-role` → redirect `/(public)/login` kèm lý do (customer app không phục vụ driver nữa). `getMobileHome('DRIVER')` trả `/(public)/login`. `useRootSessionRouter`: bỏ nhánh `role === 'DRIVER' → /driver/orders`, để DRIVER rơi về login.

- [ ] **Step 2: Cập nhật `role-router.test.ts`** — thay các assertion "DRIVER → /driver/orders" bằng "DRIVER → /(public)/login" (không còn phục vụ driver trong app này). Chạy: `pnpm --filter mobile test -- role-router` → PASS.

- [ ] **Step 3: Xoá route + feature + navigation driver**

```bash
git rm -r apps/mobile/app/driver
git rm -r apps/mobile/src/features/driver
git rm apps/mobile/src/navigation/DriverDrawerContext.tsx apps/mobile/src/navigation/DriverMenuButton.tsx apps/mobile/src/navigation/DriverSidebarDrawer.tsx
```

- [ ] **Step 4: Sửa mọi link còn trỏ `/driver/*` trong app mobile**

```bash
grep -rn "/driver/" apps/mobile/app apps/mobile/src
```
Đổi các deep-link/onboarding CTA "Tôi là tài xế" thành mở app driver (hoặc bỏ, tùy UX). Không để lại route chết.

- [ ] **Step 5: Verify mobile xanh + boot**

Run: `pnpm --filter mobile typecheck && pnpm --filter mobile test && pnpm --filter mobile export`
Expected: PASS cả ba. Số test giảm đúng bằng các test driver đã rời đi; không có fail.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(mobile): remove driver surface, customer-only app"
```

### Task 14: Cập nhật tài liệu bàn giao

**Files:**
- Modify: `README.md` (thêm app driver: cách chạy, bundle id)
- Modify: `docs/development/01-local-setup.md` (lệnh `pnpm --filter driver start`)
- Modify: `.env.example` nếu driver cần biến riêng (thường không — dùng chung API base URL)

- [ ] **Step 1: Ghi mục "Driver app" vào README** — bundle `com.leopard.driver`, `pnpm --filter driver start`, lưu ý dùng chung backend + tài khoản DRIVER.

- [ ] **Step 2: Cập nhật local-setup** với 3 app (api, admin, mobile, driver).

- [ ] **Step 3: Commit**

```bash
git add README.md docs .env.example
git commit -m "docs: document standalone driver app"
```

---

## Self-Review

**Spec coverage (đối chiếu phân tích đã chốt):**
- "App riêng, chung tài khoản" → Phase 2 tạo `apps/driver` dùng chung backend/session (identity model A). ✅
- "Bỏ đăng nhập phân quyền role như cũ" → Task 12 thay role-routing bằng guard login "chỉ tài xế"; Task 13 gỡ role-branch khỏi customer app. ✅
- "Làm ngay, giữ demo dự phòng" → Phase 0 tag fallback; `apps/mobile` xanh xuyên suốt tới Phase 4; cổng dừng an toàn ở cuối Phase 3. ✅
- "Không đổi backend/DB" → Global Constraints + không có task nào chạm `apps/api`/Prisma. ✅

**Placeholder scan:** Không có TBD/TODO; mọi bước có lệnh hoặc code cụ thể. Các thao tác move dùng lệnh git thực; hành vi mới (Task 12) có test + code đầy đủ.

**Type consistency:** `resolveDriverLogin` / `DriverLoginOutcome` định nghĩa ở Task 12 và dùng nhất quán trong login/index cùng task. `@leopard/mobile-core` là tên package thống nhất từ Task 2 trở đi. `MobileProtectedRouteGroup` thu hẹp ở Task 13 khớp với việc xoá nhánh driver.

**Rủi ro đã gài giảm thiểu:**
- Phụ thuộc `api → auth` khiến Task 5/6 phải đi liền — đã ghi rõ trong Task 5 Step 4.
- Trùng lặp feature driver tạm thời (copy thay move) để giữ mobile xanh — Task 9 Step 4, dọn ở Task 13.
- Metro resolve package RN monorepo — Task 7 cấu hình chuẩn `disableHierarchicalLookup` + `nodeModulesPaths`, verify bằng `expo export`.

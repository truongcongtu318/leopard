# Playwright E2E Test Suite for Customer & Driver Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Triển khai bộ kiểm thử tự động Playwright E2E multi-role (Customer & Driver) trên nền Web cho 4 kịch bản đặt và nhận hàng cốt lõi kết nối với live backend.

**Architecture:** Sử dụng `@playwright/test` với mô hình dual-context: 1 browser context chạy app Customer Web (`http://localhost:8081`) và 1 browser context chạy app Driver Web (`http://localhost:8082`), kết nối API NestJS và PostgreSQL để kiểm thử tương tác realtime.

**Tech Stack:** Playwright, TypeScript, Node.js 24, Expo Web, NestJS, Prisma.

**Spec:** `docs/superpowers/specs/2026-03-27-customer-driver-playwright-e2e-design.md`

## Global Constraints
- Tuân thủ cấu trúc monorepo `pnpm` + `turbo`.
- Sử dụng các `testID` sẵn có trên UI của mobile và driver.
- Không sửa đổi logic nghiệp vụ backend, chỉ tương tác qua giao diện web và API.

---

### Task 1: Setup E2E Workspace & Playwright Configuration

**Files:**
- Create: `e2e/package.json`
- Create: `e2e/playwright.config.ts`
- Create: `e2e/tsconfig.json`
- Modify: `package.json` (thêm script `test:e2e:playwright`)

**Interfaces:**
- Produces: Cấu hình Playwright multi-server và script chạy test tự động.

- [x] **Step 1: Tạo file cấu hình e2e/package.json**
- [x] **Step 2: Tạo file e2e/playwright.config.ts với cấu hình 2 web server cho Customer và Driver**
- [x] **Step 3: Cập nhật script root package.json**
- [x] **Step 4: Kiểm tra Playwright config hợp lệ**
Run: `pnpm --filter @leopard/e2e exec playwright --version`
Expected: In ra version của Playwright

---

### Task 2: Implement Test Fixtures & Page Object Models (POM)

**Files:**
- Create: `e2e/fixtures/test-context.ts`
- Create: `e2e/pages/CustomerApp.ts`
- Create: `e2e/pages/DriverApp.ts`

**Interfaces:**
- Consumes: Playwright `test`, `expect`.
- Produces: Helper functions điều khiển Customer app (nhập điểm đến, chọn xe, đặt hàng) và Driver app (bật radar, nhận offer, hoàn tất ePOD).

- [x] **Step 1: Tạo helper fixtures quản lý dual-context (Customer + Driver)**
- [x] **Step 2: Viết CustomerApp Page Object Model**
- [x] **Step 3: Viết DriverApp Page Object Model**
- [x] **Step 4: Typecheck code POM và fixtures**
Run: `pnpm --filter @leopard/e2e typecheck`
Expected: PASS không có lỗi TypeScript

---

### Task 3: Implement Spec 01 - Happy Path Order Lifecycle

**Files:**
- Create: `e2e/specs/01-happy-path.spec.ts`

**Interfaces:**
- Consumes: `CustomerApp`, `DriverApp`, `test-context.ts`.

- [x] **Step 1: Viết test case đặt đơn, nhận đơn và hoàn thành ePOD**
- [x] **Step 2: Chạy kiểm thử Playwright Happy Path**
Run: `pnpm --filter @leopard/e2e test specs/01-happy-path.spec.ts`
Expected: PASS

---

### Task 4: Implement Spec 02 & 03 - Driver Decline, Cancel & Incident

**Files:**
- Create: `e2e/specs/02-driver-decline.spec.ts`
- Create: `e2e/specs/03-cancel-and-incident.spec.ts`

**Interfaces:**
- Consumes: `CustomerApp`, `DriverApp`.

- [ ] **Step 1: Viết kịch bản Driver decline dispatch offer**
- [ ] **Step 2: Viết kịch bản Customer cancel & Driver report incident**
- [ ] **Step 3: Chạy kiểm thử Playwright cho 2 kịch bản**
Run: `pnpm --filter @leopard/e2e test specs/02-driver-decline.spec.ts specs/03-cancel-and-incident.spec.ts`
Expected: PASS

---

### Task 5: Implement Spec 04 - Multi-stop Delivery

**Files:**
- Create: `e2e/specs/04-multi-stop.spec.ts`

**Interfaces:**
- Consumes: `CustomerApp`, `DriverApp`.

- [ ] **Step 1: Viết kịch bản tạo đơn đa điểm dừng và xử lý qua Stepper**
- [ ] **Step 2: Chạy kiểm thử Playwright Multi-stop**
Run: `pnpm --filter @leopard/e2e test specs/04-multi-stop.spec.ts`
Expected: PASS

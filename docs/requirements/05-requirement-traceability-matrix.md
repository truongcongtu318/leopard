# Requirement Traceability Matrix

| Feature | Requirements | User stories | Acceptance | Test scenarios |
| --- | --- | --- | --- | --- |
| F-01 | FR-01 | US-01 | AC-01 | UT-AUTH, IT-AUTH, E2E-LOGIN, IT-BFF-SESSION, E2E-LOGIN-DEMO |
| F-02 | FR-02 | US-02, US-03 | AC-02 | UT-ORDER, IT-ORDER, E2E-CUSTOMER, IT-ADMIN-ORDERS |
| F-03 | FR-02 | US-04, US-06 | AC-03 | UT-STATE, IT-STATE, E2E-DELIVERY, IT-ORDER-DETAIL |
| F-04 | FR-03 | US-05, US-06 | AC-03 | IT-ACCEPT, E2E-DRIVER, IT-DRIVER-AVAILABILITY |
| F-05 | FR-05 | US-07 | AC-04 | IT-SOCKET, E2E-TRACKING, IT-SOCKET-WEB (tracking.gateway + useOrderTrackingSocket), E2E-TRACKING-WEB |
| F-06 | FR-06 | US-08 | AC-02 | UT-ETA, IT-MAP, E2E-CUSTOMER, IT-ADMIN-DASHBOARD |
| F-07 | FR-07 | US-09 | AC-06 | IT-UPLOAD, E2E-DELIVERY, IT-MEDIA-ADMIN |
| F-08 | FR-08 | US-10, US-11 | AC-06 | UT-PAYMENT, IT-PAYMENT, E2E-PAYMENT, IT-ADMIN-PAYMENT-CONFIRM |
| F-09 | FR-04 | US-12, US-13 | AC-05 | IT-FLEET, E2E-FLEET, UT-FLEET-RUNTIME, IT-FLEET-SCOPE |
| F-10 | FR-09 | US-14 | AC-01, AC-07 | IT-ADMIN, E2E-ADMIN, UT-ADMIN-RUNTIME, IT-ADMIN-USERS-STATUS |
| F-11 | FR-09 | US-15 | AC-07 | IT-HEALTH, OPS-SMOKE, E2E-HEALTH-READY |
| F-12 | NFR-09, NFR-10 | US-16 | AC-07 | UI-RESPONSIVE, UI-STATES, UI-QUALITY-WAVE5 (11-ui-quality-scorecard) |

Tên test scenario được định nghĩa trong các tài liệu thuộc `docs/testing`. Mọi thay đổi requirement phải cập nhật dòng tương ứng trong ma trận này.

> **Wave 5 live-ops (feature/web-live-operations):** `apps/admin/src/features/{admin,fleet}/runtime.ts` + `apps/api/src/admin/admin-query.service.ts` live-wire, `apps/admin/src/features/tracking/useOrderTrackingSocket.ts` + `apps/admin/src/app/api/v1/auth/socket-token` cho F-05, `apps/admin/src/components/live/LiveOrderRefresher` visibility-aware polling fallback. Evidence: `docs/testing/evidence/ui-quality-wave5-live.md`.

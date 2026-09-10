# LEOPARD Mobile Demo-Readiness Program — Spec

**Date:** 2026-09-05
**Deadline:** 15/9/2026 (PRD line 8)
**Owner:** Trần Văn Linh (solo, + Claude Code)
**Source PRD:** `LEOPARD - KẾT NỐI VẬN TẢI HÀNG HÓA TRỌNG TẢI LỚN.md` (lines 1-47)
**Prior audit:** see conversation on 2026-09-04 — full screen-by-screen and backend-by-backend gap analysis (mobile: mostly mock UIs; backend: auth/orders/tracking/fleet-read real, payments/notifications/chat/promotions/wallet missing or stubbed).

## 1. Scope decisions (locked in during brainstorming, 2026-09-04/05)

These override anything the PRD implies more broadly:

1. **AI ETA / route optimization**: OUT OF SCOPE. Vietmap's routing API (`apps/api/src/maps/providers/vietmap.provider.ts`) already provides ETA + truck-aware routing. No XGBoost, no OR-Tools/VRP work in this program.
2. **Enterprise / fleet-owner mobile screens**: OUT OF SCOPE. `apps/admin` (web) already has a real API-backed fleet dashboard (`apps/api/src/fleets/fleet-owner.controller.ts`). This program only builds **customer and driver mobile flows**.
3. **VAT invoice**: OUT OF SCOPE for this program. Replaced by a simple **email payment receipt** sent to the customer on successful payment (Phase 5). Formal VAT export is an enterprise/admin concern, deferred.
4. **Notifications**: in-app only, DB-backed. No FCM push in this program (PRD explicitly allows in-app OR FCM).
5. **Chat**: real-time via a new WebSocket gateway, following the existing `tracking.gateway.ts` pattern (namespace, JWT auth, DB persistence).
6. **Wallet**: FULL wallet for both customer and driver — balance + transaction ledger + VietQR top-up + driver withdrawal requests (admin-confirmed, no automated payout).
7. **Payment QR**: must be **standards-compliant VietQR** (EMVCo/NAPAS), generated via the official VietQR.io API — not hand-rolled encoding, not a decorative placeholder. Confirmed via `vietqr.io` docs (2026-09-05):
   - Free, no-auth **Quick Link**: `https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>` — works immediately, zero setup.
   - Registered **v2/generate API** (`POST https://api.vietqr.io/v2/generate`, needs free `x-client-id`/`x-api-key` from "My VietQR"): returns `qrCode` (raw EMVQR text, standards-compliant) and `qrDataURL` (base64 image) — preferred for backend-driven generation without hotlinking a third-party image host at request time.
   - **Decision:** implement `VietQrPaymentProvider` against the v2/generate API (server-side, so `qrCode`/`qrDataURL` can be persisted on `PaymentIntent.qrPayload`), with the Quick Link URL as a zero-config fallback if `VIETQR_CLIENT_ID`/`VIETQR_API_KEY` env vars are unset — so the feature works before the account is registered.

## 2. Phase roadmap

| Phase | Scope | Est. days | PRD-mandated? |
|---|---|---|---|
| 0 | Cleanup: remove orphaned auth screens, consolidate address storage | 0.5 | supporting |
| 1 | Profile: edit name/avatar/email, real KYC document view | 1.5 | yes |
| 2 | Order creation: multi-stop UI, cargo photo/video, loading-assistance flag, per-order contact phone | 2 | yes |
| 3 | Mobile tracking wired to the real WebSocket gateway | 1.5 | yes |
| 4 | Chat: new WebSocket gateway + mobile wiring | 2 | yes (part of "theo dõi real-time") |
| 5 | VietQR payment + full wallet (customer & driver) + email receipt | 2.5 | yes (QR/COD part) |
| 6 | In-app notifications (DB-backed) | 1 | yes |
| 7 | Promotions (promo codes) | 1 | team addition |
| 8 | Report/Review/Settings persistence, driver history/performance from real data | 1 | team addition |
| 9 | Seed data expansion for all new features | 0.5 | supporting |

Each phase is implemented as its own `docs/superpowers/plans/YYYY-MM-DD-<phase>.md` plan, generated just before that phase starts (requirements may shift; a plan written today for Phase 8 would likely be stale by the time we get there). Phase 0+1 plan is written now: `docs/superpowers/plans/2026-09-05-phase0-cleanup-phase1-profile.md`.

## 3. Cross-cutting architecture notes (apply to every phase)

- **Mobile HTTP client**: `apps/mobile/src/api/http-client.ts` — `httpClient.get/post/postForm/put/patch/delete`, auto-attaches bearer token + auto-refreshes on 401. All new API calls go through this, never raw `fetch`.
- **Backend auth**: `@UseGuards(AccessTokenGuard, RoleGuard)` + `@RequireRoles('DRIVER'|'CUSTOMER')` + `@CurrentUser() actor: AuthenticatedActor` — established pattern in every controller (`drivers.controller.ts`, `orders` controllers). New controllers follow it.
- **Error handling**: `DomainError(code, httpStatus, vietnameseMessage)` thrown from services, caught by `@UseFilters(ApiExceptionFilter)` at the controller. Never throw raw `Error` from a service.
- **File uploads**: multipart via `@UseInterceptors(FileInterceptor('file'))`, validated with `image-validation.ts` (`detectImageMime`, `isAllowedImageMime`, `MAX_IMAGE_SIZE_BYTES`), stored via `StorageProvider.put(key, buffer, mime)` (local disk in dev, S3 in prod — already abstracted, do not touch `storage.provider.ts`). Video support (Phase 2) needs a new `video-validation.ts` sibling — do not bolt video handling onto `image-validation.ts`.
- **Realtime**: Socket.IO gateways, one per domain (`tracking.gateway.ts` today, `chat.gateway.ts` in Phase 4), JWT-authenticated at handshake, each broadcasting to a room scoped by `orderId`.
- **Migrations**: every schema change is a new file under `apps/api/prisma/migrations/`, applied via `prisma migrate dev`. Never hand-edit `schema.prisma` without a matching migration.
- **Seed data**: `apps/api/prisma/seed.ts` reads `infra/seed/demo-manifest.json` — new demo rows (promo codes, notifications, chat threads, wallet balances) are added to the manifest, not hardcoded in `seed.ts`.

## 4. Phase 1 architecture (Hồ sơ cá nhân) — detailed, since its plan is written now

**Already real, no work needed:**
- `PATCH /users/me` (`users.controller.ts` → `users.service.ts#completeProfile`) already accepts and persists `name`, `email`.
- `GET /me` (`auth.controller.ts` → `authService.getCurrentUser`) already returns `name`, `email`, `phone`, `role`, `status`.
- `GET /driver/documents` (`drivers.controller.ts` → `driver-document.service.ts#listMyDocuments`) already returns real KYC documents with signed read URLs (`{id, type, contentType, url, createdAt}`) — **the backend is real; `DriverKycScreen.tsx` just isn't calling it.**
- `POST /driver/documents` already accepts new KYC document uploads.
- `GET /driver/application` returns `{status, vehicleType, licensePlate, licenseNumber, submittedAt, reviewedAt, rejectionReason}` — usable for the driver profile header (vehicle info) instead of the current hardcoded `"Xe tải 1 Tấn · 29H-123.45"`.

**Gap — avatar upload:** `User.avatarMediaId` exists in the schema but has no working upload path: `MediaObject.orderId` is a required FK, so a `MediaObject` cannot represent a user avatar (which isn't tied to any order). Rather than relax `MediaObject.orderId` to optional (risky — touches every order-media query), add two new dedicated columns directly on `User`:

```prisma
model User {
  // ...existing fields...
  avatarMediaId     String?  @db.Uuid   // legacy/unused column, leave in place, do not migrate data into it
  avatarStorageKey  String?  @db.VarChar(500)
  avatarContentType String?  @db.VarChar(100)
}
```

New endpoint `POST /users/me/avatar` (multipart, `FileInterceptor('file')`) in `UsersController`, implemented in a new `AvatarService` that mirrors `DriverDocumentService.uploadDocument` exactly (mime detection, size limit, checksum, `storage.put`, then `prisma.user.update`). `GET /me` response gains `avatarUrl: string | null`, resolved via `storage.createReadUrl(avatarStorageKey)` when set.

## 5. Self-review

- Placeholder scan: none — every phase has a concrete PRD/decision-conversation anchor; no "TBD" left.
- Internal consistency: Phase 1's avatar design deliberately avoids touching `MediaObject` (used elsewhere for order cargo/proof) — no contradiction with Phase 2's video-support extension of the *same* `MediaObject`/`image-validation.ts` path (Phase 2 extends `MediaType` with `CARGO_VIDEO` and adds a sibling `video-validation.ts`, untouched by Phase 1).
- Scope check: this document intentionally stays at roadmap depth for Phases 2-9; each gets a fresh spec-level review right before its plan is written, per §2.

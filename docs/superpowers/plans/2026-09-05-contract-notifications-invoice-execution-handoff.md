# Contract, Notifications, and Invoice — Plan Review & Execution Handoff

> **Prepared:** 2026-09-05  
> **Companion plans:** [driver contract](2026-09-05-driver-contract-signing-plan.md), [notifications](2026-09-05-notifications-plan.md), [VAT invoice](2026-09-05-vat-invoice-plan.md)

## Handoff outcome

The three plans are ready to execute as three vertical slices, with shared work deliberately isolated. No application code was changed while preparing this handoff. The workspace already contains unrelated/uncommitted implementation work; executors must preserve it and rebase their plan steps on the actual current diff rather than reverting it.

## Recommended execution order

1. **Shared PDF foundation + driver contract:** add `PdfModule` once, then deliver the contract migration/API/mobile flow. This validates PDF rendering, private storage, and document cleanup before invoices depend on them.
2. **Notifications durable inbox and Socket.IO:** deliver persistence, REST, socket fan-out, and mobile inbox before FCM. Wire post-commit order/payment triggers only after the storage/transport tests pass.
3. **Invoice provider and payment hook:** add the invoice schema/providers/API/mobile access, importing the shared PDF module. Wire the post-commit invoice path and then payment notification.
4. **Push activation and integrated UAT:** activate FCM only after the token decision/configuration is complete. Run cross-feature tests: payment → invoice → email state → notification → customer order/inbox.

Keep ownership non-overlapping if work is parallel:

| Workstream | Owns | Must not independently edit |
| --- | --- | --- |
| Contract | `apps/api/src/pdf/`, driver contract service/routes/schema migration, driver registration | payment/invoice/notification modules |
| Notifications | `apps/api/src/notifications/`, socket constants/gateway, notification mobile feature | PDF renderer and payment implementation details |
| Invoice | `apps/api/src/invoices/`, invoice schema migration, invoice customer-order projection | PDF internals and notification event transport |
| Integrator | `app.module`, cross-module DI, event/wiring conflicts, shared docs, full regression | domain internals without owner coordination |

## Plan self-review

| Review area | Result | Resolution captured in plan |
| --- | --- | --- |
| Cross-feature PDF duplication | Pass with dependency | One `PdfModule`; invoice imports it, never a driver service or second renderer. |
| Contract preview versus personalised evidence | Ambiguity resolved | Preview streams a generic authenticated v1 PDF; only submitted applications store personalised signed PDFs. |
| Storage/database atomicity | Risk addressed | Do external object work outside DB transactions, use best-effort deletion on failed persistence, and delete superseded evidence only after commit. |
| Notification delivery ordering | Pass with constraint | Persist before socket/FCM; transport failure is isolated. Domain-trigger events are post-commit. |
| FCM token type | **Decision required** | Expo token and FCM token are incompatible. Choose Firebase Web Messaging (dep `firebase` already present) with VAPID/service worker or defer push with `FCM_ENABLED=false`. |
| Manual payment → invoice failure | **Decision required** | Choose durable issuance outbox/retry (recommended) or explicit synchronous replay retry; current spec has no recovery after a post-commit PDF/storage failure. |
| Invoice number concurrency | Risk addressed | Use transactional sequence, not `max(invoiceNumber)`. |
| Invoice money source | Risk addressed | Use `PaymentIntent.amountVnd` (non-null, snapshotted) as the authoritative amount; `Order.priceVnd` is nullable and must not be the primary input. |
| Order event recipient gap | Resolved | `OrderStatusChangedEvent` carries no `customerId`/`driverId`; trigger looks the order up after the event (option b) to keep personal data off the bus. |
| `AcceptOrderService` publish gap | Resolved | It currently injects no publisher; add injection + post-commit accepted event, and deduplicate against the generic status event. |
| Notification type case mismatch | Resolved | Backend enum is uppercase, mobile union is lowercase; the adapter maps server → mobile under test. |
| Env example + schema wiring | Corrected | Env example lives at repo root (no `apps/api/.env.example`); new keys must be added to both the zod schema and the `parseEnv(...)` object literal. |
| Authorization/privacy | Pass with tests required | All contract/invoice/notification reads are actor-scoped; other-user reads return 404 and responses never contain storage keys or provider secrets. |
| Documentation drift | Work queued | API/data/architecture/UI/config docs updated in each plan's final phase. |

## Decisions needed before the marked phases begin

1. For the PWA push feature, approve Firebase Web Messaging plus a public VAPID key/service worker, or explicitly defer FCM in this release.
2. For automatic invoice reliability, approve a durable issuance outbox/retry mechanism, or accept the documented pilot fallback of retrying issuance on idempotent confirmation/read paths.
3. Provide/approve the final Vietnamese contract legal text before `v1` is rendered and released. The plan fixes the data/evidence behaviour, not legal wording.

## Shared acceptance journey

1. A customer completes all driver information, opens contract v1, checks consent, types their name, and submits. The user becomes pending only after contract evidence is persisted; an admin can view the signed PDF and an unrelated user cannot.
2. An assigned driver changes order status. The customer receives one durable `ORDER` notification while connected or sees it after refresh; another user cannot read it.
3. An admin confirms a payment. Exactly one invoice is issued for that payment/order, the customer can view it, email delivery state is truthful and retryable, and the customer receives at most one payment notification.
4. API test/typecheck/lint and mobile test/typecheck/lint pass, then the customer/driver flows are manually checked at the required 360 px viewport and in the PWA auth state.

## Execution evidence to attach to the eventual PR

- Migration names and `prisma migrate deploy`/real-DB verification output.
- Focused service, controller/e2e, socket, provider, and mobile test commands/results.
- Sanitized screenshots or recording of contract consent, notification live/reconnect state, and invoice view/email retry state.
- Configuration evidence showing providers are safely gated, without including service-account, SMTP, VAPID, signed URL, or user-email secrets.
- Final diff review confirming no unrelated dirty-worktree changes were absorbed.


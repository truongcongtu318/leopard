# Continuation Prompt — VAT Invoice + Email Delivery execution

> **Prepared:** 2026-09-08, for the next session to pick up cold. Read this whole file
> before touching anything — it is the complete state needed to resume without
> re-deriving context. This is the THIRD and FINAL feature in a 3-feature execution
> sequence; the first two (Driver Contract Signing, Notifications) are fully shipped
> on this same branch.

## What this is

Executing `docs/superpowers/plans/2026-09-05-vat-invoice-plan.md` via the
`superpowers:subagent-driven-development` skill, per the overall task framing in
`docs/superpowers/plans/2026-09-05-execution-prompt.md`. This is feature 3 of 3 in that
execution prompt (Driver Contract Signing → Notifications → **VAT Invoice + Email**).

Working directly on branch `feature/mobile-profile-media-payment` (no git worktree —
see Ruling below). Repo root: `D:\leopard`.

## Governing documents (read in this order if you need to re-derive anything)

1. `docs/superpowers/plans/2026-09-05-execution-prompt.md` — top-level task framing,
   section 5 has the binding cross-feature technical constraints (immutability,
   ≤800-line files, ≤50-line functions, ≤4-level nesting, TDD, no placeholders,
   Vietnamese `DomainError` messages, no secret/PII/storage-key leakage)
2. `docs/superpowers/specs/2026-09-05-vat-invoice-design.md` — design spec (already
   read this session; content matches what's summarized below, re-read if anything
   here seems ambiguous)
3. `docs/superpowers/plans/2026-09-05-vat-invoice-plan.md` — the execution plan (Phase
   0 + Phases 1-5 = the task breakdown below)
4. `docs/superpowers/plans/2026-09-05-contract-notifications-invoice-execution-handoff.md`
   — cross-plan handoff, ownership boundaries, the original plan self-review

All technical claims in these docs were spot-checked against the live codebase earlier
in this effort (package names, versions, missing deps) and were accurate as of the
start of this whole 3-feature effort. Re-verify the specific claims below, since this
session picks up after ~14 commits of prior work on the same branch.

## Decisions already made by the human partner (binding — do not re-ask)

1. **Invoice issuance retry (Phase 0 of THIS plan):** the human chose
   **Option 2, "Smaller pilot alternative"** — run `ensureInvoice` synchronously after
   the payment-confirmation transaction commits; every `PAID_MANUAL` idempotent/replay
   read path calls it again when no invoice exists; the API returns payment success
   while structured logs/operations surface the retry requirement. **Not** the durable
   outbox/worker option. This decision was made in the same conversation that decided
   Notifications' FCM approach (Firebase Web Messaging) and the driver-contract legal
   text approach — all three were asked together via one `AskUserQuestion` call near
   the start of this effort.
2. **Contract v1 legal text / FCM Web Messaging:** irrelevant to this plan (those were
   for the other two features, already shipped) — mentioned only so you know the
   pattern: this plan's Phase 0 decision was asked and answered the same way.
3. **Execution mode:** one feature at a time; the human wants to keep testing directly
   on `feature/mobile-profile-media-payment` — **no merge to `main`** is happening as
   part of this work. Continue committing directly to this branch.
4. **Final whole-branch review model:** use `sonnet` (see Ruling below — opus/haiku are
   both unavailable in this environment; do not waste a dispatch discovering this
   again).

## Setup rulings (carried from the first two plans on this branch — still apply)

- **Ruling: No git-worktree isolation.** The branch has ~180-190+ pre-existing,
  unrelated, uncommitted files (a driver-location feature, a PayOS payment
  integration, a dispatch-offer realtime feature, a session-role-preservation change)
  that must be preserved untouched, never reverted, never absorbed into this plan's
  commits. Executing directly on `feature/mobile-profile-media-payment`.
- **Ruling: This plan is phase-numbered ("Phase 0..5"), not "Task N"-numbered.**
  Phase 0 is a decision-gate already resolved (see above) — fold its resolution into
  Task 1's brief as context; it does not get its own dispatch. Task mapping:
  **Task 1 = Phase 1, Task 2 = Phase 2, Task 3 = Phase 3, Task 4 = Phase 4,
  Task 5 = Phase 5.**
- **Ruling: model ceiling in this environment is `sonnet`.** `haiku` and `opus` both
  return `model_not_found` (confirmed multiple times across both prior plans on this
  branch). Use `sonnet` for every dispatch — implementer, task reviewer, scoped
  re-review, and the final whole-branch review. Don't waste a round rediscovering this.
- **Ruling: commit-hygiene contamination is a recurring, real risk on this branch —
  not a one-off.** Across the first two plans, THREE separate incidents happened where
  an implementer's `git add`/commit accidentally swept in someone else's unrelated,
  pre-existing uncommitted work sitting in the same file:
  1. Contract plan Task 1: `schema.prisma`'s `payosOrderCode` field got committed
     alongside a legitimate schema change. Fixed by amending the commit to remove it,
     restoring it as an uncommitted working-tree change.
  2. Notifications plan Task 1 (fix round 1): fixing `database-schema.spec.ts` swept
     in 4 lines of someone else's unrelated fixes to the same file (a `UserStatus`
     enum expansion, a `.env`-fallback rewrite, a PostGIS regex change, an
     operational-values count change). Caught by the controller, not the task
     reviewer; fixed with a second commit that reconstructed the file from the true
     base plus only the 3 legitimate lines, letting `git status` show the 4 unrelated
     lines as dirty again.
  3. Notifications plan Task 4: `useNotificationsBootstrap.ts` took a live, unmocked
     import dependency on `apps/mobile/src/api/socket-client.ts` — a file that has
     **never been committed anywhere in this repo's history** and belongs to other
     in-progress work. This is the *inverse* failure mode (depending on missing code
     instead of including unwanted code) and is just as real a build-breakage risk.
     Fixed by building a locally-owned socket factory instead.
  **Every task brief you write for this plan must explicitly list the specific
  dirty/seam files that task touches (see the pre-flight table below) and mandate:
  `git diff <file>` before editing, careful partial staging (`git add -p` or manual
  `git hash-object`/`update-index --cacheinfo` when a file has two genuinely
  independent hunks) before committing, and — for any file the task did NOT
  previously know was dirty — a check that nothing it depends on is itself
  uncommitted/untracked.** The controller (you) must independently re-verify every
  implementer's contamination claim by actually running `git diff <base>..<head> --
  <file>` yourself before trusting a report — this has caught real bugs twice already
  that the automated per-task reviewer missed the first time.
- **Ruling: a known, already-flagged, already-owned issue exists and is NOT yours to
  fix:** Task 2 of the Notifications plan introduced a route-scoped JSON body-parser
  middleware (`apps/api/src/common/json-body-limit.middleware.ts`) that causes ~10
  pre-existing `*.e2e-spec.ts`/`*.integration-spec.ts` files (any that import the full
  `AppModule` and call `moduleFixture.createNestApplication()` with no `bodyParser`
  option) to hang forever on any POST/PATCH JSON route. **Production is unaffected**
  (`main.ts` correctly passes `bodyParser: false`). The human already spawned a
  separate session to fix this (background task chip, confirmed accepted). If you
  write a NEW e2e/integration spec in this plan, follow the pattern already used by
  `apps/api/src/drivers/driver-contract.e2e-spec.ts` (or the newer
  `apps/api/src/notifications/*.integration-spec.ts` file) — pass
  `moduleFixture.createNestApplication({ bodyParser: false })` explicitly — but do NOT
  go fix the other ~10 pre-existing broken files; that's someone else's session.

## Current branch state (verify with `git log`/`git status` before trusting this — it was accurate as of session end)

- **HEAD:** `f3671b6f6274207fe34c1f5d6e04840cb2a43aeb`
- **Branch:** `feature/mobile-profile-media-payment`
- Prior 14 commits on this branch (from `49a9f56`, the state before this whole
  3-feature effort started) delivered: Driver Contract Signing (4 tasks, ends at
  `c52c6c3`) then Notifications (5 tasks, ends at `f3671b6`). Both plans' final
  whole-branch reviews came back clean ("Ready to merge: Yes" for Notifications;
  Driver Contract Signing had one residual item — the e2e-hang issue above — already
  addressed as "someone else's session, not blocking this branch's own correctness").
- `git status --porcelain | wc -l` was **178** at session end. Do not be alarmed by
  this number changing slightly session to session (other people's WIP moves) — what
  matters is that YOUR commits never reduce or absorb any of it.

## Pre-flight: seam-file dirty-state check (done this session — re-verify before dispatching Task 1, state may have shifted)

The plan's own "Current seams" table names these files; checked `git status --porcelain`
and `git diff --stat` on each before writing this handoff:

| File | State at session end | Note |
|---|---|---|
| `apps/api/src/payments/payments.service.ts` | dirty (+3/-0) | small; unrelated PayOS work (`payosOrderCode` handling in `createPaymentIntent`) — this plan's Task 3 (payment integration) touches this file too, isolate carefully |
| `apps/api/src/payments/payments.module.ts` | dirty (+27/-4) | larger; PayOS provider DI wiring (`PaymentsWebhookController`, `PayOsPaymentProvider` factory) — this plan's Task 3 needs to inject `InvoiceIssuancePort` here, isolate carefully |
| `apps/api/package.json` | dirty (+5/-1) | likely the `@payos/node` dependency addition — this plan's Task 1 needs to ADD `nodemailer` (not yet installed) to this same file; be careful not to touch the PayOS dependency lines |
| `apps/mobile/src/features/customer/orders/CustomerOrderDetailRuntime.tsx` | dirty (+76/-5) | substantial pre-existing unrelated change (likely tracking/dispatch-related) — this is the EXACT file this plan's Task 4 needs to extend with `invoice: null \| InvoiceView`; this is the highest-risk file in this plan for a repeat contamination incident, budget extra care |
| `apps/api/src/pdf/pdf.service.ts` | clean, committed | **only exposes `renderContract(input: ContractPdfInput): Promise<Buffer>`** — see "PdfService gap" below, this plan's Task 1 must extend it |
| `.env.example` (repo root) | clean, committed | already has `INVOICE_PROVIDER`/`MAIL_PROVIDER`/etc. keys from the Notifications plan's `FCM_ENABLED` addition — this plan's Task 1 needs to ADD the invoice/mail keys alongside, additively |
| `apps/api/.env` (real local env, NOT committed, gitignored) | **already seeded** with real SMTP credentials (`MAIL_PROVIDER=smtp`, `SMTP_HOST=smtp.gmail.com`, a real `SMTP_USER`/`SMTP_PASS` app password, `MAIL_FROM`, `INVOICE_PROVIDER=self`, `ALLOW_CONSOLE_MAIL_PROVIDER=false`) | **NEVER read this file's contents into a dispatch prompt, a report, a log message, or print it to any output a reviewer/report will surface.** It's real, not a placeholder — the malformed `MAIL_FROM="Leopard App" <email>` line already broke `docker compose`'s env parser once this session (worked around with plain `docker run` instead of touching `.env`). This means `MAIL_PROVIDER=smtp` is ALREADY live locally — if you run the API against this `.env`, a real email could actually send. Prefer `ConsoleMailProvider` for automated test runs where possible, and treat any manual verification step involving real SMTP as something to flag for the human, not run yourself. |

## PdfService gap (important — Task 1 of THIS plan must resolve this)

`apps/api/src/pdf/pdf.service.ts` currently only exposes:
```ts
@Injectable()
export class PdfService {
  renderContract(input: ContractPdfInput): Promise<Buffer> {
    return renderContractPdf(input);
  }
}
```
This was built for the driver-contract feature and is intentionally narrow
(`ContractPdfInput` has contract-specific fields: party details, signature, sections).
The invoice plan's own text says: *"The PDF module from the contract plan is a shared
prerequisite... invoices import that module, not driver services/templates... must not
introduce a second PDF library or renderer."* This means Task 1 needs to **extend**
`PdfService` with a new method (e.g. `renderInvoice(input: InvoiceePdfInput)`) backed by
a new `render-invoice-pdf.ts` (mirroring `render-invoice-pdf.ts`'s sibling
`render-contract-pdf.ts` — same pdfkit instance, same embedded Vietnamese-safe Roboto
font setup from `fonts.ts`, same deterministic-rendering discipline: fixed margins,
fixed metadata, `vi-VN`/`Asia/Ho_Chi_Minh` date formatting) — NOT a second pdfkit
`PDFDocument` pipeline, NOT a new font-loading path, NOT a new npm PDF dependency.
Read `apps/api/src/pdf/render-contract-pdf.ts` and `apps/api/src/pdf/pdf.types.ts`
first to understand the exact pattern to mirror before writing the invoice template.

## SDD workspace for this plan (not yet created — first thing to do)

Path once created: `D:\leopard\.superpowers\sdd\2026-09-05-vat-invoice-plan\`
Skill scripts (bash, run from repo root):
```
$HOME/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/subagent-driven-development/{sdd-workspace,task-brief,review-package}
```
Templates in that same directory: `task-reviewer-prompt.md`, `re-review-prompt.md`.
Final-review template: `superpowers:requesting-code-review`'s `code-reviewer.md`
(`.../superpowers/6.3.0/skills/requesting-code-review/code-reviewer.md`).

`task-brief`'s awk extraction expects `# Task N` headings and will NOT match this
plan's `## Phase N` headings — same as both prior plans. **Write each task's brief by
hand** (copy the phase's numbered items + the exact schema/API/contract text quoted
directly from the design spec, plus a "what the prior task already produced" section
and a "global constraints" section) into
`.superpowers/sdd/2026-09-05-vat-invoice-plan/task-N-brief.md`, matching the style of
the completed plans' briefs (no longer on disk — their workspaces were deleted after
each plan finished cleanly — but the pattern is: extract the phase's numbered list
verbatim, quote any exact schema/API contract from the design spec so the implementer
never has to guess a field name, list every known-dirty file the task touches with the
specific line-count/nature warning, and restate the binding global constraints).

## First step: set up the ledger

1. `bash .../sdd-workspace docs/superpowers/plans/2026-09-05-vat-invoice-plan.md`
2. Read the plan once more, confirm no drift from what's summarized in this file.
3. Do the pre-flight conflict scan (task-pair table + task self-consistency table) —
   this plan's phases are fairly linear (schema→service→payment-hook→mobile→docs), so
   the scan should come back clean, but do it and write it down; don't skip the
   ritual just because it's predictable.
4. Write the ledger's first lines with: this plan's base commit (`f3671b6`), the 4
   decisions above, the rulings above (or a pointer back to this file — don't feel
   obligated to re-type all of it, a short "see
   `docs/superpowers/handoffs/2026-09-08-vat-invoice-execution-continuation-prompt.md`
   for full context, rulings, and pre-flight state" is fine as long as you actually
   open and read that file first), and the pre-flight seam-file table above.
5. Write Task 1's brief (Phase 1 — schema, invoice-number sequence, provider
   contracts) and dispatch it.

## Task breakdown reference (do not treat as a substitute for reading the actual plan file)

- **Task 1 (Phase 1):** `InvoiceStatus`/`Invoice`/`InvoiceSequence` schema + migration
  (new timestamped migration, do NOT combine with any other feature's migration — this
  branch already has migrations from both prior plans plus an untracked PayOS one on
  disk); transactional atomic-increment invoice-number sequence (format `LP/YYYY/NNNNNN`
  — decide and document zero-padding); `apps/api/src/invoices/` module skeleton with
  `InvoiceProvider`/`SelfGeneratedInvoiceProvider` (money is `PaymentIntent.amountVnd`,
  a non-null snapshotted Int — NOT `Order.priceVnd`, which is nullable); `MailProvider`/
  `ConsoleMailProvider`/`SmtpMailProvider` (install `nodemailer` + `@types/nodemailer`
  here); `INVOICE_PROVIDER`/`MAIL_PROVIDER`/`ALLOW_CONSOLE_MAIL_PROVIDER`/`SMTP_*`/
  `MAIL_FROM` added to BOTH the zod schema AND `parseEnv(...)`'s object literal in
  `apps/api/src/config/env.schema.ts` (this exact double-location trap already bit a
  fix round in the Notifications plan — the fix was clean there, don't regress) plus
  `.env.example`. Extend `PdfService` per the gap noted above.
- **Task 2 (Phase 2):** `InvoicesRepository`/`InvoicesService.ensureInvoice(orderId,
  paymentIntentId)` — idempotent, returns existing invoice before allocating a new
  number; storage cleanup on failed write (same "upload before transaction, cleanup
  after" discipline used throughout the contract-signing plan); implements the
  resolved Phase 0 decision (synchronous retry-on-replay, NOT a durable outbox);
  `InvoicesController` (3 routes: `GET /invoices/order/:orderId`, `GET
  /invoices/:id/download`, `POST /invoices/:id/send`) with non-disclosing 404s and a
  `MAIL_PROVIDER_FAILED`/502 path that retains the invoice.
- **Task 3 (Phase 3):** narrow `InvoiceIssuancePort` injected into `PaymentsService`
  (touches the already-dirty `payments.service.ts`/`payments.module.ts` — isolate
  carefully), invoked strictly after `confirmPayment`'s transaction commits; both the
  immediate-confirmation and replay paths must obey the synchronous-retry model
  without ever producing two invoice rows/numbers; wires the Notifications plan's
  trigger for a missing-email prompt and (fallback-only, never claims delivery) a
  send-failure case.
- **Task 4 (Phase 4):** `CustomerOrderDetailRuntime.tsx` (the highest contamination
  risk in this plan) gains `invoice: null | InvoiceView`; `CustomerOrderDetailScreen`
  shows "Xem hóa đơn" only when an invoice exists, an email-prompt when
  `emailSentAt` is null, retry after SMTP failure.
- **Task 5 (Phase 5):** docs (API/data/architecture-provider/UI/environment/
  payment-flow — explicitly label the artifact as self-generated, not a legally
  registered e-invoice), targeted test/typecheck/lint, verify all money values are
  integer VND, links expire, no SMTP/PII in fixtures or logs.

## Process reminder (same subagent-driven-development discipline as both prior plans)

Per task: dispatch implementer (sonnet, brief file + report file + dirty-file
warnings) → controller independently verifies (re-run tests yourself, `git diff
<base>..<head>` every touched file yourself, don't just trust the report) → dispatch
task reviewer (sonnet) → if Critical/Important findings, fix loop (resume/fresh
implementer, then a scoped re-review) → mark complete in ledger → next task. After all
5 tasks: final whole-branch review (sonnet, MERGE_BASE = `f3671b6`) → ONE fix wave if
needed → summarize the whole feature for the human partner, collecting every
`Ruling:`/parked-finding line from the ledger verbatim → delete the SDD workspace →
this is the last of the 3 planned features, so the summary should note that and ask
the human what's next (this branch has no PR/merge planned per decision #3 above,
so "what's next" likely means "should I keep testing/refining this, or are we done
with this batch of work").

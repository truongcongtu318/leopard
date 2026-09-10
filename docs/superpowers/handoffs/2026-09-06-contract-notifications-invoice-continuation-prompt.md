# Continuation Prompt — Driver Contract Signing / Notifications / VAT Invoice execution

> **Prepared:** 2026-09-06, mid-session (ran low on tokens). Read this whole file before
> touching anything — it is the complete state needed to resume without re-deriving context.

## What this is

Executing 3 vertical-slice features in sequence via the `superpowers:subagent-driven-development`
skill, per `docs/superpowers/plans/2026-09-05-execution-prompt.md`:

1. **Driver Contract Signing** ← currently in progress (this file's focus)
2. **Notifications** ← not started
3. **VAT Invoice + Email** ← not started

Working directly on branch `feature/mobile-profile-media-payment` (NOT a fresh git worktree —
see Ruling below). Repo root: `D:\leopard`.

## Governing documents (read in this order if you need to re-derive anything)

1. `docs/superpowers/plans/2026-09-05-execution-prompt.md` — top-level task framing
2. `docs/superpowers/specs/2026-09-05-driver-contract-signing-design.md` — design spec
3. `docs/superpowers/plans/2026-09-05-driver-contract-signing-plan.md` — the plan being executed (4 phases = 4 tasks)
4. `docs/superpowers/plans/2026-09-05-contract-notifications-invoice-execution-handoff.md` — cross-plan handoff, ownership boundaries
5. (Later) `docs/superpowers/specs/2026-09-05-notifications-design.md` + `docs/superpowers/plans/2026-09-05-notifications-plan.md`
6. (Later) `docs/superpowers/specs/2026-09-05-vat-invoice-design.md` + `docs/superpowers/plans/2026-09-05-vat-invoice-plan.md`

All technical claims in these docs were independently verified against the live codebase at
session start (package names, Prisma version, missing deps, event payload shapes, etc.) — they
were accurate. No need to re-verify unless something looks stale.

## Decisions already made by the human partner (binding — do not re-ask)

1. **FCM approach (Notifications Phase 0):** Firebase Web Messaging (VAPID + service worker), not deferred.
2. **Invoice issuance retry (VAT Invoice Phase 0):** Synchronous replay-retry pilot (not a durable outbox/worker).
3. **Contract v1 legal text:** Claude drafts structurally-complete, drafting-quality Vietnamese legal
   prose now (not blocked on real legal review) — already done in Task 1, approved by reviewer as
   genuine, non-placeholder prose.
4. **Execution mode:** One feature at a time, stop for the human's review after each feature
   finishes (all its tasks complete + final whole-branch review clean). Do **not** start
   Notifications until Driver Contract Signing is fully done and the human has been shown a summary.

## Setup rulings already made (recorded in the ledger, carry forward)

- **No git-worktree isolation.** The branch has ~141 pre-existing unrelated uncommitted files
  (other in-progress work: a driver-location feature, a PayOS integration touching
  `PaymentIntent.payosOrderCode` in `schema.prisma` + an untracked migration
  `apps/api/prisma/migrations/20260905120000_add_payos_order_code/`). The execution prompt
  requires preserving these, not reverting them. **Every task dispatch must explicitly warn the
  implementer about this** and instruct `git add <specific files>` only, never `git add -A`/`git add .`.
  This bit the process once already (see Task 1 below) — stay vigilant.
- **Plan is Phase-numbered, not Task-numbered.** The skill's `task-brief` awk script (matches
  `# Task N` headings) doesn't apply to these plans. Each Phase = one dispatch unit (Phase 1 =
  Task 1, etc.), and briefs are written by hand into the SDD workspace instead of via that script.
  `review-package` (base/head → diff file) still works normally.
- **Haiku model is unavailable in this environment** (`cc/claude-haiku-4-5-20251001` → 404
  model_not_found). Use `sonnet` for all dispatches, including scoped re-reviews that the skill
  would normally route to a cheap tier.

## SDD workspace for Driver Contract Signing

Path: `D:\leopard\.superpowers\sdd\2026-09-05-driver-contract-signing-plan\`
Ledger: `progress.md` in that directory — **read it in full before doing anything**, it has the
complete history (pre-flight scan, both tasks' verification notes, review findings, rulings).
Briefs/reports/diffs already in that directory:
- `task-1-brief.md`, `task-1-report.md` — Task 1, **complete**
- `task-2-brief.md`, `task-2-report.md` — Task 2, **implemented + reviewed, fix round 1 in progress (see below)**
- `task-3-brief.md` — Task 3, **written, not yet dispatched**
- `task-4-brief.md` — **does not exist yet**, must be written from the plan's Phase 4 before dispatching (docs + verification: update `docs/api/01-rest-api-spec.md`, `docs/data/01-database-design.md`, `docs/ui/03-screen-specs.md`; run the full narrow-gate command list; manual PWA check at 360px)
- `review-49a9f56..2b2d4af.diff`, `review-2b2d4af..84a41cb.diff` — Task 1 review packages (historical, can ignore now)
- `review-84a41cb..17e4b1e.diff` — Task 2's first review package (already reviewed, findings below)

Skill scripts (bash, run from repo root):
`$HOME/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/subagent-driven-development/{sdd-workspace,task-brief,review-package}`
Templates: `{task-reviewer-prompt.md,re-review-prompt.md}` in that same directory (task-brief's
awk extraction doesn't apply to this plan — ignore it, write briefs by hand as already done).

## Task 1 — Contract data + PDF foundation: COMPLETE

- Base `49a9f5655fb46079d16a3fc922be6484df24da7c` → final `84a41cbc1dc716a748efd5e93cf9d64b554a05d0`
  (commit `2b2d4af` then amended to `84a41cb` during fix round 1).
- Delivered: `DriverContract` Prisma model + migration `20260905201500_add_driver_contract`;
  `apps/api/src/pdf/` (`PdfModule`/`PdfService`, pure, Vietnamese-safe Roboto-embedded pdfkit
  renderer); `apps/api/src/drivers/driver-contract-template.ts` (v1 legal content, 6 sections,
  real Vietnamese prose).
- Fix round 1 (1 round, both addressed, re-review clean): removed an accidentally-committed
  unrelated `payosOrderCode` schema field (root cause: the working tree already had that
  unrelated field dirty when this implementer opened `schema.prisma`); added RED-phase TDD
  evidence via temporary stub-and-restore.
- **Nothing further needed for Task 1.**

## Task 2 — Backend contract lifecycle, API, admin: IMPLEMENTED, FIX ROUND 1 IN PROGRESS (uncommitted, interrupted)

- Base `84a41cb` → HEAD is still `17e4b1e` (two commits: `82df6ca` feat, `17e4b1e` fix-import;
  **no new commit yet** — the fix-round-1 agent was killed by the user before committing).
- Original implementation delivered (verified clean, no payos/location contamination):
  `driver-signature.ts` (signature parsing/validation, magic-byte sniffing, never trusts
  declared MIME), `driver-contract.service.ts` (`DriverContractService` — preview, signed
  render, persist, admin projection, cleanup), wired into `driver-application.service.ts`
  (upload-before-transaction, cleanup-on-failure, delete-superseded-after-commit),
  `drivers.controller.ts` (`GET /driver/contract`, `GET /driver/contract/pdf`),
  `admin-driver-review.service.ts` + `admin.controller.ts` (`GET /admin/drivers/:id/contract`).
  Full test/typecheck/lint pass reported (34 suites/320 tests, clean typecheck, 0 lint errors,
  contract test 48/48 unmodified).
- **Task reviewer verdict (round 0): Spec ✅, 0 Critical, 2 Important, 2 Minor (deferred, not blocking):**
  1. **Important #1:** `apps/api/src/main.ts` raised the JSON/urlencoded body-size limit
     globally (100kb → 15mb, for a ~13.4MB base64 signature image on `POST /driver/apply` only).
     Reviewer found `app.module.ts` already uses the Nest `MiddlewareConsumer`/`consumer.apply(...).forRoutes(...)`
     pattern elsewhere in this repo — should scope the larger limit to `POST /driver/apply` only
     (approach a: `NestModule` on `DriversModule` + scoped `express.json({limit:'15mb'})`), not
     widen every route's DoS surface. (Approach b — switch to multipart — was noted as viable
     but riskier: the design spec's `POST /driver/apply` contract expects `signature` as a JSON
     string field, and Task 3's mobile client is being built against that JSON contract, so
     approach (a) is very likely correct; only fall back to (b) if (a) proves infeasible.)
  2. **Important #2:** `DriverContractService.cleanupUploaded()` swallows storage-delete
     failures with **no logging** (`.catch(() => {})`), inconsistent with its sibling
     `deleteSupersededFiles()` which does log per the brief's explicit requirement ("a delete
     failure is logged with contract/profile context"). Must add the same logging.
  - Minor (deferred, non-blocking, already ledgered): wrongly-*typed* `contractAccepted`/`signature`
    hits generic `VALIDATION_ERROR` before the domain check (still 422, only the `code` differs);
    client-side `randomUUID()` for a brand-new applicant's `DriverProfile.id` has a narrow
    theoretical double-submit race (not tested, low likelihood).
- **A fix-round-1 agent was dispatched and was mid-fix when the user killed it** (last visible
  action: "Now let's re-run the e2e test"). **It did NOT commit anything** — HEAD is still
  `17e4b1e`. It left **uncommitted, untested-to-completion working-tree changes** in 8 files:
  ```
  apps/api/src/app.module.ts                          | 15 +++++++-
  apps/api/src/drivers/driver-application.service.spec.ts |  5 ++-
  apps/api/src/drivers/driver-application.service.ts  |  5 ++-
  apps/api/src/drivers/driver-contract.service.spec.ts| 44 +++++++++++++++++++---
  apps/api/src/drivers/driver-contract.service.ts     | 26 +++++++++++--
  apps/api/src/drivers/drivers.controller.ts          | 11 ++++++
  apps/api/src/drivers/drivers.module.ts               | 16 +++++++-
  apps/api/src/main.ts                                 | 16 +++-----
  ```
  (113 insertions, 25 deletions total — a small, reviewable diff.) These are presumed to be an
  in-progress attempt at approach (a) for Important #1 plus the Important #2 logging fix, but
  **this was never confirmed complete or passing** — treat it as an unverified draft, not
  finished work.

### Immediate next steps (in order)

1. `cd D:/leopard && git diff -- apps/api/src/main.ts apps/api/src/app.module.ts apps/api/src/drivers/driver-contract.service.ts apps/api/src/drivers/driver-application.service.ts apps/api/src/drivers/drivers.controller.ts apps/api/src/drivers/drivers.module.ts apps/api/src/drivers/driver-contract.service.spec.ts apps/api/src/drivers/driver-application.service.spec.ts` — actually read this diff (small, ~140 lines) to judge whether the killed agent's approach is sound and complete, before deciding to continue it or discard it (`git checkout -- <those files>` to discard cleanly, since none of it is committed).
2. **Do NOT touch** the other currently-dirty files in the same `git status` output that are NOT
   in the list above — `drivers.repository.ts`, `drivers.service.ts`,
   `dto/update-driver-location.dto.ts`, `update-location.e2e-spec.ts`, and `schema.prisma`
   (payosOrderCode) are pre-existing unrelated work; leave them exactly as found.
3. If the draft looks sound: finish it (verify `MiddlewareConsumer` actually scopes to
   `POST /driver/apply` only and every other route keeps the small default; verify
   `cleanupUploaded` now logs on delete failure with profile/contract context, never throws),
   run `pnpm --filter api test`, `pnpm --filter api typecheck`, `pnpm --filter api lint`, then
   commit (amend `17e4b1e` or a new `fix:` commit — controller's call).
4. If the draft looks wrong/incomplete: discard it and dispatch a fresh fix-round-1 implementer
   from scratch. The exact dispatch prompt used (findings verbatim, constraints, report-file
   path) is reconstructable from this file's "Important #1/#2" text above plus
   `task-2-report.md`'s existing content — do not need to re-derive from the design docs.
5. Either way: generate a scoped review package
   (`bash $HOME/.claude/plugins/cache/claude-plugins-official/superpowers/6.3.0/skills/subagent-driven-development/scripts/review-package docs/superpowers/plans/2026-09-05-driver-contract-signing-plan.md 17e4b1e <new-head-sha>`)
   and dispatch a scoped re-reviewer (template `re-review-prompt.md`, model `sonnet` — haiku is
   unavailable here) against the 2 Important findings verbatim.
6. If re-review comes back clean: ledger `Task 2: complete (commits 84a41cb..<final-sha>, review
   clean after 1 fix round)`, then dispatch **Task 3** (brief already written at
   `task-3-brief.md` — mobile PWA flow: contract review step in `driver-register.tsx`, consent
   checkbox, typed-name signature, error mapping, pending-state display, test updates).
7. After Task 3: write `task-4-brief.md` from the plan's "Phase 4 — Contracts, documentation,
   and verification" section (`docs/superpowers/plans/2026-09-05-driver-contract-signing-plan.md`
   lines ~79-85), dispatch it, review it.
8. After all 4 tasks are `complete` in the ledger: run the **final whole-branch review** per the
   skill (`review-package PLAN_FILE MERGE_BASE HEAD` where `MERGE_BASE` = the commit before Task
   1 started, i.e. `49a9f5655fb46079d16a3fc922be6484df24da7c`; dispatch
   `superpowers:requesting-code-review`'s `code-reviewer.md` template on the **most capable
   available model**, not sonnet). Fix any findings in ONE batched fix dispatch + one scoped
   re-review, per the skill's rules (no second fix wave — residual findings go to the human).
9. Only then: summarize the whole Driver Contract Signing feature for the human partner (what
   shipped, test evidence, the ledger's "Rulings I made" list — currently: worktree-isolation
   skip, phase-as-task-numbering, placeholder-legal-text authorization — collect every `Ruling:`
   line from the ledger verbatim, do not paraphrase), and **wait for their go-ahead** before
   starting the Notifications plan (per decision #4 above).

## Do NOT do yet

- Do not start the Notifications or VAT Invoice plans — Driver Contract Signing must finish and
  be shown to the human first.
- Do not touch `apps/api/prisma/schema.prisma`'s `payosOrderCode` field/constraint, the untracked
  `20260905120000_add_payos_order_code` migration folder, or the driver-location feature files —
  these belong to other in-progress work on this branch.
- Do not use `git add -A` / `git add .` anywhere in this branch, ever — always stage explicit
  file paths.

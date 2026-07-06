# LEOPARD Codex Instructions

## Project Context

LEOPARD is a 6-week MVP/Demo logistics connection system with three roles:

- Customer creates shipment orders.
- Driver accepts orders, updates delivery status, and sends tracking points.
- Admin monitors users, drivers, orders, tracking, uploads, and payment state.

The approved stack is:

- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- Mobile: Expo React Native, TypeScript.
- Backend: NestJS, Prisma, TypeScript.
- Database: PostgreSQL + PostGIS.
- Realtime: Socket.IO/WebSocket.
- Integrations: Vietmap, Firebase Phone Auth when configured, DigitalOcean Spaces/S3-compatible storage, VietQR/payOS.

## Source Of Truth

Read these before implementation:

1. `docs/srs-leopard-mvp.md`
2. `docs/project/01-product-backlog-user-stories.md`
3. `docs/project/02-system-architecture.md`
4. `docs/project/03-database-design-erd.md`
5. `docs/project/04-api-specification.md`
6. `docs/project/05-ui-flow-screen-spec.md`
7. `docs/workflows/codex-best-practices-for-leopard.md`

If documents conflict, follow this priority:

1. `docs/srs-leopard-mvp.md`
2. `docs/project/*`
3. `docs/workflows/*`
4. Existing code behavior

## Prompt Contract

Every implementation task should include:

- Goal: what to build or fix.
- Context: relevant files/docs/errors.
- Constraints: stack, scope, security, architecture rules.
- Done when: tests/checks/manual behavior required before completion.

If any of those are missing and the task is ambiguous, ask for clarification or create a short plan first.

## Implementation Rules

- Keep tasks small: one story or one vertical slice at a time.
- Do not add features outside MVP scope.
- Do not let frontend own business rules that belong in the backend.
- Enforce role authorization in the API, not only in UI.
- Use provider interfaces for Vietmap, storage, OTP, and payment.
- Use demo providers when real credentials are absent.
- Keep PostGIS usage minimal for MVP.
- Prefer readable, boring code over clever abstractions.

## UI Rules

LEOPARD is operational logistics product UI, not a landing page.

- Avoid AI-purple gradients, glassmorphism, decorative hero sections, and fake marketing cards.
- Prioritize clear forms, status badges, tables/lists, route summary, and map/tracking panels.
- Customer and Driver flows belong in the mobile app (`apps/mobile`).
- Admin flows belong in the web dashboard (`apps/web`).
- Admin can be denser but must remain readable.
- Every main screen needs loading, empty, error, and success states.

## Verification

Run the narrowest relevant checks after each task.

Backend changes:

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api lint
```

Mobile changes:

```bash
pnpm --filter mobile test
pnpm --filter mobile typecheck
pnpm --filter mobile lint
```

Admin web changes:

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
```

Before sprint or release completion:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

If a script does not exist yet, say so and run the closest available verification.

## Review Expectations

Before claiming done, confirm:

- Acceptance criteria pass.
- No P0 bug remains.
- No unauthorized role can access private data.
- Data persists after refresh where relevant.
- Diff does not include unrelated refactors.
- Docs are updated when behavior changes.

## Subagent Rules

Use subagents mainly for:

- Read-heavy exploration.
- Independent review passes.
- Test/log analysis.
- UI review.
- Security or maintainability review.

Be careful with parallel write-heavy implementation. Do not let multiple agents edit the same files at the same time unless they are isolated in separate worktrees.

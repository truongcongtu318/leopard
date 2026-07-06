# LEOPARD Review and Verification Gates

**Version:** 1.0  
**Date:** 2026-07-06  
**Purpose:** Define mandatory quality gates for each story, sprint, and final handover.

---

## 1. Review Levels

| Level | When | Required Reviewer |
| --- | --- | --- |
| Story Gate | After one story/goal card | Spec Reviewer + Code Reviewer |
| UI Gate | After UI-affecting story | UI/UX Reviewer |
| Sprint Gate | End of each week | Main Agent + Human Reviewer |
| Release Gate | End of Week 6 | Final Verification Agent + Human Reviewer |

---

## 2. Story Gate Checklist

Every story must pass:

- [ ] Acceptance criteria from goal card pass.
- [ ] Related SRS requirements pass.
- [ ] No out-of-scope feature added.
- [ ] API authorization is enforced.
- [ ] Input validation exists.
- [ ] Data persists after refresh when relevant.
- [ ] Error response or UI error state exists.
- [ ] Tests or manual smoke checks were run.
- [ ] Verification output is recorded.
- [ ] No Critical or Important review issue remains.

Story status:

```text
READY_FOR_REVIEW -> SPEC_REVIEW_PASS -> CODE_REVIEW_PASS -> UI_REVIEW_PASS_IF_NEEDED -> HUMAN_ACCEPTED
```

---

## 3. UI Gate Checklist

Use for any Customer, Driver, or Admin screen.

- [ ] Screen follows `docs/project/05-ui-flow-screen-spec.md`.
- [ ] Main action is visually clear.
- [ ] Text is readable.
- [ ] Buttons have enough contrast.
- [ ] Status badges are easy to understand.
- [ ] Loading state exists.
- [ ] Empty state exists.
- [ ] Error state exists.
- [ ] Mobile layout works for Customer/Driver.
- [ ] Admin layout is dense but readable.
- [ ] No generic AI-purple gradient.
- [ ] No marketing hero layout inside the app.
- [ ] No decorative cards that obscure workflow.
- [ ] No fake data is hardcoded when API exists.

Failure rules:

- Missing core action = Critical.
- Broken mobile Customer/Driver flow = Important.
- Minor spacing/copy issue = Minor.

---

## 4. Backend Gate Checklist

Use for API/database/business logic stories.

- [ ] Endpoint matches `docs/project/04-api-specification.md`.
- [ ] DTO names and fields are consistent.
- [ ] Role guard exists.
- [ ] Ownership rule exists.
- [ ] Invalid input is rejected.
- [ ] Business rule is tested.
- [ ] Prisma schema matches DB design.
- [ ] No plaintext secrets.
- [ ] Provider fallback works when credentials are absent.

Critical backend failures:

- Wrong user can access private data.
- Driver can update unassigned order.
- Customer can see another customer's order.
- Admin endpoint accessible to non-admin.
- Order can be accepted twice.
- More than 3 stops can be saved.

---

## 5. Sprint Gate Checklist

### Week 1 Gate

- [ ] Monorepo structure exists.
- [ ] Local database starts.
- [ ] `.env.example` exists.
- [ ] Shared contracts exist.
- [ ] Scope docs are available.

### Week 2 Gate

- [ ] Demo users can log in through API.
- [ ] Role guard works.
- [ ] Customer can create order through API.
- [ ] Stops limited to 3.
- [ ] Demo map provider returns route data.

### Week 3 Gate

- [ ] Customer can log in through UI.
- [ ] Customer can create order through UI.
- [ ] Route preview appears.
- [ ] Order appears after refresh.
- [ ] Customer mobile flow is usable.

### Week 4 Gate

- [ ] Driver sees requested order.
- [ ] Driver accepts order.
- [ ] Driver updates status.
- [ ] Tracking point is sent and persisted.
- [ ] Customer sees tracking update.

### Week 5 Gate

- [ ] Admin sees users.
- [ ] Admin sees drivers.
- [ ] Admin sees orders.
- [ ] Admin sees full order detail.
- [ ] Image upload works.
- [ ] QR payment demo works.
- [ ] Full local demo flow passes.

### Week 6 Gate

- [ ] Staging web app opens.
- [ ] Staging API works.
- [ ] Demo accounts work on staging.
- [ ] WebSocket works on staging.
- [ ] Full staging demo passes.
- [ ] No P0 bug remains.
- [ ] Handover docs exist.

---

## 6. Required Commands

Run after backend changes:

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api lint
```

Run after frontend changes:

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
```

Run before sprint completion:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

If a package does not yet have one of these scripts, the agent must either:

- add the script as part of foundation work, or
- report that the script is unavailable and provide the closest verification command.

---

## 7. Manual Demo Verification

Run this before final release:

```text
1. Open web app.
2. Log in as Customer.
3. Create order with pickup, dropoff, one stop, vehicle type, and notes.
4. Confirm route distance, ETA, and price.
5. Submit order.
6. Log out.
7. Log in as Driver.
8. Open available orders.
9. Accept the created order.
10. Update status to PICKING_UP.
11. Send simulated tracking point.
12. Log out.
13. Log in as Customer.
14. Open order detail.
15. Confirm status and tracking point.
16. Create QR payment.
17. Log out.
18. Log in as Admin.
19. Open order detail.
20. Confirm customer, driver, route, stops, tracking, image/payment info.
21. Log back in as Driver.
22. Update status to IN_TRANSIT.
23. Update status to DELIVERED.
24. Confirm final status as Customer and Admin.
```

Pass criteria:

- No page crash.
- No server crash.
- Data persists after refresh.
- Role-specific access works.
- Final status is visible.

---

## 8. Bug Severity

### P0 Critical

Blocks final demo or violates security:

- Any required role cannot log in.
- Customer cannot create order.
- Driver cannot accept order.
- Driver cannot update status.
- Admin cannot view orders.
- Staging app cannot start.
- Private data accessible by wrong role.

### P1 Important

Important but workaround exists:

- Browser GPS fails but simulated tracking works.
- S3 upload fails but local upload works for demo.
- Real payment provider fails but demo QR works.
- Admin summary broken but order detail works.

### P2 Minor

Does not block demo:

- Minor spacing issue.
- Minor copy issue.
- Non-critical mobile alignment issue.
- Missing nice-to-have filter.

---

## 9. Release Gate

Final release can be accepted only when:

- [ ] All P0 stories are done.
- [ ] P1 demo-critical stories are done or have approved workaround.
- [ ] All P0 bugs are closed.
- [ ] Final verification commands pass.
- [ ] Full staging demo passes.
- [ ] Known limitations are documented.
- [ ] Handover docs are complete.

Final release must not be accepted when:

- [ ] Staging is not available.
- [ ] Auth is unreliable.
- [ ] Order creation is unreliable.
- [ ] Driver flow is unreliable.
- [ ] Admin cannot inspect order.
- [ ] Role authorization is broken.


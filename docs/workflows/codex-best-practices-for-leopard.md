# Codex Best Practices For LEOPARD

**Version:** 1.0  
**Date:** 2026-07-06  
**Sources:** Official OpenAI Codex docs:

- https://developers.openai.com/codex/learn/best-practices
- https://developers.openai.com/codex/prompting
- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/concepts/subagents
- https://developers.openai.com/codex/app/worktrees
- https://developers.openai.com/codex/skills

---

## 1. What Was Confusing Before

The previous workflow was too heavy:

- Too many files before implementation.
- Too many agent roles for every small task.
- Too much ceremony around sprint execution.
- Risk of giving agents broad context instead of focused task context.
- Risk of parallel agents editing overlapping files.

Codex works better when the workflow is smaller:

```text
One source of truth -> one small task -> one implementation -> one verification -> one review -> next task
```

---

## 2. Official Codex Pattern To Follow

Every task prompt should include four parts:

```text
Goal:
What should change or be built?

Context:
Which docs, files, folders, errors, or examples matter?

Constraints:
Which stack, architecture, scope, security, or UI rules must be followed?

Done when:
Which tests, checks, or user-visible behavior prove completion?
```

Use this instead of vague prompts like:

```text
Build the customer feature.
```

Use this:

```text
Goal:
Implement Customer order creation mobile UI.

Context:
- docs/srs-leopard-mvp.md
- docs/project/01-product-backlog-user-stories.md, STORY-ORD-001
- docs/project/04-api-specification.md, POST /orders
- docs/project/05-ui-flow-screen-spec.md, Customer Create Order

Constraints:
- Expo React Native + TypeScript.
- No new scope beyond Customer order creation.
- Max 3 stops.
- Use existing API client.
- Show loading, validation error, and submit error states.

Done when:
- Customer can create order with pickup, dropoff, 0-3 stops, vehicle type, and notes.
- 4th stop is blocked.
- Created order appears after refresh.
- `pnpm --filter mobile typecheck` and `pnpm --filter mobile lint` pass.
```

---

## 3. Use `AGENTS.md` For Durable Rules

Do not paste the same long instructions every time. Put stable project rules in `AGENTS.md`.

`AGENTS.md` should stay short and practical:

- Repo layout.
- Approved stack.
- Source-of-truth docs.
- How to run tests.
- Engineering conventions.
- Done definition.
- Do-not rules.

When Codex makes the same mistake twice, update `AGENTS.md` with one short rule.

Do not turn `AGENTS.md` into a giant SRS. Link to docs instead.

---

## 4. Use Plan Mode Before Ambiguous Work

Use planning before implementation when:

- The task affects multiple modules.
- Requirements are fuzzy.
- Data model may change.
- The work touches auth, payment, tracking, or deployment.
- You are unsure how to split the task.

Plan output should be short:

```text
1. Files to inspect
2. Implementation steps
3. Verification commands
4. Risks / questions
```

Do not plan forever. Once the scope is clear, implement one small slice.

---

## 5. Task Size Rule

Good Codex task size:

- One endpoint.
- One screen.
- One business rule.
- One integration provider.
- One bug.
- One review pass.

Too large:

- "Build all Customer features."
- "Implement backend."
- "Finish week 3."
- "Make the UI beautiful."

Better split:

```text
1. Implement POST /orders.
2. Implement GET /orders/my.
3. Implement Customer order list UI.
4. Implement Customer create order UI.
5. Implement route preview.
```

---

## 6. Subagent Rules

Use subagents when the work is independent and bounded.

Good subagent use:

- One agent reviews security.
- One agent reviews missing tests.
- One agent reviews UI polish.
- One agent explores map provider docs.
- One agent summarizes failing logs.

Risky subagent use:

- Three agents all editing backend files.
- One agent changes DB while another changes API contract.
- Multiple agents implement overlapping UI flows.

Rule:

```text
Parallel subagents are best for read-heavy work and review.
Write-heavy parallel work needs separate worktrees or strict file ownership.
```

---

## 7. Worktree Rule

Use Worktree mode when:

- Running an experimental approach.
- Letting Codex work in the background.
- Running two implementation tasks in parallel.
- You want isolation from your current local checkout.

Use Local mode when:

- You need to run the existing dev server.
- You want direct IDE/browser inspection.
- The task is small and touches the current branch.

Never let two active threads edit the same files in Local mode.

---

## 8. Verification Is Part Of The Task

Do not accept "implemented" without evidence.

Every agent response should include:

```text
Verification:
- Command: ...
- Result: ...
```

If verification cannot run:

```text
Verification not run:
- Reason: script does not exist / dependency missing / server unavailable
- Closest check run: ...
```

For LEOPARD:

Backend:

```bash
pnpm --filter api test
pnpm --filter api typecheck
pnpm --filter api lint
```

Frontend:

```bash
pnpm --filter web test
pnpm --filter web typecheck
pnpm --filter web lint
```

Full:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

---

## 9. Review Loop

Use this review loop:

```text
Implement -> verify -> spec review -> code review -> UI review if needed -> human demo review
```

But do not overdo it for tiny changes.

Minimum review:

- Spec check for every feature.
- Code review for risky backend/auth/data changes.
- UI review for every visible screen.
- Human review at sprint gate.

---

## 10. Best Workflow For LEOPARD

Use this weekly rhythm:

```text
Monday:
Pick 3-5 small goals from the sprint.

Daily:
Run one focused Codex task at a time.

After each task:
Verify and review.

End of week:
Run sprint demo gate.
Update docs only if behavior changed.
```

Recommended sequence:

```text
Week 1: Foundation, AGENTS.md, repo setup, DB setup.
Week 2: Auth, role guards, Prisma schema, order API, map provider.
Week 3: Customer login/order UI.
Week 4: Driver accept/status/tracking.
Week 5: Admin, upload, payment.
Week 6: Deploy, UAT, bug fixes, handover.
```

---

## 11. UI/UX Best Practice For Codex On This Project

Do not prompt:

```text
Make the UI beautiful.
```

Prompt:

```text
Review this screen as an operational logistics product UI.

Context:
- docs/project/05-ui-flow-screen-spec.md

Constraints:
- No AI-purple gradients.
- No marketing hero.
- No decorative cards everywhere.
- Use clear forms, status badges, map panels, route summary, and tables.
- Customer and Driver must be mobile usable.

Done when:
- Critical UI issues are listed.
- Concrete fixes are provided.
- The screen feels like a real logistics product, not an AI template.
```

---

## 12. Correct Agent Prompt Template

Use this exact template for implementation:

```text
Goal:
[one small story or goal]

Context:
- [specific docs sections]
- [specific files]
- [error logs if any]

Constraints:
- [stack]
- [scope limits]
- [security/authorization rules]
- [UI rules if relevant]

Done when:
- [behavior]
- [tests/checks]
- [manual verification]

Return:
STATUS: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED

Implemented:
- ...

Verification:
- Command: ...
- Result: ...

Files changed:
- ...

Risks:
- ...
```

---

## 13. When Codex Gets Confused

Do this:

1. Stop the current broad task.
2. Ask Codex to summarize what it believes the goal is.
3. Compare with SRS/backlog.
4. Rewrite the task using Goal/Context/Constraints/Done when.
5. Continue with one smaller slice.

Do not keep adding more instructions to a confused thread. Start a fresh thread or use a worktree when context is polluted.

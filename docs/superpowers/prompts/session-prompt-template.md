# LEOPARD Agent Session Prompt Template

```text
You are executing Task {{TASK_ID}}: {{TASK_NAME}} for LEOPARD.

REQUIRED SKILLS
- Use superpowers:using-git-worktrees before implementation.
- Use superpowers:test-driven-development for every behavior change.
- Use superpowers:verification-before-completion before every completion claim.
- Use superpowers:requesting-code-review after scoped verification passes.

MISSION
{{OBJECTIVE_FROM_PLAN}}

BASELINE
- Commit: {{VERIFIED_BASELINE_SHA}}
- Branch: codex/{{TASK_ID_LOWER}}-{{SHORT_NAME}}
- Dependencies verified: {{DEPENDENCY_TASK_IDS}}

SOURCE OF TRUTH
{{EXACT_DOC_PATHS_AND_SECTIONS}}

FILE OWNERSHIP
- Create/modify only: {{EXACT_FILES}}
- Never modify: {{CONTROLLED_SURFACES_AND_OTHER_AGENT_FILES}}

INTERFACES
Consumes:
{{EXACT_INPUT_TYPES_AND_SIGNATURES}}

Produces:
{{EXACT_OUTPUT_TYPES_AND_SIGNATURES}}

EXECUTION
Follow every checkbox in {{PLAN_PATH}} under {{TASK_ID}} in order. Observe the failing test before implementation. Commit only after scoped tests, lint and typecheck pass.

BOUNDARY RULES
1. Do not add features outside the assigned FR/AC identifiers.
2. Do not install dependencies or modify shared contracts unless this task explicitly owns them.
3. API authorization must check role plus ownership, assignment or FleetMember membership.
4. Stop and return the blocker report from 00-master-orchestration.md if a controlled contract must change.
5. Do not weaken or delete tests to obtain a pass.

COMPLETION REPORT
- Task and commit SHA
- Files changed
- Red test command and observed failure
- Green verification commands and exit results
- Acceptance criteria evidence
- Remaining risks or NONE
```

Replace every `{{...}}` field before opening a session. An unresolved field makes the task `BLOCKED`, not ready.

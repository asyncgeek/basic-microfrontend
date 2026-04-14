# Skill Registry — microfrontends

Generated: 2026-04-10
Project: microfrontends (Pokemon Store)

---

## User Skills

| Skill | Trigger |
|-------|---------|
| `branch-pr` | When creating a pull request, opening a PR, or preparing changes for review |
| `go-testing` | When writing Go tests, using teatest, or adding test coverage |
| `issue-creation` | When creating a GitHub issue, reporting a bug, or requesting a feature |
| `judgment-day` | When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen" |
| `skill-creator` | When user asks to create a new skill, add agent instructions, or document patterns for AI |

---

## SDD Skills (auto-loaded by orchestrator)

| Skill | Trigger |
|-------|---------|
| `sdd-explore` | Investigate ideas before committing to a change |
| `sdd-propose` | Create a change proposal |
| `sdd-spec` | Write specifications with requirements and scenarios |
| `sdd-design` | Create technical design document |
| `sdd-tasks` | Break down a change into task checklist |
| `sdd-apply` | Implement tasks from the change |
| `sdd-verify` | Validate implementation matches specs |
| `sdd-archive` | Sync delta specs and archive completed change |

---

## Project Conventions

- No project-level CLAUDE.md or AGENTS.md detected
- Stack: React + Vanilla JS microfrontends (Webpack 5 Module Federation)
- No linter/formatter configured yet (project in planning phase)

---

## Compact Rules

### branch-pr
- Every PR MUST link an approved issue
- Every PR MUST have exactly one `type:*` label
- Automated checks must pass before merge

### issue-creation
- Use bug report or feature request template
- Every issue gets `status:needs-review` automatically
- Maintainer MUST add `status:approved` before any PR can be opened

### judgment-day
- Launch two independent blind judge sub-agents simultaneously
- Synthesize findings, apply fixes, re-judge until both pass or escalate after 2 iterations

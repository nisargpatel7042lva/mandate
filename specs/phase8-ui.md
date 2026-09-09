# Phase 8 — Execution UI (reconstructed 2026-09-09)

> **Note on provenance:** the original prompt as typed for this phase was not saved
> as a separate file when the work was done — a gap this file closes. What follows
> is not that verbatim prompt; it is the task description `AI_USAGE.md` recorded
> contemporaneously on 2026-09-06, the day the work happened, copied here unedited.
> See `AI_USAGE.md` under "2026-09-06 | UI | Phase 8" for the full entry, including
> what was AI-generated, human-directed, and the known limitation it disclosed.

**Task:** Execution UI — the demo-moment screen. Interactive trade-attempt flow with
real-time underwriting animation, unmistakable blocked state, 15-second comprehension
target for first-time viewers.

**Claude Code was asked to:**
- Build `src/app/api/check/route.ts` — `POST /api/check` accepts `{ protocol, amountUsdc }`
  (whole-dollar amount), calls `composeRiskScore` with live Graph data, maps the raw
  `reasons[]` array into 5 named steps (Trust Score, Permission Scope, Protocol Allowlist,
  Position Size, Daily Spending Cap) each with `pass/fail/skip` status and a plain-English
  detail string. Derives `primaryBlock` (one sentence, no raw revert string) and
  `primaryBlockDetail` (raw reason, for technical viewers). Returns `latencyMs`.
- Build `src/app/execute/page.tsx` — `'use client'` component. Three preset trade buttons
  pre-labeled with expected outcome ("Should pass" / "Not in allowlist" / "Exceeds position
  limit"). Custom protocol + amount form. Sequential step animation: each step shows
  "checking" spinner then resolves to pass/fail at 550ms intervals; fail stops and skips
  remaining steps. BLOCKED verdict: full-width red panel, plain-English primary reason,
  raw technical detail. APPROVED verdict: green panel, "MandateGate clears", greyed-out
  Arc settlement CTA (Phase 5 pending). Latency + data source footnote.
- Update `src/components/layout/Sidebar.tsx` — Execute added as first nav item.

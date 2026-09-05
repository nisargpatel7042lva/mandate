# Phase 2 Prompt (verbatim, pasted 2026-09-04)

Phase 2 — UI/UX foundation: design system + core screens (Sept 4–6, parallel to Phase 1/3)
Track: UI (lead). Run this under the Loop Protocol.

Goal: build the design system and wireframe the core screens BEFORE live data exists, using
realistic placeholder data clearly marked as such (never claim placeholder data is real).

Sub-tasks:

1. Design system (Tailwind v4, dark-first, NO shadcn)
   - CSS custom properties for semantic tokens: --bg, --surface, --surface-2, --surface-3,
     --text, --text-2, --text-3, --border, --border-subtle, --brand
   - Light and dark theme (default dark, toggle-able via .dark class on <html>)
   - Status colors: --success (#22c55e), --warning (#f59e0b), --danger (#ef4444)
   - Tier colors: --tier-monitoring (#3b82f6), --tier-autonomous (#f97316)
   - Reusable components: Card, Badge (success/warning/danger/brand/neutral variants),
     StatusBadge, TierBadge

2. Screen A — Agent Overview (/ route)
   - Agent identity header: ENS name, tier badge with matching ring, agent ID, owner address
   - Trust score display (large, prominent)
   - Permission scope: 4 cards (protocols, position types, max position, expiry with urgency
     color if < 3 days)
   - Stats row: total decisions, approved count, blocked count
   - Recent activity table (last 4 trades)
   - On-chain identity details (wallet, owner, ENS node, token URI)

3. Screen B — Underwriting Dashboard (/dashboard route) — THE judged pattern
   - Sticky policy strip (always visible, first thing the eye hits):
     * ✓ Allowed column: protocol badges + position type badges + limits
     * ✕ Not Authorized column: blocked protocols and position types
     * Scope Validity column: expiry countdown, renewal badge if urgent
   - Kill Switch: button → confirmation dialog → 1.8s "revoking" animation → "Authority
     Revoked" red state; demo-reset button
   - Daily spend progress bar (color shifts to amber at 80%)
   - Trade log with filter (all/approved/blocked), sortable grid layout

4. Screen C — Blocked Transaction Detail (/transactions/blocked route) — the demo-video moment
   - Hero block: large ✕ icon, "Transaction Blocked" label, WHY as the H1 (not a detail row)
   - Revert reason in a code-style block
   - Attempted transaction details card
   - "Agent May Use Instead" card showing authorized protocols
   - Enforcement chain: step-by-step trace with ✓/✕ per step and connector lines

5. Screen D — Treasury / Settlement (/treasury route)
   - Available USDC balance with SVG ring chart
   - Daily spend ring chart
   - Pending settlements count
   - Settlement history table (ID, amount, status badge, timestamp, trade ref)
   - Reputation write-back placeholder (shows current score + this-period delta + settled trades)

Definition of done:
- All four screens render at their routes (200, no hydration errors)
- Both light and dark themes work correctly
- Mobile responsive (no horizontal overflow at 375px)
- All placeholder data marked with EXAMPLE_DATA banner at top of each screen
- next build passes, eslint clean
- Committed with honest message; AI_USAGE.md updated

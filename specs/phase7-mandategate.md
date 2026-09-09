# Phase 7 — MandateGate: the custom SwapVM opcode (Sept 9–11) — STRETCH GOAL

Track: Backend (lead). Only start after Phases 1, 3, and 5 are solid end to end — this is
the highest-risk piece, timeboxed deliberately.

This is the verbatim phase prompt as given to Claude Code, kept here per the project's own
rule that every phase prompt used lands in `/specs`.

---

## PHASE 7 PROMPT (Backend/Chain session)

Run this under the Loop Protocol. This phase has a hard timebox: if it isn't working by
Sept 11 evening, fall back per the instruction at the end — don't let it eat the docs/video
buffer.

Goal: enforce the underwriting decision inside the swap itself, not before it.

1. Confirm the real, current SwapVM opcode table structure by reading the actual
   github.com/1inch/swap-vm source — do not assume an opcode format from memory or from a
   similar project's description.
2. Deploy the PermissionMirror contract (skeleton from Phase 1) for real on the execution
   chain, and get the Phase 5 relayer logic actually syncing it from the canonical ENS
   record + composed trust score.
3. Write a new opcode, MandateGate, following the precedent pattern of Turing Swap's
   `_humanGate` (reads an external state source mid-execution and reverts on failure) —
   appended to the opcode table, not replacing existing ones, per 1inch's rules ("bonus
   points for modifying opcodes", official contracts required as the base).
4. Wire it into one real Aqua position type. Demonstrate BOTH outcomes live on testnet:
   an in-scope, well-reputed action executing successfully, AND an out-of-scope or
   low-reputation action reverting at the MandateGate check — with the actual on-chain
   revert visible, not simulated.
5. Proper git history for this phase specifically — 1inch's rules explicitly flag "no
   single-commit entries on the final day" as disqualifying for this track.

FALLBACK if this isn't cleanly working by Sept 11 evening: execute the approved action as a
plain swap instead of a custom SwapVM position, keep the underwriting story intact via
Phases 1–5, and don't submit for the 1inch partner prize. The core three tracks don't
depend on this phase.

Definition of done: two real, live testnet transactions — one MandateGate-approved fill that
succeeds, one MandateGate-blocked attempt that reverts on-chain — both with tx hashes.

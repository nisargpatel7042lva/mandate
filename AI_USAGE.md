# AI Usage

Mandate was built using Claude Code (Anthropic) as a development assistant across both the
backend/chain and UI/UX tracks. This file documents where and how AI was used, updated
after every work session.

## Format

Each entry records:
- Date, track (Backend / UI / Both), phase
- What Claude Code was asked to do
- What was AI-generated vs. human-directed / reviewed / modified
- Any spec files or planning prompts used (linked; originals in `/specs`)

## Entries

### 2026-09-04 | Both | Phase 0

**Task:** Pre-event setup — research and scaffold only (no Mandate-specific code).

**Claude Code was asked to:**
- Research the actual state of `github.com/1inch/aqua` and `github.com/1inch/swap-vm` repos
  (testnet deployment status, opcode extensibility pattern)
- Read ENSv2 Enhanced Access Control docs and Agent0/ERC-8004 subgraph docs
- Research Atlas and AgentArena ETHGlobal showcase projects for UI patterns
- Scaffold a bare Next.js 16 + TypeScript + Tailwind project
- Create ARCHITECTURE.md, AI_USAGE.md, ASSUMPTIONS.md, and /specs/build-plan.md templates

**AI-generated:** Scaffold files (via `create-next-app`), template file content,
.prettierrc config, .env.example variable names.

**Human-directed / reviewed:** All research queries and verification steps; architectural
decision to self-deploy SwapVM on Sepolia (eliminating cross-chain complexity); decision
to mark unverified external dependencies explicitly in ASSUMPTIONS.md rather than guessing.

**Spec files used:** `/specs/build-plan.md` (the full ETHOnline 2026 build plan prompt)

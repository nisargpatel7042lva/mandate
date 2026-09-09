// Server-side data layer for Phase 4 UI wiring.
// Call getAgentLiveData() from async server components — it returns plain
// serialisable values (no BigInts) so RSC serialisation never throws.

import { isAddress, getAddress } from 'viem'
import { composeRiskScore, PROTOCOL_BITS } from './underwriting'
import { fetchAgentScope } from './mandate-subgraph'
import { getArcSettlements, sumSettledSince } from './arc-data'

// ── Live agent constants (verified on-chain 2026-09-06) ──────────────────────
export const LIVE_AGENT = {
  address:      '0xa0062C5066cF0B34010D7c4E90F68E4287D083a8' as const,
  ensName:      'testagent.mandate.eth',
  agentId:      '10099',
  ownerAddress: '0xa0062C5066cF0B34010D7c4E90F68E4287D083a8' as const,
  tokenUri:     'https://raw.githubusercontent.com/nisargpatel7042lva/mandate/main/public/agent-registration.json',
  tier:         'autonomous' as const,
}

/**
 * Resolve which agent a screen should show.
 *
 * Ownership is per-wallet on-chain — the ERC-8004 identity, the ENSv2 subname and
 * the resolver all belong to whoever signed for them — so nothing about the data
 * layer is specific to the demo agent. It is only the default when no agent is
 * named. Anything onboarded through `npm run onboard` can be viewed by address.
 *
 * Returns null for input that is not an address, so a bad query string renders an
 * empty state rather than being passed to a contract call.
 */
export function resolveAgentAddress(input?: string | string[] | null): string | null {
  if (input === undefined || input === null) return LIVE_AGENT.address
  const raw = (Array.isArray(input) ? input[0] : input)?.trim()
  if (!raw) return LIVE_AGENT.address
  if (!isAddress(raw)) return null
  return getAddress(raw)
}

/** True when the address being viewed is the built-in demo agent. */
export function isDemoAgent(address: string): boolean {
  return address.toLowerCase() === LIVE_AGENT.address.toLowerCase()
}

// ── Decoders ────────────────────────────────────────────────────────────────

export function decodeProtocols(bitmask: bigint | null): string[] {
  if (bitmask === null) return []
  return Object.entries(PROTOCOL_BITS)
    .filter(([, bit]) => !!(bitmask & bit))
    .map(([name]) => name)
}

// bit 0 = spot, bit 1 = lp, bit 2 = perp
export function decodePositionTypes(bitmask: number | null): string[] {
  if (bitmask === null) return []
  const types: string[] = []
  if (bitmask & 1) types.push('spot')
  if (bitmask & 2) types.push('lp')
  if (bitmask & 4) types.push('perp')
  return types
}

// 6-decimal USDC BigInt → plain dollars number (safe for JSON / RSC)
export function usdcToNumber(value: bigint | null): number | null {
  if (value === null) return null
  return Number(value) / 1_000_000
}

// ── Return type ──────────────────────────────────────────────────────────────

export interface AgentLiveData {
  // Trust composition
  trustScore: number
  /** null = no Agent0 record — unknown, not zero (see underwriting.ts) */
  erc8004Score: number | null
  mandateHistoryScore: number
  authorized: boolean
  reasons: string[]

  // Permission scope (decoded — no BigInts)
  allowedProtocols: string[]
  allowedPositionTypes: string[]
  /** dollars (not 6-decimal) */
  maxPositionSizeUsdc: number | null
  maxDailySpendUsdc: number | null
  /** unix seconds */
  scopeExpiry: number | null
  ensNode: string | null
  syncCount: number | null
  lastSyncedAt: number | null

  // Data source flags
  agentFound: boolean
  reputationFound: boolean
  scopeFound: boolean

  /** Non-null when the fetch itself threw — render an error state */
  fetchError: string | null
}

// ── Fetch ────────────────────────────────────────────────────────────────────

export async function getAgentLiveData(
  /** Defaults to the demo agent so existing callers are unchanged. */
  agentAddress: string = LIVE_AGENT.address,
): Promise<AgentLiveData> {
  try {
    const [result, scope] = await Promise.all([
      composeRiskScore(agentAddress),
      fetchAgentScope(agentAddress).catch(() => null),
    ])

    return {
      trustScore:           result.trustScore,
      erc8004Score:         result.erc8004Score,
      mandateHistoryScore:  result.mandateHistoryScore,
      authorized:           result.authorized,
      reasons:              result.reasons,

      allowedProtocols:     decodeProtocols(result.allowedProtocols),
      allowedPositionTypes: decodePositionTypes(scope?.allowedPositionTypes ?? null),
      maxPositionSizeUsdc:  usdcToNumber(result.maxPositionSizeUsdc),
      maxDailySpendUsdc:    usdcToNumber(result.maxDailySpendUsdc),
      scopeExpiry:          result.scopeExpiry,
      ensNode:              scope?.ensNode ?? null,
      syncCount:            scope?.syncCount ?? null,
      lastSyncedAt:         scope ? parseInt(scope.lastSyncedAt, 10) : null,

      agentFound:     result.agentFound,
      reputationFound: result.reputationFound,
      scopeFound:     result.scopeFound,

      fetchError: null,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      trustScore: 0, erc8004Score: null, mandateHistoryScore: 0,
      authorized: false, reasons: [],
      allowedProtocols: [], allowedPositionTypes: [],
      maxPositionSizeUsdc: null, maxDailySpendUsdc: null,
      scopeExpiry: null, ensNode: null, syncCount: null, lastSyncedAt: null,
      agentFound: false, reputationFound: false, scopeFound: false,
      fetchError: msg,
    }
  }
}

// ── Blocked-scenario helper ──────────────────────────────────────────────────
// Screen C (Blocked TX) shows what happens when the agent tries a disallowed
// action. This calls composeRiskScore with a real permission check so the
// enforcement chain is real, not fabricated.

export interface BlockedScenario {
  protocol: string
  action: string
  amountUsdc: number
  reasons: string[]
  trustScore: number
  authorized: boolean
  fetchError: string | null
}

export async function getBlockedScenario(): Promise<BlockedScenario> {
  const protocol = 'gmx-perp'
  const amountUsdc = 5_000_000_000n  // 5,000 USDC in 6-decimal

  try {
    const nowS = Math.floor(Date.now() / 1000)
    const settlementsData = await getArcSettlements(LIVE_AGENT.address).catch(() => ({ settlements: [], fetchError: 'unreachable' }))
    const spentTodayUsdc = sumSettledSince(settlementsData.settlements, nowS - 86400)
    const result = await composeRiskScore(LIVE_AGENT.address, {
      protocol,
      amountUsdc,
      currentDailySpendUsdc: BigInt(Math.round(spentTodayUsdc * 1_000_000)),
    })
    return {
      protocol,
      action: 'Long ETH 10x',
      amountUsdc: 5000,
      reasons: result.reasons,
      trustScore: result.trustScore,
      authorized: result.authorized,
      fetchError: null,
    }
  } catch (err) {
    return {
      protocol,
      action: 'Long ETH 10x',
      amountUsdc: 5000,
      reasons: ['Failed to fetch live enforcement data'],
      trustScore: 0,
      authorized: false,
      fetchError: err instanceof Error ? err.message : String(err),
    }
  }
}

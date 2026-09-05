/**
 * EXAMPLE DATA — all values below are placeholder data for UI development.
 * Replace with live API/subgraph calls in Phase 3+.
 * Search for EXAMPLE_DATA to find all usage sites.
 */

import type {
  Agent,
  TradeDecision,
  BlockedTransaction,
  Settlement,
  TreasuryState,
} from './types'

// EXAMPLE_DATA: agent identity + permissions
export const EXAMPLE_AGENT: Agent = {
  agentId: '42',
  ensName: 'testagent.mandate.eth',
  ownerAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  agentWallet: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  tokenUri: 'https://raw.githubusercontent.com/nisargpatel7042lva/mandate/main/public/agent-registration.json',
  tier: 'autonomous',
  trustScore: 87.3,
  trustScoreDelta: 2.1,
  registeredAt: '2026-09-04T10:00:00Z',
  permissions: {
    version: '1',
    allowedProtocols: ['uniswap-v3', 'curve', 'aave-v3'],
    allowedPositionTypes: ['spot', 'lp'],
    maxPositionSizeUsdc: 10_000,
    maxDailySpendUsdc: 50_000,
    expiryTimestamp: Math.floor(Date.now() / 1000) + 29 * 24 * 60 * 60 + 14 * 60 * 60,
    ensNode: '0xa3f4c8d2b1e5f690742c3d8a9b0e7f254163c8d2',
  },
}

// EXAMPLE_DATA: trade decision log (mixed approved/blocked)
export const EXAMPLE_TRADES: TradeDecision[] = [
  {
    id: 'tx-001',
    timestamp: '2026-09-04T14:23:01Z',
    protocol: 'Uniswap v3',
    action: 'Swap',
    amountUsdc: 8_500,
    asset: 'ETH/USDC',
    status: 'approved',
    reason: 'Within scope',
    blockNumber: 7_142_301,
    txHash: '0x4a8f3c2d1e5b690742c3d8a9b0e7f254163c8d2b1e5f690742c3d8a9b0e7f25',
    agentName: 'testagent.mandate.eth',
  },
  {
    id: 'tx-002',
    timestamp: '2026-09-04T14:21:44Z',
    protocol: 'Curve',
    action: 'Add LP',
    amountUsdc: 12_000,
    asset: 'USDC/USDT',
    status: 'blocked',
    reason: 'Exceeds $10,000 position limit',
    blockNumber: 7_142_299,
    agentName: 'testagent.mandate.eth',
  },
  {
    id: 'tx-003',
    timestamp: '2026-09-04T14:18:32Z',
    protocol: 'GMX Perpetuals',
    action: 'Open Perp',
    amountUsdc: 5_000,
    asset: 'ETH/USD perp',
    status: 'blocked',
    reason: 'Protocol not in allowlist',
    blockNumber: 7_142_291,
    agentName: 'testagent.mandate.eth',
  },
  {
    id: 'tx-004',
    timestamp: '2026-09-04T14:15:01Z',
    protocol: 'Aave v3',
    action: 'Supply',
    amountUsdc: 3_200,
    asset: 'USDC',
    status: 'approved',
    reason: 'Within scope',
    blockNumber: 7_142_285,
    txHash: '0x9b0e7f254163c8d2b1e5f690742c3d8a9b0e7f254163c8d2b1e5f690742c3d8',
    agentName: 'testagent.mandate.eth',
  },
  {
    id: 'tx-005',
    timestamp: '2026-09-04T14:10:22Z',
    protocol: 'Uniswap v3',
    action: 'Swap',
    amountUsdc: 7_800,
    asset: 'WBTC/USDC',
    status: 'approved',
    reason: 'Within scope',
    blockNumber: 7_142_271,
    txHash: '0x163c8d2b1e5f690742c3d8a9b0e7f254163c8d2b1e5f690742c3d8a9b0e7f25',
    agentName: 'testagent.mandate.eth',
  },
  {
    id: 'tx-006',
    timestamp: '2026-09-04T13:58:14Z',
    protocol: 'Uniswap v3',
    action: 'Swap',
    amountUsdc: 9_900,
    asset: 'ETH/USDC',
    status: 'approved',
    reason: 'Within scope',
    blockNumber: 7_142_244,
    txHash: '0x254163c8d2b1e5f690742c3d8a9b0e7f254163c8d2b1e5f690742c3d8a9b0e7',
    agentName: 'testagent.mandate.eth',
  },
]

// EXAMPLE_DATA: the canonical blocked transaction (tx-003) with enforcement trace
export const EXAMPLE_BLOCKED_TX: BlockedTransaction = {
  ...EXAMPLE_TRADES[2],
  status: 'blocked',
  revertReason: 'MandateGate: protocol not in agent allowlist',
  attemptedProtocol: 'GMX Perpetuals',
  enforcementChain: [
    {
      step: 'ENSv2 scope loaded',
      result: 'pass',
      detail: 'Resolver 0xa20b…e6 · node 0xa3f4…d2',
    },
    {
      step: 'Scope expiry check',
      result: 'pass',
      detail: 'Valid for 29d 14h (exp. 2026-10-03)',
    },
    {
      step: 'Position type check',
      result: 'pass',
      detail: 'allowedPositionTypes: [spot, lp] — perp not attempted',
    },
    {
      step: 'Protocol allowlist check',
      result: 'fail',
      detail: 'gmx-perpetuals ∉ [uniswap-v3, curve, aave-v3] → REVERT',
    },
  ],
}

// EXAMPLE_DATA: settlement history
export const EXAMPLE_SETTLEMENTS: Settlement[] = [
  {
    id: 'stl-001',
    timestamp: '2026-09-04T14:24:10Z',
    amountUsdc: 8_500,
    recipient: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    status: 'settled',
    txHash: '0x4a8f3c2d1e5b690742c3d8a9b0e7f254163c8d2b1e5f690742c3d8a9b0e7f25',
    tradeId: 'tx-001',
  },
  {
    id: 'stl-002',
    timestamp: '2026-09-04T14:16:00Z',
    amountUsdc: 3_200,
    recipient: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    status: 'settled',
    txHash: '0x9b0e7f254163c8d2b1e5f690742c3d8a9b0e7f254163c8d2b1e5f690742c3d8',
    tradeId: 'tx-004',
  },
  {
    id: 'stl-003',
    timestamp: '2026-09-04T14:11:30Z',
    amountUsdc: 7_800,
    recipient: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    status: 'pending',
    tradeId: 'tx-005',
  },
  {
    id: 'stl-004',
    timestamp: '2026-09-04T13:59:00Z',
    amountUsdc: 9_900,
    recipient: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    status: 'pending',
    tradeId: 'tx-006',
  },
]

// EXAMPLE_DATA: treasury state
export const EXAMPLE_TREASURY: TreasuryState = {
  availableUsdc: 47_300,
  maxUsdc: 100_000,
  todaySpentUsdc: 29_400,
  dailyLimitUsdc: 50_000,
  pendingSettlements: 2,
}

// Utility: format addresses for display
export function shortAddr(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// Utility: format USDC amounts
export function fmtUsdc(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Utility: seconds until expiry → human string
export function fmtExpiry(ts: number): string {
  const diff = ts - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'Expired'
  const d = Math.floor(diff / 86400)
  const h = Math.floor((diff % 86400) / 3600)
  return `${d}d ${h}h`
}

// Utility: ISO timestamp → local display
export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// Shape of GET /api/live. Everything here is real chain / subgraph state.
import type { ArcSettlement } from './arc-data'

export interface LiveEvent {
  id: string
  kind: 'settlement' | 'sync'
  chain: 'arc' | 'sepolia'
  timestamp: number
  blockNumber: number
  txHash: string
  amountUsdc?: number
  success?: boolean
}

export interface LiveSnapshot {
  at: number
  arc: { blockNumber: number; balanceUsdc: number; error: string | null }
  agent: {
    trustScore: number
    erc8004Score: number | null
    mandateHistoryScore: number
    authorized: boolean
    scopeFound: boolean
    scopeExpiry: number | null
    syncCount: number | null
    lastSyncedAt: number | null
    allowedProtocols: string[]
    allowedPositionTypes: string[]
    maxPositionSizeUsdc: number | null
    maxDailySpendUsdc: number | null
    error: string | null
  }
  settlements: ArcSettlement[]
  /** ArcScan rejection (rate limit etc.) — settlements may be stale or empty */
  settlementsError: string | null
  events: LiveEvent[]
  spentTodayUsdc: number
  totalSettledUsdc: number
}

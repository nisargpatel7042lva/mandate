// TypeScript types for Mandate UI

export type AuthorityTier = 'analytics' | 'monitoring' | 'autonomous'
export type TxStatus = 'approved' | 'blocked'
export type SettlementStatus = 'pending' | 'settled' | 'failed'

export interface Agent {
  agentId: string
  ensName: string
  ownerAddress: string
  agentWallet: string
  tokenUri: string
  tier: AuthorityTier
  trustScore: number
  trustScoreDelta: number
  permissions: PermissionScope
  registeredAt: string
}

export interface PermissionScope {
  version: string
  allowedProtocols: string[]
  allowedPositionTypes: string[]
  maxPositionSizeUsdc: number
  maxDailySpendUsdc: number
  expiryTimestamp: number
  ensNode: string
}

export interface TradeDecision {
  id: string
  timestamp: string
  protocol: string
  action: string
  amountUsdc: number
  asset: string
  status: TxStatus
  reason: string
  blockNumber?: number
  txHash?: string
  agentName: string
}

export interface BlockedTransaction extends TradeDecision {
  status: 'blocked'
  revertReason: string
  enforcementChain: EnforcementStep[]
  attemptedProtocol: string
}

export interface EnforcementStep {
  step: string
  result: 'pass' | 'fail'
  detail: string
}

export interface Settlement {
  id: string
  timestamp: string
  amountUsdc: number
  recipient: string
  status: SettlementStatus
  txHash?: string
  tradeId: string
}

export interface TreasuryState {
  availableUsdc: number
  maxUsdc: number
  todaySpentUsdc: number
  dailyLimitUsdc: number
  pendingSettlements: number
}

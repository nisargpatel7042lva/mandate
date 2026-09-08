// GET /api/live — a single snapshot of live state for client polling.
// Reads: Arc RPC (balance + block), ArcScan (settlements), Mandate subgraph (scope + syncs),
// Agent0 (reputation via composeRiskScore). No writes, no keys.

import { getArcBalance, getArcSettlements } from '@/lib/arc-data'
import { getAgentLiveData, LIVE_AGENT } from '@/lib/server-data'
import { fetchRecentUpdates } from '@/lib/mandate-subgraph'
import type { LiveSnapshot, LiveEvent } from '@/lib/live'

export async function GET(): Promise<Response> {
  const [arc, agent, settlementsData, updates] = await Promise.all([
    getArcBalance(LIVE_AGENT.address),
    getAgentLiveData(),
    getArcSettlements(LIVE_AGENT.address),
    fetchRecentUpdates(LIVE_AGENT.address).catch(() => []),
  ])

  const nowS = Math.floor(Date.now() / 1000)
  const settlements = settlementsData.settlements
  const ok = settlements.filter(s => s.success)

  const events: LiveEvent[] = [
    ...settlements.map<LiveEvent>(s => ({
      id: `arc:${s.txHash}`, kind: 'settlement', chain: 'arc',
      timestamp: s.timestamp, blockNumber: s.blockNumber, txHash: s.txHash,
      amountUsdc: s.amountUsdc, success: s.success,
    })),
    ...updates.map<LiveEvent>(u => ({
      id: `sep:${u.id}`, kind: 'sync', chain: 'sepolia',
      timestamp: parseInt(u.blockTimestamp, 10), blockNumber: parseInt(u.blockNumber, 10),
      txHash: u.transactionHash.startsWith('0x') ? u.transactionHash : `0x${u.transactionHash}`,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp)

  const snapshot: LiveSnapshot = {
    at: nowS,
    arc: { blockNumber: arc.blockNumber, balanceUsdc: arc.balanceUsdc, error: arc.fetchError },
    agent: {
      trustScore: agent.trustScore,
      erc8004Score: agent.erc8004Score,
      mandateHistoryScore: agent.mandateHistoryScore,
      authorized: agent.authorized,
      scopeFound: agent.scopeFound,
      scopeExpiry: agent.scopeExpiry,
      syncCount: agent.syncCount,
      lastSyncedAt: agent.lastSyncedAt,
      allowedProtocols: agent.allowedProtocols,
      allowedPositionTypes: agent.allowedPositionTypes,
      maxPositionSizeUsdc: agent.maxPositionSizeUsdc,
      maxDailySpendUsdc: agent.maxDailySpendUsdc,
      error: agent.fetchError,
    },
    settlements,
    settlementsError: settlementsData.fetchError,
    events,
    spentTodayUsdc: ok.filter(s => s.timestamp >= nowS - 86400).reduce((a, s) => a + s.amountUsdc, 0),
    totalSettledUsdc: ok.reduce((a, s) => a + s.amountUsdc, 0),
  }

  return Response.json(snapshot, { headers: { 'Cache-Control': 'no-store' } })
}

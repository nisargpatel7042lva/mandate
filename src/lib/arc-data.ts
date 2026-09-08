// Arc testnet data — live USDC balance for the agent wallet.
// Arc's native currency IS USDC (decimals: 18) — query via eth_getBalance, not a token contract.
// Chain ID 5042002, RPC https://rpc.testnet.arc.network (verified responding 2026-09-06).
// Explorer: https://testnet.arcscan.app (confirmed from viem/chains/arcTestnet definition).

import { createPublicClient, http } from 'viem'
import { arcTestnet } from 'viem/chains'

// Confirmed from viem/chains/definitions/arcTestnet.ts blockExplorers.default.url
const ARC_EXPLORER_BASE = 'https://testnet.arcscan.app'

export function arcExplorerTx(hash: string): string {
  return `${ARC_EXPLORER_BASE}/tx/${hash}`
}

export function arcExplorerAddr(address: string): string {
  return `${ARC_EXPLORER_BASE}/address/${address}`
}

export interface ArcBalanceData {
  /** Dollar amount — Arc USDC is 18 decimals, already converted */
  balanceUsdc: number
  /** Latest Arc testnet block at query time */
  blockNumber: number
  /** Non-null when the RPC call failed */
  fetchError: string | null
}

export interface ArcSettlement {
  txHash: string
  blockNumber: number
  /** Unix seconds */
  timestamp: number
  /** USDC amount (18-decimal native, already converted to dollars) */
  amountUsdc: number
  from: string
  to: string
  /** false when the tx reverted */
  success: boolean
}

export interface ArcSettlementsData {
  settlements: ArcSettlement[]
  fetchError: string | null
}

export async function getArcSettlements(address: string): Promise<ArcSettlementsData> {
  try {
    const url =
      `${ARC_EXPLORER_BASE}/api?module=account&action=txlist` +
      `&address=${address}&sort=desc&limit=20`
    const res = await fetch(url, { next: { revalidate: 30 } } as RequestInit)
    if (!res.ok) throw new Error(`ArcScan returned ${res.status}`)
    const json = await res.json() as {
      status: string
      message: string
      result: Array<{
        hash: string
        blockNumber: string
        timeStamp: string
        value: string
        from: string
        to: string
        isError: string
      }>
    }
    if (json.status !== '1') {
      // No transactions yet — not an error
      return { settlements: [], fetchError: null }
    }
    const settlements: ArcSettlement[] = json.result
      .filter(tx => tx.from.toLowerCase() === address.toLowerCase())
      .map(tx => ({
        txHash: tx.hash,
        blockNumber: parseInt(tx.blockNumber, 10),
        timestamp: parseInt(tx.timeStamp, 10),
        amountUsdc: Number(BigInt(tx.value)) / 1e18,
        from: tx.from,
        to: tx.to,
        success: tx.isError === '0',
      }))
    return { settlements, fetchError: null }
  } catch (err) {
    return {
      settlements: [],
      fetchError: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function getArcBalance(address: string): Promise<ArcBalanceData> {
  try {
    const client = createPublicClient({
      chain: arcTestnet,
      transport: http('https://rpc.testnet.arc.network', { timeout: 10_000 }),
    })
    const [balanceWei, blockNumber] = await Promise.all([
      client.getBalance({ address: address as `0x${string}` }),
      client.getBlockNumber(),
    ])
    // Arc native USDC has 18 decimals (per viem arcTestnet definition)
    return {
      balanceUsdc: Number(balanceWei) / 1e18,
      blockNumber: Number(blockNumber),
      fetchError: null,
    }
  } catch (err) {
    return {
      balanceUsdc: 0,
      blockNumber: 0,
      fetchError: err instanceof Error ? err.message : String(err),
    }
  }
}

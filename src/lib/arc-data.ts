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

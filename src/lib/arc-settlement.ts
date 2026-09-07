// Arc settlement — moving real USDC on Arc testnet for an approved trade.
//
// Arc's native currency IS USDC (18 decimals, confirmed in viem's arcTestnet
// definition), so a settlement is a native value transfer rather than an ERC-20
// call. There is no token contract to approve.
//
// Note this is distinct from Circle's Agent Stack starter kits, which wrap a
// `circle` shell CLI and support Base and Polygon only — they are agent service
// payments over x402, not an Arc integration. See ASSUMPTIONS.md.

import { createPublicClient, http, formatUnits, type Address } from 'viem'
import { arcTestnet } from 'viem/chains'

export const ARC_RPC_URL = 'https://rpc.testnet.arc.network'
export const ARC_EXPLORER = 'https://testnet.arcscan.app'
export const ARC_CHAIN_ID = 5042002
/** Arc USDC is the native currency and carries 18 decimals, not the usual 6. */
export const ARC_USDC_DECIMALS = 18

export const arcPublicClient = () =>
  createPublicClient({ chain: arcTestnet, transport: http(ARC_RPC_URL, { timeout: 15_000 }) })

export const arcTxUrl = (hash: string) => `${ARC_EXPLORER}/tx/${hash}`
export const arcAddressUrl = (address: string) => `${ARC_EXPLORER}/address/${address}`

export async function getArcBalanceUsdc(address: Address): Promise<number> {
  const balance = await arcPublicClient().getBalance({ address })
  return Number(formatUnits(balance, ARC_USDC_DECIMALS))
}

/**
 * The record tying money movement to the decision that authorised it.
 *
 * Arc's judging criteria ask for decision logic traceably tied to a real signal,
 * so a settlement is only meaningful alongside the trust score and the specific
 * checks that passed. Kept together deliberately rather than logging a bare hash.
 */
export interface SettlementRecord {
  settledAt: string
  amountUsdc: string
  recipient: Address
  txHash: string
  explorerUrl: string
  blockNumber: string
  authorisedBy: {
    trustScore: number
    trustThreshold: number
    erc8004Score: number | null
    mandateHistoryScore: number
    protocol: string
    checksPassed: string[]
    scopeSource: string
    permissionMirror: string
  }
}

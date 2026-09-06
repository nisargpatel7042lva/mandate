// Kill-switch API — POST /api/revoke
//
// Calls PermissionMirror.sync() on Sepolia with expiry=1 (past) so
// isAuthorized() returns false immediately. The relayer key (PRIVATE_KEY)
// must be set server-side and must match the relayer address on the contract.
//
// Only available when PRIVATE_KEY and SEPOLIA_RPC_URL are set.
// Returns { txHash, revoked: true } on success.

import { createPublicClient, createWalletClient, http, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { LIVE_AGENT } from '@/lib/server-data'

const PERMISSION_MIRROR_ADDRESS = '0x6f19dd6f759fac8a19579ecdefb342009a21d9a7' as Address

const SYNC_ABI = [
  {
    type: 'function',
    name: 'sync',
    inputs: [
      { name: 'agent', type: 'address' },
      {
        name: 'scope',
        type: 'tuple',
        components: [
          { name: 'allowedProtocols',    type: 'uint256' },
          { name: 'allowedPositionTypes', type: 'uint8' },
          { name: 'maxPositionSizeUsdc', type: 'uint128' },
          { name: 'maxDailySpendUsdc',   type: 'uint128' },
          { name: 'expiry',              type: 'uint64' },
          { name: 'ensNode',             type: 'bytes32' },
          { name: 'syncedAtBlock',       type: 'uint64' },
        ],
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPermissions',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'allowedProtocols',    type: 'uint256' },
          { name: 'allowedPositionTypes', type: 'uint8' },
          { name: 'maxPositionSizeUsdc', type: 'uint128' },
          { name: 'maxDailySpendUsdc',   type: 'uint128' },
          { name: 'expiry',              type: 'uint64' },
          { name: 'ensNode',             type: 'bytes32' },
          { name: 'syncedAtBlock',       type: 'uint64' },
        ],
      },
    ],
    stateMutability: 'view',
  },
] as const

export async function POST(): Promise<Response> {
  const pk = process.env.PRIVATE_KEY?.trim()
  const rpcUrl = process.env.SEPOLIA_RPC_URL?.trim()

  if (!pk || !rpcUrl) {
    return Response.json(
      { error: 'PRIVATE_KEY and SEPOLIA_RPC_URL must be set server-side to call the kill switch' },
      { status: 503 },
    )
  }

  try {
    const account = privateKeyToAccount(
      (pk.startsWith('0x') ? pk : `0x${pk}`) as `0x${string}`,
    )
    const publicClient = createPublicClient({ chain: sepolia, transport: http(rpcUrl) })
    const walletClient = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) })

    // Read the current scope to preserve ensNode and other fields
    const current = await publicClient.readContract({
      address: PERMISSION_MIRROR_ADDRESS,
      abi: SYNC_ABI,
      functionName: 'getPermissions',
      args: [LIVE_AGENT.address as Address],
    })

    // Revoke by setting expiry to 1 (safely in the past for any chain timestamp)
    const revokedScope = {
      allowedProtocols:    current.allowedProtocols,
      allowedPositionTypes: current.allowedPositionTypes,
      maxPositionSizeUsdc: current.maxPositionSizeUsdc,
      maxDailySpendUsdc:   current.maxDailySpendUsdc,
      expiry:              1n as unknown as bigint,
      ensNode:             current.ensNode,
      syncedAtBlock:       0n as unknown as bigint,
    }

    const hash = await walletClient.writeContract({
      address: PERMISSION_MIRROR_ADDRESS,
      abi: SYNC_ABI,
      functionName: 'sync',
      args: [LIVE_AGENT.address as Address, revokedScope],
    })

    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    return Response.json({
      revoked: true,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      explorerUrl: `https://sepolia.etherscan.io/tx/${hash}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}

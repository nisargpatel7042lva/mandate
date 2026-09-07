// PermissionMirror contract details, shared by client and server.
//
// The kill switch writes through this contract from the owner's own wallet.
// sync() is gated on msg.sender == relayer, so only the relayer key can revoke —
// which is the point: revocation is authorised by the key holder, not by a
// server holding a key on their behalf.

import type { Address } from 'viem'

export const PERMISSION_MIRROR_ADDRESS =
  '0x6f19dd6f759fac8a19579ecdefb342009a21d9a7' as Address

export const SEPOLIA_CHAIN_ID = 11155111
export const SEPOLIA_CHAIN_ID_HEX = '0xaa36a7'

const SCOPE_COMPONENTS = [
  { name: 'allowedProtocols', type: 'uint256' },
  { name: 'allowedPositionTypes', type: 'uint8' },
  { name: 'maxPositionSizeUsdc', type: 'uint128' },
  { name: 'maxDailySpendUsdc', type: 'uint128' },
  { name: 'expiry', type: 'uint64' },
  { name: 'ensNode', type: 'bytes32' },
  { name: 'syncedAtBlock', type: 'uint64' },
] as const

export const PERMISSION_MIRROR_ABI = [
  {
    type: 'function',
    name: 'sync',
    inputs: [
      { name: 'agent', type: 'address' },
      { name: 'scope', type: 'tuple', components: SCOPE_COMPONENTS },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPermissions',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ name: '', type: 'tuple', components: SCOPE_COMPONENTS }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'isAuthorized',
    inputs: [{ name: 'agent', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'relayer',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
] as const

export interface PermissionScope {
  allowedProtocols: bigint
  allowedPositionTypes: number
  maxPositionSizeUsdc: bigint
  maxDailySpendUsdc: bigint
  expiry: bigint
  ensNode: `0x${string}`
  syncedAtBlock: bigint
}

/**
 * A scope with expiry in the past. isAuthorized() checks `expiry < block.timestamp`,
 * so writing this revokes immediately without clearing the rest of the record —
 * the previous limits stay readable for audit.
 */
export function revokedScope(current?: Partial<PermissionScope>): PermissionScope {
  return {
    allowedProtocols: current?.allowedProtocols ?? 0n,
    allowedPositionTypes: current?.allowedPositionTypes ?? 0,
    maxPositionSizeUsdc: current?.maxPositionSizeUsdc ?? 0n,
    maxDailySpendUsdc: current?.maxDailySpendUsdc ?? 0n,
    expiry: 1n, // in the past
    ensNode:
      current?.ensNode ??
      ('0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`),
    syncedAtBlock: 0n, // the contract overwrites this
  }
}

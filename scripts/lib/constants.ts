// Contract addresses and chain constants.
// Every address here is verified against its official source — see inline comments.

import type { Abi } from 'viem'

// ─── Chain IDs ────────────────────────────────────────────────────────────────

export const SEPOLIA_CHAIN_ID = 11155111

// ─── ERC-8004 Registries on Sepolia ───────────────────────────────────────────
// Source: github.com/erc-8004/erc-8004-contracts README (verified 2026-09-04)

export const ERC8004_IDENTITY_REGISTRY =
  '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const

export const ERC8004_REPUTATION_REGISTRY =
  '0x8004B663056A597Dffe9eCcC1965A193B7388713' as const

// ─── ENSv2 Contracts on Sepolia ───────────────────────────────────────────────
// Source: @ensdomains/ensjs v5.0.0-sepolia-fix.1 dist/clients/l2.d.ts (verified 2026-09-04)
// These are the ENSv2 L2-native contract addresses used by the ENSjs wallet actions.

// ethRegistrar — the L2 ETH registrar that handles commit/register
export const ENS_L2_REGISTRAR_SEPOLIA =
  '0x3334f0ebcbc4b5b7067f3aff25c6da8973690d54' as const

// ensV2EthRegistry — the L2 ENS registry (name ownership)
export const ENS_L2_REGISTRY_SEPOLIA =
  '0xF332544e6234f1CA149907D0d4658afD5feB6831' as const

// ensDedicatedResolver — the default public resolver for ENSv2 names on Sepolia
export const ENS_PUBLIC_RESOLVER_SEPOLIA =
  '0xa20b41dc7336c4d974e3c9a6ea01b77647559c46' as const

// usdc — USDC deployed by ENS team for testnet registration payments
export const ENS_TESTNET_USDC_SEPOLIA =
  '0x7Fc21ceb0C5003576ab5E101eB240c2b822c95d2' as const

// ─── Permission encoding constants ────────────────────────────────────────────
// Text record key under which we store the machine-readable permission scope.
// Key format follows ENS text record conventions (reverse-domain namespacing).
export const MANDATE_PERMISSIONS_KEY = 'mandate.permissions'
export const MANDATE_POLICY_KEY = 'mandate.policy'

// ─── Minimal ABIs ─────────────────────────────────────────────────────────────
// Only the functions we actually call — verified against official ABI files.
// Source for ERC-8004: github.com/erc-8004/erc-8004-contracts/abis/IdentityRegistry.json

export const IDENTITY_REGISTRY_ABI: Abi = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'agentURI', type: 'string' }],
    outputs: [{ name: 'agentId', type: 'uint256' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'getAgentWallet',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'agentId', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  // Transfer event emitted on register (ERC-721)
  {
    name: 'Transfer',
    type: 'event',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
]

// ENSv2 PublicResolver setText / text — standard interface
// Source: ENSv2 tutorial docs — setText(bytes32 node, string key, string value)
export const PUBLIC_RESOLVER_ABI: Abi = [
  {
    name: 'setText',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
      { name: 'value', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'text',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'node', type: 'bytes32' },
      { name: 'key', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
]

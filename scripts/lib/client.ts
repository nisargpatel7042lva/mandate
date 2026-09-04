/**
 * Thin wrappers around viem 2.56.x readContract/writeContract.
 *
 * viem 2.56 added EIP-7702 overloads that require `authorizationList` when
 * TypeScript resolves to the state-override discriminant with broad Abi types.
 * Casting through `any` here rather than peppering every call site.
 */

import { type Abi, type Address, type Hash } from 'viem'

export interface ContractReadParams {
  address: Address
  abi: Abi
  functionName: string
  args?: unknown[]
}

export interface ContractWriteParams {
  address: Address
  abi: Abi
  functionName: string
  args?: unknown[]
  chain?: unknown
  account?: unknown
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function readContract<T = unknown>(client: any, params: ContractReadParams): Promise<T> {
  return client.readContract(params) as Promise<T>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function writeContract(client: any, params: ContractWriteParams): Promise<Hash> {
  return client.writeContract(params) as Promise<Hash>
}

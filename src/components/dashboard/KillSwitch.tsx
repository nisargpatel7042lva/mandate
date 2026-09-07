'use client'

// Kill switch — revokes the agent's authority on-chain.
//
// Signed by the owner in their own wallet, not by the server. PermissionMirror
// gates sync() on msg.sender == relayer, so only the key holder can revoke. An
// earlier version signed server-side with PRIVATE_KEY, which meant an unauthenticated
// POST to /api/revoke could kill the agent from anywhere; that route is gone.
//
// Uses viem's EIP-1193 transport over window.ethereum — no wallet library needed.

import { useState } from 'react'
import { createWalletClient, createPublicClient, custom, http, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import {
  PERMISSION_MIRROR_ADDRESS,
  PERMISSION_MIRROR_ABI,
  SEPOLIA_CHAIN_ID_HEX,
  revokedScope,
} from '@/lib/permission-mirror'

type State = 'idle' | 'confirm' | 'revoking' | 'revoked' | 'error'

interface KillSwitchProps {
  /** The agent whose authority is being revoked. */
  agentAddress: string
}

// window.ethereum, without pulling in a wallet library's types.
type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}
function getProvider(): Eip1193 | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null
}

export function KillSwitch({ agentAddress }: KillSwitchProps) {
  const [state, setState] = useState<State>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleRevoke() {
    setState('revoking')
    setErrorMsg(null)

    try {
      const provider = getProvider()
      if (!provider) {
        throw new Error(
          'No browser wallet found. Revocation is signed by the permission owner, so a wallet is required.',
        )
      }

      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
      const account = accounts?.[0] as Address | undefined
      if (!account) throw new Error('No account authorised in the wallet')

      // Sepolia only — a revocation sent to another chain silently does nothing.
      const chainId = (await provider.request({ method: 'eth_chainId' })) as string
      if (chainId !== SEPOLIA_CHAIN_ID_HEX) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
          })
        } catch {
          throw new Error('Please switch your wallet to Sepolia and try again.')
        }
      }

      const publicClient = createPublicClient({ chain: sepolia, transport: http() })

      // Fail early with a clear message rather than letting the contract revert:
      // sync() is relayer-gated, so a different account cannot revoke.
      const relayer = (await publicClient.readContract({
        address: PERMISSION_MIRROR_ADDRESS,
        abi: PERMISSION_MIRROR_ABI,
        functionName: 'relayer',
      })) as Address
      if (relayer.toLowerCase() !== account.toLowerCase()) {
        throw new Error(
          `Connected account ${account.slice(0, 6)}…${account.slice(-4)} is not the permission relayer ` +
            `(${relayer.slice(0, 6)}…${relayer.slice(-4)}). Only the relayer can revoke.`,
        )
      }

      // Preserve the existing limits and only move expiry into the past, so the
      // record stays auditable rather than being blanked.
      const current = (await publicClient.readContract({
        address: PERMISSION_MIRROR_ADDRESS,
        abi: PERMISSION_MIRROR_ABI,
        functionName: 'getPermissions',
        args: [agentAddress as Address],
      })) as {
        allowedProtocols: bigint
        allowedPositionTypes: number
        maxPositionSizeUsdc: bigint
        maxDailySpendUsdc: bigint
        ensNode: `0x${string}`
      }

      const walletClient = createWalletClient({
        account,
        chain: sepolia,
        transport: custom(provider),
      })

      const hash = await walletClient.writeContract({
        address: PERMISSION_MIRROR_ADDRESS,
        abi: PERMISSION_MIRROR_ABI,
        functionName: 'sync',
        args: [agentAddress as Address, revokedScope(current)],
      })

      setTxHash(hash)
      await publicClient.waitForTransactionReceipt({ hash })
      setState('revoked')
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err)
      // Wallet rejection is a normal outcome, not a failure worth shouting about.
      setErrorMsg(/user rejected|denied/i.test(raw) ? 'Signature rejected in wallet.' : raw)
      setState('error')
    }
  }

  if (state === 'revoked') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400">
          ✕
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-red-400">Authority Revoked</p>
          <p className="text-xs text-[var(--text-3)]">
            Scope expiry set to the past · agent cannot execute trades
          </p>
          {txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-sky-400 hover:underline"
            >
              {txHash.slice(0, 10)}…{txHash.slice(-8)} ↗
            </a>
          )}
        </div>
        <button
          onClick={() => {
            setState('idle')
            setTxHash(null)
          }}
          className="ml-auto shrink-0 text-xs text-[var(--text-3)] underline hover:text-[var(--text-2)]"
        >
          Reset view
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
        <p className="text-sm font-semibold text-amber-400">Revocation not completed</p>
        <p className="mt-1 text-xs text-[var(--text-2)]">{errorMsg}</p>
        <button
          onClick={() => setState('idle')}
          className="mt-3 rounded border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
        >
          Back
        </button>
      </div>
    )
  }

  if (state === 'confirm') {
    return (
      <div className="rounded-lg border border-red-500/40 bg-red-500/8 p-4">
        <p className="text-sm font-semibold text-red-400">Confirm Authority Revocation</p>
        <p className="mt-1 text-xs text-[var(--text-2)]">
          This writes an expired permission scope to PermissionMirror, so{' '}
          <span className="font-mono">isAuthorized()</span> returns false immediately and the
          agent can execute no further trades. You will sign this in your own wallet — it
          requires the relayer account and Sepolia gas.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleRevoke}
            className="rounded bg-red-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 active:scale-95"
          >
            Sign &amp; Revoke
          </button>
          <button
            onClick={() => setState('idle')}
            className="rounded border border-[var(--border)] px-4 py-1.5 text-xs text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-[var(--text)]">Kill Switch</p>
        <p className="text-xs text-[var(--text-3)]">
          Revoke agent authority on-chain · signed by the owner, not the server
        </p>
      </div>
      <button
        onClick={() => setState('confirm')}
        disabled={state === 'revoking'}
        className="flex shrink-0 items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:border-red-500 hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
      >
        {state === 'revoking' ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin rounded-full border border-red-400 border-t-transparent" />
            Awaiting signature…
          </>
        ) : (
          <>✕ Revoke Authority</>
        )}
      </button>
    </div>
  )
}

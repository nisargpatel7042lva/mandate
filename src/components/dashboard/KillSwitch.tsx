'use client'

// Kill switch — revokes the agent's authority on-chain.
// Signed by the owner in their own wallet via EIP-1193. Never server-side.
// PermissionMirror gates sync() on msg.sender == relayer.

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

type Eip1193 = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
}
function getProvider(): Eip1193 | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null
}

function extractError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null) {
    const o = err as Record<string, unknown>
    if (typeof o.shortMessage === 'string') return o.shortMessage
    if (typeof o.message === 'string') return o.message
    if (typeof o.details === 'string') return o.details
  }
  return String(err)
}

export function KillSwitch({ agentAddress }: { agentAddress: string }) {
  const [state, setState] = useState<State>('idle')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleRevoke() {
    setState('revoking')
    setErrorMsg(null)

    try {
      const provider = getProvider()
      if (!provider) throw new Error('No browser wallet found. Connect MetaMask on Sepolia.')

      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
      const account = accounts?.[0] as Address | undefined
      if (!account) throw new Error('No account authorised in the wallet.')

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

      const relayer = (await publicClient.readContract({
        address: PERMISSION_MIRROR_ADDRESS,
        abi: PERMISSION_MIRROR_ABI,
        functionName: 'relayer',
      })) as Address

      if (relayer.toLowerCase() !== account.toLowerCase()) {
        throw new Error(
          `Connected account ${account.slice(0, 6)}…${account.slice(-4)} is not the relayer ` +
          `(${relayer.slice(0, 6)}…${relayer.slice(-4)}). Only the relayer can revoke.`
        )
      }

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
      const raw = extractError(err)
      setErrorMsg(/user rejected|denied/i.test(raw) ? 'Signature rejected in wallet.' : raw)
      setState('error')
    }
  }

  if (state === 'revoked') {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-400">✕</div>
          <div>
            <p className="text-sm font-semibold text-red-400">Authority revoked</p>
            <p className="text-xs text-[var(--text-3)]">Scope expiry set to the past · agent cannot execute</p>
          </div>
        </div>
        {txHash && (
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block font-mono text-[10px] text-sky-400 hover:underline"
          >
            {txHash.slice(0, 12)}…{txHash.slice(-8)} ↗
          </a>
        )}
        <button
          onClick={() => { setState('idle'); setTxHash(null) }}
          className="mt-3 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
        >
          Reset view
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="rounded-xl border border-red-500/20 bg-[var(--surface)] p-4">
        <p className="text-sm font-semibold text-red-400">Revocation not completed</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-2)]">{errorMsg}</p>
        <button
          onClick={() => setState('idle')}
          className="mt-3 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
        >
          Back
        </button>
      </div>
    )
  }

  if (state === 'confirm') {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
        <p className="text-sm font-semibold text-red-400">Confirm revocation</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text-2)]">
          You will sign a <span className="font-mono text-[var(--text)]">sync()</span> call in your wallet on Sepolia.
          Only the relayer account can do this.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleRevoke}
            className="rounded-lg bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-400 ring-1 ring-inset ring-red-500/25 transition hover:bg-red-500/25"
          >
            Sign &amp; revoke
          </button>
          <button
            onClick={() => setState('idle')}
            className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">Kill Switch</p>
          <p className="mt-0.5 text-xs text-[var(--text-3)]">
            Writes an expired scope to PermissionMirror on Sepolia.
            Signed in your own wallet — never by this server.
          </p>
        </div>
        <button
          onClick={() => setState('confirm')}
          disabled={state === 'revoking'}
          className="shrink-0 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 ring-1 ring-inset ring-red-500/20 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          {state === 'revoking' ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-red-400 border-t-transparent" />
              Awaiting signature…
            </span>
          ) : (
            '✕ Revoke'
          )}
        </button>
      </div>
    </div>
  )
}

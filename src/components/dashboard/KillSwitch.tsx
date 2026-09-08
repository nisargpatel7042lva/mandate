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
      <div className="panel panel-deny p-4 stamp">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-deny/15 text-deny">✕</div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-deny">Authority revoked</p>
            <p className="text-[11.5px] text-text-3">Scope expiry set to the past · agent cannot execute</p>
          </div>
        </div>
        {txHash && (
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            className="mt-3 block font-mono text-[11px] text-chain hover:underline">
            {txHash.slice(0, 12)}…{txHash.slice(-8)} ↗
          </a>
        )}
        <button onClick={() => { setState('idle'); setTxHash(null) }} className="btn btn-ghost mt-3 !px-2 text-[12px]">Reset view</button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="panel p-4 shake" style={{ borderColor: 'rgb(var(--seal-rgb)/.4)' }}>
        <p className="text-sm font-semibold text-seal">Revocation not completed</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-2">{errorMsg}</p>
        <button onClick={() => setState('idle')} className="btn mt-3 text-[12px]">Back</button>
      </div>
    )
  }

  if (state === 'confirm') {
    return (
      <div className="panel panel-deny p-4">
        <p className="text-sm font-semibold text-deny">Confirm revocation</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-2">
          You will sign a <span className="font-mono text-text">sync()</span> in your wallet on Sepolia. Only the relayer account can do this.
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={handleRevoke} className="btn btn-deny">Sign &amp; revoke</button>
          <button onClick={() => setState('idle')} className="btn">Cancel</button>
        </div>
      </div>
    )
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold">Revoke authority</p>
          <p className="text-[11.5px] text-text-3">One signature. Takes effect next block.</p>
        </div>
        <button onClick={() => setState('confirm')} disabled={state === 'revoking'} className="btn btn-deny shrink-0">
          {state === 'revoking'
            ? <><span className="spin inline-block h-3 w-3 rounded-full border border-deny border-t-transparent" /> Awaiting signature…</>
            : <>✕ Revoke</>}
        </button>
      </div>
    </div>
  )
}

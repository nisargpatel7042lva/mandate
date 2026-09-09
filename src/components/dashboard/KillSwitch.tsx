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
import { Panel } from '@/components/ui/Panel'
import { TxLink } from '@/components/ui/TxLink'

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
      <Panel tone="deny" className="p-4 stamp">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-deny/15 text-deny">✕</div>
          <div>
            <p className="text-[13.5px] font-medium text-deny">Authority revoked</p>
            <p className="text-[11.5px] text-text-3">Scope expiry set to the past · agent cannot execute</p>
          </div>
        </div>
        {txHash && <div className="mt-3"><TxLink hash={txHash} chain="sepolia" head={12} tail={8} /></div>}
        <button onClick={() => { setState('idle'); setTxHash(null) }} className="btn btn-ghost mt-3 !h-8 !px-2 text-[11.5px]">
          Reset view
        </button>
      </Panel>
    )
  }

  if (state === 'error') {
    return (
      <Panel className="p-4">
        <p className="text-[13.5px] font-medium text-deny">Revocation not completed</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-2">{errorMsg}</p>
        <button onClick={() => setState('idle')} className="btn mt-3 !h-8 text-[11.5px]">Back</button>
      </Panel>
    )
  }

  if (state === 'confirm') {
    return (
      <Panel tone="deny" className="p-4">
        <p className="text-[13.5px] font-medium text-deny">Confirm revocation</p>
        <p className="mt-1 text-[12px] leading-relaxed text-text-2">
          You will sign a <span className="hash text-text">sync()</span> call in your wallet on Sepolia.
          Only the relayer account can do this.
        </p>
        <div className="mt-4 flex gap-2">
          <button onClick={handleRevoke} className="btn btn-deny">Sign &amp; revoke</button>
          <button onClick={() => setState('idle')} className="btn btn-ghost">Cancel</button>
        </div>
      </Panel>
    )
  }

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[13.5px] font-medium text-white">Kill switch</p>
          <p className="mt-0.5 text-[11.5px] text-text-3">
            Writes an expired scope to PermissionMirror. Signed in your own wallet — never by this server.
          </p>
        </div>
        <button onClick={() => setState('confirm')} disabled={state === 'revoking'} className="btn btn-deny shrink-0">
          {state === 'revoking' ? (
            <span className="flex items-center gap-2">
              <span className="spin inline-block h-3 w-3 rounded-full border border-deny border-t-transparent" />
              Awaiting signature…
            </span>
          ) : (
            '✕ Revoke'
          )}
        </button>
      </div>
    </Panel>
  )
}

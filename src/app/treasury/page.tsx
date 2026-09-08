// Screen D: Treasury — Phase 6 (Sept 8–9), updated Phase 9 (settlements live)
// Live: Arc testnet USDC balance (via viem getBalance, native currency on Arc).
// Live: authorization trail from the Mandate subgraph (PermissionUpdate tx hashes on Sepolia).
// Live: Arc settlement history via ArcScan txlist API (Phase 5 complete, real USDC transfers).

import { getArcBalance, getArcSettlements, arcExplorerTx, arcExplorerAddr } from '@/lib/arc-data'
import { getAgentLiveData, LIVE_AGENT } from '@/lib/server-data'
import { fetchRecentUpdates, type MandatePermissionUpdate } from '@/lib/mandate-subgraph'
import { fmtUsdc, fmtExpiry, shortAddr } from '@/lib/example-data'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const PROTOCOL_LABELS: Record<string, string> = {
  'uniswap-v3': 'Uniswap v3',
  'curve': 'Curve',
  'aave-v3': 'Aave v3',
  '1inch': '1inch',
  'gmx-perp': 'GMX Perps',
  'compound-v3': 'Compound v3',
}

function BalanceRing({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const r = 40
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width="100" height="100" className="-rotate-90">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
      />
    </svg>
  )
}

function fmtBlock(n: number): string {
  return n.toLocaleString('en-US')
}

function fmtTs(unixSecs: number): string {
  return new Date(unixSecs * 1000).toLocaleString('en-US', {
    month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  })
}

function sepoliaExplorerTx(hash: string): string {
  return `https://sepolia.etherscan.io/tx/${hash}`
}

export default async function TreasuryPage() {
  const [arcData, agentData, updates, settlementsData] = await Promise.all([
    getArcBalance(LIVE_AGENT.address),
    getAgentLiveData(),
    fetchRecentUpdates(LIVE_AGENT.address).catch((): MandatePermissionUpdate[] => []),
    getArcSettlements(LIVE_AGENT.address),
  ])

  const dailyLimit = agentData.maxDailySpendUsdc ?? 50_000
  const expiry = agentData.scopeExpiry ? fmtExpiry(agentData.scopeExpiry) : '—'

  const allLive = !arcData.fetchError && !agentData.fetchError

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Data source notice */}
      {arcData.fetchError && agentData.fetchError ? (
        <div className="rounded border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-400">
          Arc RPC error: {arcData.fetchError} · Subgraph error: {agentData.fetchError}
        </div>
      ) : arcData.fetchError ? (
        <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
          Arc RPC unavailable: {arcData.fetchError} · Balance shown as zero
        </div>
      ) : agentData.fetchError ? (
        <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
          Subgraph unavailable: {agentData.fetchError} · Balance data is live
        </div>
      ) : (
        <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-400">
          Live · Arc testnet block {fmtBlock(arcData.blockNumber)} · USDC balance via{' '}
          <a
            href={arcExplorerAddr(LIVE_AGENT.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-emerald-300"
          >
            ArcScan
          </a>{' '}
          · {updates.length > 0 ? `${updates.length} authorization event${updates.length !== 1 ? 's' : ''} indexed` : 'Mandate subgraph syncing'}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text)]">Treasury</h1>
        <span className="font-mono text-xs text-[var(--text-3)]">{LIVE_AGENT.ensName}</span>
      </div>

      {/* Balance overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Arc wallet balance */}
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="relative">
              <BalanceRing value={arcData.balanceUsdc} max={Math.max(arcData.balanceUsdc, dailyLimit)} color="#22c55e" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-[var(--text-3)]">USDC</span>
                <span className="font-mono text-xs font-semibold text-[var(--text)]">
                  {arcData.balanceUsdc > 0
                    ? `${Math.round((arcData.balanceUsdc / Math.max(arcData.balanceUsdc, dailyLimit)) * 100)}%`
                    : '0%'}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Arc Wallet</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--text)]">
                {fmtUsdc(arcData.balanceUsdc)}
              </p>
              <p className="text-xs text-[var(--text-3)]">
                {arcData.fetchError ? 'RPC error' : `block ${fmtBlock(arcData.blockNumber)}`}
              </p>
              {allLive && arcData.balanceUsdc === 0 && (
                <p className="mt-1 text-[10px] text-amber-400/70">
                  Fund via Phase 5 Circle deposit
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Daily scope */}
        <Card>
          <CardBody className="flex items-center gap-4">
            <div className="relative">
              <BalanceRing value={0} max={dailyLimit} color="#0ea5e9" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-[var(--text-3)]">today</span>
                <span className="font-mono text-xs font-semibold text-[var(--text)]">0%</span>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Daily Scope</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--text)]">
                {agentData.maxDailySpendUsdc !== null ? fmtUsdc(agentData.maxDailySpendUsdc) : '—'}
              </p>
              <p className="text-xs text-[var(--text-3)]">limit · expires {expiry}</p>
            </div>
          </CardBody>
        </Card>

        {/* Authorization events */}
        <Card>
          <CardBody className="flex flex-col justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-3)]">Authorizations</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--text)]">
                {agentData.syncCount ?? '—'}
              </p>
              <p className="text-xs text-[var(--text-3)]">
                permission sync{agentData.syncCount !== 1 ? 's' : ''} on Sepolia
              </p>
            </div>
            {agentData.allowedProtocols.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {agentData.allowedProtocols.map(p => (
                  <Badge key={p} variant="success">{PROTOCOL_LABELS[p] ?? p}</Badge>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Authorization trail — real Mandate subgraph PermissionUpdate events */}
      <Card>
        <CardHeader>
          <CardTitle>Authorization Trail</CardTitle>
          <span className="text-xs text-[var(--text-3)]">
            PermissionSynced events · Mandate subgraph · Sepolia
          </span>
        </CardHeader>
        <CardBody>
          {updates.length === 0 ? (
            <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-3 text-xs text-amber-400">
              {agentData.fetchError
                ? 'Subgraph unavailable — set NEXT_PUBLIC_MANDATE_SUBGRAPH_URL to load'
                : 'No authorization events indexed yet'}
            </div>
          ) : (
            <ol className="flex flex-col gap-0">
              {updates.map((u, i) => {
                const ts = parseInt(u.blockTimestamp, 10)
                const txHex = u.transactionHash.startsWith('0x')
                  ? u.transactionHash
                  : `0x${u.transactionHash}`
                return (
                  <li key={u.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-400">
                        ✓
                      </div>
                      {i < updates.length - 1 && (
                        <div className="my-1 w-px flex-1 bg-[var(--border)]" />
                      )}
                    </div>
                    <div className="pb-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--text)]">
                          Permission Sync #{updates.length - i}
                        </p>
                        <Badge variant="success">authorized</Badge>
                      </div>
                      <p className="mt-0.5 font-mono text-xs text-[var(--text-3)]">
                        Block {parseInt(u.blockNumber, 10).toLocaleString()} · {ts ? fmtTs(ts) : '—'}
                      </p>
                      <a
                        href={sepoliaExplorerTx(txHex)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 font-mono text-[10px] text-[var(--text-3)] underline hover:text-[var(--text-2)]"
                      >
                        {shortAddr(txHex)} ↗
                      </a>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </CardBody>
      </Card>

      {/* Arc settlement history — live from ArcScan txlist API */}
      <Card>
        <CardHeader>
          <CardTitle>Arc Settlement History</CardTitle>
          <Badge variant={settlementsData.settlements.length > 0 ? 'success' : 'neutral'}>
            {settlementsData.settlements.length > 0
              ? `${settlementsData.settlements.length} settlement${settlementsData.settlements.length !== 1 ? 's' : ''} · live`
              : 'Arc testnet · USDC'}
          </Badge>
        </CardHeader>

        {settlementsData.fetchError && (
          <div className="mx-4 mb-2 rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
            ArcScan unavailable: {settlementsData.fetchError}
          </div>
        )}

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_100px_100px_130px] gap-4 border-b border-[var(--border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-3)]">
          <span>Block · Time</span>
          <span className="text-right">Amount</span>
          <span className="text-center">Status</span>
          <span>Explorer</span>
        </div>

        {settlementsData.settlements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-3)]">
              ⟳
            </div>
            <p className="text-sm font-medium text-[var(--text-2)]">No settlements yet</p>
            <p className="text-xs text-[var(--text-3)]">
              Arc USDC transfers from the agent wallet appear here in real time.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {settlementsData.settlements.map(s => {
              const date = new Date(s.timestamp * 1000)
              const dateStr = date.toLocaleString('en-US', {
                month: 'short', day: '2-digit',
                hour: '2-digit', minute: '2-digit',
                hour12: false,
              })
              return (
                <div
                  key={s.txHash}
                  className="grid grid-cols-[1fr_100px_100px_130px] gap-4 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-mono text-xs text-[var(--text)]">
                      Block {s.blockNumber.toLocaleString()}
                    </p>
                    <p className="font-mono text-[10px] text-[var(--text-3)]">{dateStr}</p>
                  </div>
                  <p className="self-center text-right font-mono text-xs font-semibold text-emerald-400">
                    {s.amountUsdc < 1
                      ? `$${s.amountUsdc.toFixed(2)}`
                      : `$${s.amountUsdc.toLocaleString('en-US', { maximumFractionDigits: 2 })}`}
                  </p>
                  <div className="flex items-center justify-center">
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${
                      s.success
                        ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 ring-red-500/20'
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${s.success ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      {s.success ? 'Settled' : 'Failed'}
                    </span>
                  </div>
                  <a
                    href={arcExplorerTx(s.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="self-center font-mono text-[10px] text-[var(--text-3)] underline hover:text-[var(--text-2)]"
                  >
                    {shortAddr(s.txHash)} ↗
                  </a>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Agent Arc address */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Arc Wallet</CardTitle>
          <Badge variant="success">Arc testnet · funded</Badge>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-[var(--text-2)]">
            Funded via{' '}
            <a
              href="https://faucet.circle.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-[var(--text)]"
            >
              faucet.circle.com
            </a>
            . Settlements are native USDC value transfers — no token contract, no approval.
          </p>
          <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
            <p className="text-xs text-[var(--text-3)]">Agent Arc address</p>
            <a
              href={arcExplorerAddr(LIVE_AGENT.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block font-mono text-xs text-[var(--text-2)] underline hover:text-[var(--text)]"
            >
              {LIVE_AGENT.address}
            </a>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

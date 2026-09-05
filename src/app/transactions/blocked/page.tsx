// Screen C: Blocked Transaction Detail — the demo-video moment
// Designed to be legible at a glance: WHY it failed is the hero element
// EXAMPLE_DATA: all values are placeholder — wire to MandateGate events in Phase 3

import { EXAMPLE_BLOCKED_TX, EXAMPLE_AGENT, fmtUsdc, fmtTime, shortAddr } from '@/lib/example-data'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card'

const PROTOCOL_LABELS: Record<string, string> = {
  'uniswap-v3': 'Uniswap v3',
  'curve': 'Curve',
  'aave-v3': 'Aave v3',
}

export default function BlockedTransactionPage() {
  const tx = EXAMPLE_BLOCKED_TX
  const agent = EXAMPLE_AGENT

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Example data notice */}
      <div className="rounded border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
        Example data · Wire to MandateGate revert events + ERC-8004 subgraph in Phase 3
      </div>

      {/* ── HERO: Blocked indicator ── legible at a glance ── */}
      <div className="rounded-xl border-2 border-red-500/40 bg-red-500/5 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Large X icon */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-3xl text-red-400">
              ✕
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-red-500">
                  Transaction Blocked
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="font-mono text-xs text-[var(--text-3)]">
                  {fmtTime(tx.timestamp)}
                </span>
              </div>

              {/* THE REASON — hero text */}
              <h1 className="mt-1 text-2xl font-bold text-red-400 sm:text-3xl">
                Protocol Not in Allowlist
              </h1>
              <p className="mt-1 text-[var(--text-2)]">
                <span className="font-mono font-semibold text-[var(--text)]">
                  {tx.attemptedProtocol}
                </span>{' '}
                is not authorized for this agent
              </p>
            </div>
          </div>

          {/* Block number */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-wider text-[var(--text-3)]">Block</p>
            <p className="font-mono text-lg text-[var(--text)]">
              #{tx.blockNumber?.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Revert reason */}
        <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2">
          <span className="text-xs font-semibold text-red-400">MandateGate revert: </span>
          <span className="font-mono text-xs text-red-300">{tx.revertReason}</span>
        </div>
      </div>

      {/* Attempted transaction details */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attempted Transaction</CardTitle>
          </CardHeader>
          <CardBody>
            <dl className="flex flex-col gap-3">
              {[
                { label: 'Agent',    value: agent.ensName, mono: true },
                { label: 'Protocol', value: tx.protocol,   highlight: true },
                { label: 'Action',   value: tx.action },
                { label: 'Asset',    value: tx.asset,      mono: true },
                { label: 'Amount',   value: fmtUsdc(tx.amountUsdc), mono: true },
                { label: 'Wallet',   value: shortAddr(agent.agentWallet), mono: true },
              ].map(({ label, value, mono, highlight }) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <dt className="text-xs text-[var(--text-3)]">{label}</dt>
                  <dd className={`text-right text-sm ${
                    highlight ? 'font-semibold text-red-400' :
                    mono ? 'font-mono text-[var(--text-2)]' : 'text-[var(--text)]'
                  }`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        {/* Authorized protocols — what they CAN do */}
        <Card>
          <CardHeader>
            <CardTitle>Agent May Use Instead</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="mb-3 text-xs text-[var(--text-3)]">
              These protocols are within scope for{' '}
              <span className="font-mono">{agent.ensName}</span>:
            </p>
            <div className="flex flex-col gap-2">
              {agent.permissions.allowedProtocols.map(p => (
                <div
                  key={p}
                  className="flex items-center gap-2 rounded-md bg-emerald-500/5 px-3 py-2 ring-1 ring-emerald-500/20"
                >
                  <span className="text-emerald-400">✓</span>
                  <span className="text-sm text-[var(--text)]">
                    {PROTOCOL_LABELS[p] ?? p}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 border-t border-[var(--border)] pt-3">
              <p className="text-xs text-[var(--text-3)]">Position limits</p>
              <p className="mt-1 font-mono text-sm text-[var(--text)]">
                Max {fmtUsdc(agent.permissions.maxPositionSizeUsdc)} / trade
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Enforcement chain — the trace */}
      <Card>
        <CardHeader>
          <CardTitle>Enforcement Chain</CardTitle>
          <span className="text-xs text-[var(--text-3)]">MandateGate execution trace</span>
        </CardHeader>
        <CardBody>
          <ol className="flex flex-col gap-0">
            {tx.enforcementChain.map((step, i) => (
              <li key={i} className="flex gap-4">
                {/* Connector line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`mt-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold
                      ${step.result === 'pass'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                      }`}
                  >
                    {step.result === 'pass' ? '✓' : '✕'}
                  </div>
                  {i < tx.enforcementChain.length - 1 && (
                    <div className="my-1 w-px flex-1 bg-[var(--border)]" />
                  )}
                </div>
                <div className="pb-4">
                  <p
                    className={`text-sm font-medium ${
                      step.result === 'pass' ? 'text-[var(--text)]' : 'text-red-400'
                    }`}
                  >
                    {step.step}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-[var(--text-3)]">
                    {step.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
        >
          ← Back to Dashboard
        </Link>
        <Link
          href="/"
          className="rounded-md border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-2)] transition hover:bg-[var(--surface-2)]"
        >
          View Agent Scope
        </Link>
      </div>
    </div>
  )
}

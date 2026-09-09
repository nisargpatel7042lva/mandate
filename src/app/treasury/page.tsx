// Treasury — the Arc wallet, what has moved, and the Sepolia authorisations that let it.

import { getArcBalance, getArcSettlements } from '@/lib/arc-data'
import { getAgentLiveData, LIVE_AGENT } from '@/lib/server-data'
import { fetchRecentUpdates, type MandatePermissionUpdate } from '@/lib/mandate-subgraph'
import { usd, untilExpiry, fmtTs, EXPLORER, shortAddr, protocolLabel } from '@/lib/format'
import { Panel, PanelHead, Stat } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/Chip'
import { Gauge } from '@/components/ui/Gauge'
import { TxLink } from '@/components/ui/TxLink'
import { CountUp } from '@/components/ui/CountUp'
import { BalancePulse } from '@/components/live/BalancePulse'

export default async function TreasuryPage() {
  const [arc, agent, updates, settlementsData] = await Promise.all([
    getArcBalance(LIVE_AGENT.address),
    getAgentLiveData(),
    fetchRecentUpdates(LIVE_AGENT.address).catch((): MandatePermissionUpdate[] => []),
    getArcSettlements(LIVE_AGENT.address),
  ])
  const daily = agent.maxDailySpendUsdc ?? 0
  const exp = untilExpiry(agent.scopeExpiry)
  const settlements = settlementsData.settlements
  const ok = settlements.filter(s => s.success)
  const total = ok.reduce((a, s) => a + s.amountUsdc, 0)
  const avg = ok.length ? total / ok.length : 0
  const covers = avg > 0 ? Math.floor(arc.balanceUsdc / avg) : null // settlements the balance could fund at the observed average

  return (
    <div className="flex flex-col gap-5">
      <div className="reveal flex flex-wrap items-end justify-between gap-3" style={{ ['--i' as string]: 0 }}>
        <div>
          <div className="eyebrow">Treasury</div>
          <h1 className="mt-1 text-[32px] font-medium leading-[1.05] tracking-[-0.04em] text-white sm:text-[40px]">Native USDC on Arc. <em className="display text-text-2">No approvals, no wrappers.</em></h1>
        </div>
        <div className="flex items-center gap-2 text-[12px]">
          {arc.fetchError ? <Chip tone="deny" dot>Arc RPC error</Chip> : <Chip tone="chain" live>Arc · block {arc.blockNumber.toLocaleString()}</Chip>}
          <a href={EXPLORER.arcAddr(LIVE_AGENT.address)} target="_blank" rel="noopener noreferrer" className="font-mono text-text-3 hover:text-chain">{shortAddr(LIVE_AGENT.address)} ↗</a>
        </div>
      </div>

      {/* Balance hero */}
      <section className="grid gap-4 lg:grid-cols-12">
        <Panel className="reveal relative overflow-hidden p-6 lg:col-span-7" style={{ ['--i' as string]: 1 }}>
                    <div className="eyebrow">Agent wallet · Arc testnet</div>
          <div className="num mt-3 text-[64px] font-bold leading-none tracking-tight text-text sm:text-[80px]">
            <span className="text-text-3">$</span><CountUp value={arc.balanceUsdc} decimals={2} duration={1400} startFrom={0} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-text-3">
            <span>USDC is Arc&apos;s gas token, so this is <span className="text-text-2">eth_getBalance</span>, not an ERC-20</span>
            <BalancePulse initialBlock={arc.blockNumber} />
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-line pt-4">
            <Stat label="Settled · all time" value={usd(total, { cents: true })} sub={`${ok.length} transfer${ok.length === 1 ? '' : 's'}`} tone="allow" />
            <Stat label="Daily cap" value={usd(daily, { cents: false })} sub={`scope valid ${exp.label}`} tone="seal" />
            <Stat label="Balance covers" value={covers === null ? '—' : `${covers.toLocaleString('en-US')}×`} sub={avg > 0 ? `settlements at avg ${usd(avg, { cents: true })}` : 'no settlements yet'} tone="chain" />
          </div>
        </Panel>

        <div className="reveal flex flex-col gap-3 lg:col-span-5" style={{ ['--i' as string]: 2 }}>
          <Panel className="flex items-center gap-4 p-4" hover>
            <Gauge pct={daily > 0 ? Math.min(100, (arc.balanceUsdc / daily) * 100) : 0} size={84} stroke={7} tone="chain"
              label={<span className="num text-[13px] font-bold">{daily > 0 ? `${Math.min(100, (arc.balanceUsdc / daily) * 100).toFixed(2)}%` : '—'}</span>} />
            <div>
              <div className="eyebrow">Balance vs daily cap</div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-text-2">The wallet holds a fraction of one day&apos;s ceiling. The cap is the guardrail, the balance is the blast radius.</p>
            </div>
          </Panel>
          <Panel className="p-4" hover>
            <div className="flex items-center justify-between"><div className="eyebrow">Authorisations on Sepolia</div><span className="num text-lg font-semibold text-text">{agent.syncCount ?? '—'}</span></div>
            <div className="mt-2 flex flex-wrap gap-1.5">{agent.allowedProtocols.map(p => <Chip key={p} tone="allow">{protocolLabel(p)}</Chip>)}</div>
            <p className="mt-2 text-[11px] text-text-3">Each sync is a PermissionSynced event written by the relayer from the ENS record.</p>
          </Panel>
          <Panel className="p-4" hover>
            <div className="eyebrow">Fund</div>
            <p className="mt-1 text-[12.5px] text-text-2">Top up from <a className="text-chain hover:underline" href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer">faucet.circle.com</a>. Settlements draw from this address only.</p>
            <a href={EXPLORER.arcAddr(LIVE_AGENT.address)} target="_blank" rel="noopener noreferrer" className="mt-2 block truncate rounded-md border border-line bg-bg-2 px-2.5 py-1.5 font-mono text-[11px] text-text-2 hover:text-chain">{LIVE_AGENT.address}</a>
          </Panel>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        {/* Settlements */}
        <Panel className="reveal overflow-hidden lg:col-span-7" style={{ ['--i' as string]: 3 }}>
          <PanelHead title="Settlement history" right={<span>ArcScan txlist · outbound from agent</span>} />
          {settlementsData.fetchError && <div className="m-3 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-[12px] text-warn">ArcScan unavailable: {settlementsData.fetchError}</div>}
          {settlements.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] text-text-3">No settlements yet. Outbound USDC appears here within a block.</div>
          ) : (
            <table className="w-full text-[12.5px]">
              <thead><tr className="eyebrow border-b border-line text-left"><th className="px-4 py-2 font-semibold">When</th><th className="px-2 py-2 font-semibold">To</th><th className="px-2 py-2 text-right font-semibold">Amount</th><th className="px-4 py-2 text-right font-semibold">Tx</th></tr></thead>
              <tbody className="divide-y divide-line">
                {settlements.map((s, i) => (
                  <tr key={s.txHash} className="group transition hover:bg-surface-2/60 reveal" style={{ ['--i' as string]: i + 3 }}>
                    <td className="px-4 py-2.5"><div className="text-text">{fmtTs(s.timestamp)}</div><div className="font-mono text-[10.5px] text-text-3">block {s.blockNumber.toLocaleString()}</div></td>
                    <td className="px-2 py-2.5 font-mono text-[11px] text-text-2">{shortAddr(s.to)}</td>
                    <td className={`num px-2 py-2.5 text-right font-semibold ${s.success ? 'text-allow' : 'text-deny'}`}>{s.success ? '−' : ''}{usd(s.amountUsdc, { cents: true })}</td>
                    <td className="px-4 py-2.5 text-right"><Chip tone={s.success ? 'allow' : 'deny'} dot className="mr-2">{s.success ? 'settled' : 'failed'}</Chip><TxLink hash={s.txHash} chain="arc" head={6} tail={4} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        {/* Authorisation trail */}
        <Panel className="reveal overflow-hidden lg:col-span-5" style={{ ['--i' as string]: 4 }}>
          <PanelHead title="Authorisation trail" right={<span>Mandate subgraph · Sepolia</span>} />
          <div className="p-4">
            {updates.length === 0 ? (
              <div className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-[12px] text-warn">{agent.fetchError ? 'Subgraph unavailable' : 'No authorisation events indexed yet'}</div>
            ) : (
              <ol className="relative ml-2 border-l border-line pl-5">
                {updates.map((u, i) => {
                  const ts = parseInt(u.blockTimestamp, 10)
                  return (
                    <li key={u.id} className="relative pb-5 last:pb-0 reveal" style={{ ['--i' as string]: i + 4 }}>
                      <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-bg ${i === 0 ? 'bg-white' : 'bg-line-2'}`} />
                      <div className="flex items-center gap-2"><span className="text-[13px] font-semibold text-text">Permission sync #{updates.length - i}</span>{i === 0 && <Chip tone="seal">current</Chip>}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-text-3">block {parseInt(u.blockNumber, 10).toLocaleString()} · {ts ? fmtTs(ts, true) : '—'}</div>
                      <TxLink hash={u.transactionHash} chain="sepolia" />
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </Panel>
      </section>
    </div>
  )
}

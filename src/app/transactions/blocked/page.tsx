// Incident — the reference blocked attempt. WHY it failed is the hero.
// The enforcement chain is a live composeRiskScore run against gmx-perp.

import Link from 'next/link'
import { getBlockedScenario, LIVE_AGENT, getAgentLiveData } from '@/lib/server-data'
import type { CheckStep } from '@/app/api/check/route'
import { Pipeline, type StepState } from '@/components/enforcement/Pipeline'
import { Panel, PanelHead } from '@/components/ui/Panel'
import { Chip } from '@/components/ui/Chip'
import { protocolLabel, usd, shortAddr } from '@/lib/format'
import { TRUST_THRESHOLD } from '@/lib/underwriting'

function toSteps(reasons: string[], trust: number): CheckStep[] {
  const find = (...needles: string[]) => reasons.find(r => needles.every(n => r.includes(n)))
  const trustFail = find('TrustScore', '< threshold')
  const scopeFail = find('No permission scope') ?? find('expired')
  const protoFail = reasons.find(r => r.includes('not in allowlist') || r.includes('Unknown protocol'))
  const sizeFail = find('max position size')
  const dailyFail = find('daily limit')
  return [
    { id: 'trust',    label: 'Trust score',        detail: trustFail ?? `Score ${trust.toFixed(1)} · above threshold ${TRUST_THRESHOLD}`, status: trustFail ? 'fail' : 'pass' },
    { id: 'scope',    label: 'Permission scope',   detail: scopeFail ?? 'Scope record found · within validity', status: scopeFail ? 'fail' : 'pass' },
    { id: 'protocol', label: 'Protocol allowlist', detail: protoFail ?? 'Protocol is authorised', status: protoFail ? 'fail' : 'pass' },
    { id: 'size',     label: 'Position size',      detail: sizeFail ?? 'Within max position size', status: sizeFail ? 'fail' : 'pass' },
    { id: 'daily',    label: 'Daily spending cap', detail: dailyFail ?? 'Within daily cap', status: dailyFail ? 'fail' : 'pass' },
  ]
}

export default async function IncidentPage() {
  const [scenario, agent] = await Promise.all([getBlockedScenario(), getAgentLiveData()])
  const steps = toSteps(scenario.reasons, scenario.trustScore)
  const firstFail = steps.findIndex(s => s.status === 'fail')
  const states: StepState[] = steps.map((s, i) => firstFail >= 0 && i > firstFail ? 'skip' : s.status === 'fail' ? 'fail' : 'pass')
  const failed = firstFail >= 0 ? steps[firstFail] : null
  const title = failed?.id === 'protocol' ? 'Protocol not in allowlist' : failed?.id === 'trust' ? 'Trust score too low' : failed?.id === 'scope' ? 'Scope invalid' : failed?.id === 'size' ? 'Position size exceeded' : failed?.id === 'daily' ? 'Daily cap exceeded' : 'Blocked'

  return (
    <div className="flex flex-col gap-5">
      <div className="reveal flex flex-wrap items-center gap-2 text-[12px]" style={{ ['--i' as string]: 0 }}>
        {scenario.fetchError ? <Chip tone="warn" dot>Live enforcement unavailable · {scenario.fetchError}</Chip> : <Chip tone="deny" live>Live enforcement check</Chip>}
        <span className="text-text-3">{protocolLabel(scenario.protocol)} vs <span className="font-mono text-text-2">{LIVE_AGENT.ensName}</span> · real composeRiskScore run</span>
      </div>

      <section className="reveal panel panel-deny ticks relative overflow-hidden p-6" style={{ ['--i' as string]: 1 }}>
        <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-deny/10 blur-3xl" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="eyebrow text-deny">Incident · transaction blocked</div>
            <h1 className="display mt-2 text-[44px] leading-[1] text-deny text-glow-deny sm:text-[56px]">{title}.</h1>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-text-2">
              <span className="font-mono text-text">{protocolLabel(scenario.protocol)}</span> · {scenario.action} · {usd(scenario.amountUsdc, { cents: false })}.
              The agent reached for a venue outside its published mandate. No money moved.
            </p>
            {failed && <div className="mt-4 inline-block rounded-lg border border-deny/30 bg-deny/5 px-3 py-2 font-mono text-[11.5px] text-deny">MandateGate revert: {failed.detail}</div>}
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href={`/execute?protocol=${scenario.protocol}&amount=${scenario.amountUsdc}&run=1`} className="btn btn-seal">Replay in simulator</Link>
              <Link href="/dashboard" className="btn">Ledger</Link>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-line bg-bg-2/70 p-4">
              <div className="eyebrow">Enforcement chain</div>
              <div className="mt-3"><Pipeline steps={steps} states={states} compact stagger /></div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-12">
        <Panel className="reveal lg:col-span-5" style={{ ['--i' as string]: 2 }}>
          <PanelHead title="Attempted transaction" />
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 p-4 text-[12.5px]">
            {[
              ['Agent', LIVE_AGENT.ensName, 'mono'], ['Protocol', protocolLabel(scenario.protocol), 'deny'],
              ['Action', scenario.action, ''], ['Amount', usd(scenario.amountUsdc, { cents: false }), 'mono'],
              ['Wallet', shortAddr(LIVE_AGENT.address, 10, 6), 'mono'], ['Trust at check', `${scenario.trustScore.toFixed(1)} / threshold ${TRUST_THRESHOLD}`, 'mono'],
            ].map(([k, v, s]) => (
              <div key={k}><dt className="text-text-3">{k}</dt><dd className={`mt-0.5 ${s === 'mono' ? 'font-mono text-text-2' : s === 'deny' ? 'font-semibold text-deny' : 'text-text'}`}>{v}</dd></div>
            ))}
          </dl>
        </Panel>
        <Panel className="reveal lg:col-span-7" style={{ ['--i' as string]: 3 }}>
          <PanelHead title="What the agent may do instead" right={<span>from PermissionMirror · live</span>} />
          <div className="p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {agent.allowedProtocols.map(p => (
                <Link key={p} href={`/execute?protocol=${p}&amount=${Math.min(scenario.amountUsdc, agent.maxPositionSizeUsdc ?? scenario.amountUsdc)}`}
                  className="group rounded-xl border border-allow/30 bg-allow/5 px-3 py-3 transition hover:border-allow hover:bg-allow/10">
                  <div className="flex items-center justify-between"><span className="text-[13px] font-semibold text-text">{protocolLabel(p)}</span><span className="text-allow">✓</span></div>
                  <div className="mt-0.5 text-[11px] text-text-3 group-hover:text-allow">simulate at {usd(Math.min(scenario.amountUsdc, agent.maxPositionSizeUsdc ?? scenario.amountUsdc), { cents: false })} →</div>
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-[12px] text-text-3">
              <span>Per trade <span className="num text-text">{usd(agent.maxPositionSizeUsdc, { cents: false })}</span></span>
              <span>Per day <span className="num text-text">{usd(agent.maxDailySpendUsdc, { cents: false })}</span></span>
              <span>Positions {agent.allowedPositionTypes.map(t => <Chip key={t} tone="neutral" className="ml-1">{t.toUpperCase()}</Chip>)}</span>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  )
}

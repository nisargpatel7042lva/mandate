// Landing — a cinematic hero followed by content a judge can scroll and click through.
// The hero visual is the product's own metaphor: a gate of light attempts pass through
// or die at the threshold, driven by the live allowlist. Everything below it is real:
// on-chain addresses, the actual pipeline, and one-click links into the live simulator.

import Link from 'next/link'
import { LIVE_AGENT, getAgentLiveData } from '@/lib/server-data'
import { getArcSettlements } from '@/lib/arc-data'
import { PERMISSION_MIRROR_ADDRESS } from '@/lib/permission-mirror'
import { usd, protocolLabel, shortAddr, EXPLORER } from '@/lib/format'
import { PRESETS } from '@/lib/presets'
import { TRUST_THRESHOLD } from '@/lib/underwriting'
import { HeroBackdrop } from '@/components/viz/HeroBackdrop'
import { Chip } from '@/components/ui/Chip'
import { MANDATE_GATE_ROUTER, MANDATE_GATE_EXECUTOR } from '@/lib/mandate-gate'

const SUBGRAPH_URL = process.env.NEXT_PUBLIC_MANDATE_SUBGRAPH_URL ?? null

const STEPS = [
  { n: '01', title: 'Publish', body: 'The mandate — allowed protocols, position size, daily cap, expiry — is written once as an ENS text record the agent does not control.' },
  { n: '02', title: 'Mirror', body: 'A relayer syncs the record on-chain to PermissionMirror on Sepolia. sync() is gated to the relayer key; the agent cannot call it.' },
  { n: '03', title: 'Compose', body: 'Every trade request runs composeRiskScore: live ERC-8004 reputation from Agent0 plus this agent’s own sync history from the Mandate subgraph.' },
  { n: '04', title: 'Settle', body: 'Authorized trades clear MandateGate and settle real USDC on Arc. Blocked ones revert with a reason and move no money.' },
]

const FAQ = [
  { q: 'Where do the limits actually live?', a: 'In an ENS text record, mirrored on-chain to PermissionMirror on Sepolia. The agent reads it at execution time; it cannot write to it.' },
  { q: 'What happens if the agent is compromised?', a: 'Nothing changes about its authority — the limits are enforced by a contract the compromised process cannot edit. The owner can revoke instantly with the kill switch, signed in their own wallet.' },
  { q: 'What if the agent has no ERC-8004 reputation yet?', a: 'Unknown is not scored as zero. The trust score renormalizes onto the Mandate sync history alone, and the gap is disclosed in the underwriting reasons.' },
  { q: 'Is this testnet or mainnet?', a: 'Sepolia for identity and permissions, Arc testnet for settlement. Every address and transaction on this page is real and linked to its explorer.' },
]

export default async function LandingPage() {
  const [data, settlementsData] = await Promise.all([getAgentLiveData(), getArcSettlements(LIVE_AGENT.address)])
  const ok = settlementsData.settlements.filter(s => s.success)
  const settled = ok.reduce((a, s) => a + s.amountUsdc, 0)
  const status = data.fetchError ? 'Live data unreachable' : data.authorized ? 'Live on Sepolia · settling on Arc' : 'Authority revoked'

  const stats: Array<{ icon: React.ReactNode; text: React.ReactNode }> = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
          <defs>
            <linearGradient id="s1" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse"><stop offset=".38" stopColor="#fff" /><stop offset=".62" stopColor="#3a3a3a" /></linearGradient>
            <linearGradient id="s2" x1="3" y1="2" x2="14" y2="22" gradientUnits="userSpaceOnUse"><stop offset=".38" stopColor="#3a3a3a" /><stop offset=".62" stopColor="#fff" /></linearGradient>
          </defs>
          <rect x="3.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#s1)" /><rect x="13.4" y="2.6" width="7.2" height="18.8" rx="3.6" fill="url(#s2)" /><rect x="9.2" y="10.9" width="5.6" height="2.2" rx="1.1" fill="#4a4a4a" />
        </svg>
      ),
      text: <>Trust <span className="num text-white">{data.trustScore.toFixed(0)}</span> against a threshold of {TRUST_THRESHOLD}</>,
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden><rect x="2.4" y="2.4" width="19.2" height="19.2" rx="6.2" fill="#fff" /><path d="M12 7.1v7.4M8.15 12.35L12 16.2l3.85-3.85" stroke="#111" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
      ),
      text: <><span className="num text-white">{usd(settled, { cents: true })}</span> settled on Arc across {ok.length} transfer{ok.length === 1 ? '' : 's'}</>,
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="8.6" stroke="#e8e8e8" strokeWidth="1.6" /><path d="M12 7.4v4.8l3 1.8" stroke="#e8e8e8" strokeWidth="1.6" strokeLinecap="round" /></svg>
      ),
      text: <><span className="num text-white">{data.syncCount ?? 0}</span> permission syncs mirrored on Sepolia</>,
    },
  ]

  const proof: Array<{ label: string; value: string; href?: string }> = [
    { label: 'ENS name', value: LIVE_AGENT.ensName, href: EXPLORER.sepoliaAddr(LIVE_AGENT.address) },
    { label: 'ERC-8004 agent', value: `#${LIVE_AGENT.agentId}` },
    { label: 'Agent wallet', value: shortAddr(LIVE_AGENT.address, 10, 6), href: EXPLORER.sepoliaAddr(LIVE_AGENT.address) },
    { label: 'PermissionMirror', value: shortAddr(PERMISSION_MIRROR_ADDRESS, 10, 6), href: EXPLORER.sepoliaAddr(PERMISSION_MIRROR_ADDRESS) },
    ...(SUBGRAPH_URL ? [{ label: 'Mandate subgraph', value: 'Studio v0.0.2', href: SUBGRAPH_URL }] : []),
    { label: 'MCP endpoint', value: '/api/mcp', href: '/api/mcp' },
    { label: 'Arc wallet', value: shortAddr(LIVE_AGENT.address, 10, 6), href: EXPLORER.arcAddr(LIVE_AGENT.address) },
    { label: 'MandateGate (1inch)', value: shortAddr(MANDATE_GATE_ROUTER, 10, 6), href: EXPLORER.sepoliaAddr(MANDATE_GATE_EXECUTOR) },
  ]

  return (
    <>
      {/* ── Hero ── the backdrop is scoped to this section, not the viewport, so it
          scrolls away with normal page flow instead of staying pinned forever. ── */}
      <section className="relative z-10 flex min-h-[88dvh] flex-col overflow-hidden">
        <HeroBackdrop allowed={data.allowedProtocols} />
        <div className="relative flex flex-1 items-end px-6 pb-16 pt-2 sm:px-[72px] sm:pb-20 lg:px-24">
          <div className="flex w-full max-w-[720px] flex-col items-start text-left">
            <span className="badge appear appear--pop mb-[22px]" style={{ ['--d' as string]: '.22s' }}>
              <svg className="badge-star" width="18" height="20" viewBox="0 0 24 24" fill="#fff" aria-hidden><path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" /></svg>
              {status}
            </span>

            <h1 className="flex flex-col items-start text-[36px] font-medium leading-[1.12] tracking-[-0.045em] text-white sm:text-[48px] lg:text-[64px] 2xl:text-[76px]">
              <span className="headline-line appear appear--mask" style={{ ['--d' as string]: '.42s' }}>Give an agent authority</span>
              <span className="headline-line appear appear--mask" style={{ ['--d' as string]: '.62s' }}><em className="display hero-em text-[1.08em] text-text-2">it cannot exceed.</em></span>
            </h1>

            <p className="appear appear--soft mt-[18px] max-w-[540px] text-[15.5px] leading-[1.55] tracking-[-0.015em] text-text-2 lg:text-[18px]" style={{ ['--d' as string]: '.82s', animationDuration: '1.25s' }}>
              Limits published in ENS, mirrored on-chain, and composed with live reputation at the moment of every trade. Never a config file the agent can edit.
            </p>

            <div className="mt-[26px] flex flex-wrap items-center gap-2.5">
              <Link href="/console" className="btn btn-solid btn-lg appear appear--btn" style={{ ['--d' as string]: '.96s' }}>Open the console</Link>
              <Link href="/execute?preset=gmx-blocked-protocol&run=1" className="btn btn-frost btn-lg appear appear--side" style={{ ['--d' as string]: '1.10s' }}>Watch an attempt get blocked</Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 px-6 pb-9 text-[13.5px] tracking-[-0.015em] text-[#d8d8d8] sm:flex-row sm:px-[72px] lg:px-24">
          {stats.map((s, i) => (
            <div key={i} className="appear appear--stat inline-flex items-center gap-3.5 sm:whitespace-nowrap" style={{ ['--d' as string]: `${1.12 + i * 0.16}s` }}>
              {s.icon}<span>{s.text}</span>
            </div>
          ))}
        </div>

        <a href="#proof" aria-label="Scroll to live proof" className="mx-auto mb-6 hidden h-9 w-9 place-items-center rounded-full border border-line text-text-3 transition hover:border-line-2 hover:text-white sm:grid">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="relative z-10 border-t border-line bg-black">
        <div className="mx-auto max-w-[1200px] px-6 py-20 sm:px-10 lg:py-28">
          <p className="eyebrow reveal" style={{ ['--i' as string]: 0 }}>How it works</p>
          <h2 className="reveal mt-3 max-w-lg text-[28px] font-medium leading-[1.15] tracking-[-0.03em] text-white sm:text-[34px]" style={{ ['--i' as string]: 1 }}>
            Four steps between a published limit and an enforced one.
          </h2>
          <div className="mt-14 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="reveal relative" style={{ ['--i' as string]: i + 2 }}>
                <div className="display text-[15px] text-text-3">{s.n}</div>
                <div className="mt-3 h-px w-8 bg-line-2" />
                <h3 className="mt-4 text-[16px] font-medium text-white">{s.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-text-2">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live proof ── every value below resolves to a real address or endpoint ── */}
      <section id="proof" className="relative z-10 border-t border-line bg-black">
        <div className="mx-auto max-w-[1200px] px-6 py-16 sm:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow reveal" style={{ ['--i' as string]: 0 }}>Live proof, not a mockup</p>
              <h2 className="reveal mt-3 text-[22px] font-medium tracking-[-0.03em] text-white" style={{ ['--i' as string]: 1 }}>Every value here resolves on-chain.</h2>
            </div>
            <Link href="/console" className="reveal btn btn-ghost" style={{ ['--i' as string]: 2 }}>Open the full console →</Link>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3 lg:grid-cols-4">
            {proof.map((p, i) => {
              const inner = (
                <>
                  <div className="eyebrow">{p.label}</div>
                  <div className="hash mt-2 truncate text-[13px] text-white">{p.value}</div>
                </>
              )
              return p.href ? (
                <a key={p.label} href={p.href} target={p.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="reveal group bg-black p-5 transition hover:bg-white/[0.03]" style={{ ['--i' as string]: i + 3 }}>
                  {inner}
                  <span className="mt-2 inline-block text-[10.5px] text-text-3 transition group-hover:text-white">view ↗</span>
                </a>
              ) : (
                <div key={p.label} className="reveal bg-black p-5" style={{ ['--i' as string]: i + 3 }}>{inner}</div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Try it ── one click into the real simulator, no login ── */}
      <section id="try" className="relative z-10 border-t border-line bg-black">
        <div className="mx-auto max-w-[1200px] px-6 py-20 sm:px-10 lg:py-28">
          <p className="eyebrow reveal" style={{ ['--i' as string]: 0 }}>Try it yourself</p>
          <h2 className="reveal mt-3 max-w-lg text-[28px] font-medium leading-[1.15] tracking-[-0.03em] text-white sm:text-[34px]" style={{ ['--i' as string]: 1 }}>
            Three attempts. Watch the enforcement rail decide in real time.
          </h2>
          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {PRESETS.map((p, i) => (
              <Link key={p.id} href={`/execute?preset=${p.id}&run=1`}
                className="reveal group flex flex-col justify-between rounded-lg border border-line bg-black p-5 transition hover:border-line-2 hover:bg-white/[0.03]" style={{ ['--i' as string]: i + 2 }}>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-white">{protocolLabel(p.protocol)}</span>
                    <Chip tone={p.expect === 'allow' ? 'allow' : 'deny'}>{p.expect === 'allow' ? 'clears' : 'blocked'}</Chip>
                  </div>
                  <p className="mt-1 text-[12.5px] text-text-3">{p.action} · {p.why}</p>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <span className="num text-[18px] font-medium text-white">{usd(p.amountUsdc, { cents: false })}</span>
                  <span className="text-[12px] text-text-3 transition group-hover:text-white">run it ↗</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="relative z-10 border-t border-line bg-black">
        <div className="mx-auto max-w-[1200px] px-6 py-20 sm:px-10 lg:py-28">
          <p className="eyebrow reveal" style={{ ['--i' as string]: 0 }}>FAQ</p>
          <h2 className="reveal mt-3 text-[28px] font-medium tracking-[-0.03em] text-white sm:text-[34px]" style={{ ['--i' as string]: 1 }}>Answers before you ask.</h2>
          <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {FAQ.map((f, i) => (
              <div key={f.q} className="reveal border-t border-line pt-5" style={{ ['--i' as string]: i + 2 }}>
                <h3 className="text-[15px] font-medium text-white">{f.q}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-text-2">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Closing ── */}
      <footer className="relative z-10 border-t border-line bg-black">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start gap-8 px-6 py-20 sm:px-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-md text-[26px] font-medium leading-[1.2] tracking-[-0.03em] text-white sm:text-[32px]">
              Give it a limit. <em className="display text-text-2">Then try to break it.</em>
            </h2>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/console" className="btn btn-solid">Open the console</Link>
              <Link href="/execute" className="btn btn-frost">Simulate a trade</Link>
              <a href="https://github.com/nisargpatel7042lva/mandate" target="_blank" rel="noopener noreferrer" className="btn btn-ghost">View source ↗</a>
            </div>
          </div>
          <div className="text-[12px] leading-relaxed text-text-3">
            <p>Built for ETHOnline 2026 on Ethereum Sepolia and Arc testnet.</p>
            <p className="mt-1">ENS · The Graph · 1inch</p>
          </div>
        </div>
      </footer>
    </>
  )
}

// Landing — one frame. The gate of light is the product: attempts inside the mandate
// pass, the rest die at the threshold. Every number in the stats row is live.

import Link from 'next/link'
import { LIVE_AGENT, getAgentLiveData } from '@/lib/server-data'
import { getArcSettlements } from '@/lib/arc-data'
import { usd } from '@/lib/format'
import { TRUST_THRESHOLD } from '@/lib/underwriting'
import { GateScene } from '@/components/viz/GateScene'
import { LockViewport } from '@/components/layout/LockViewport'

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

  return (
    <>
      <LockViewport />
      <div className="fixed inset-0 z-0" aria-hidden>
        <GateScene allowed={data.allowedProtocols} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 58%, rgba(0,0,0,.72) 84%, #000 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,.55) 0%, rgba(0,0,0,.35) 30%, rgba(0,0,0,0) 52%, rgba(0,0,0,0) 86%, rgba(0,0,0,.5) 100%)' }} />
      </div>

      <section className="relative z-10 flex min-h-[calc(100dvh-72px)] flex-col">
        <div className="flex flex-1 items-end px-6 pb-[64px] pt-2 sm:px-[72px] sm:pb-[80px] lg:px-24">
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

        <footer className="flex flex-col items-center justify-between gap-4 px-6 pb-9 text-[13.5px] tracking-[-0.015em] text-[#d8d8d8] sm:flex-row sm:px-[72px] lg:px-24">
          {stats.map((s, i) => (
            <div key={i} className="appear appear--stat inline-flex items-center gap-3.5 sm:whitespace-nowrap" style={{ ['--d' as string]: `${1.12 + i * 0.16}s` }}>
              {s.icon}<span>{s.text}</span>
            </div>
          ))}
        </footer>
      </section>
    </>
  )
}

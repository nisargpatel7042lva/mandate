import type { Metadata } from 'next'
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { LiveProvider } from '@/components/live/LiveProvider'
import { UiProvider } from '@/components/layout/UiProvider'
import { Header } from '@/components/layout/Header'
import { Main } from '@/components/layout/Main'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { KillSwitchDrawer } from '@/components/layout/KillSwitchDrawer'
import './globals.css'

const sans = Inter({ variable: '--font-sans-var', subsets: ['latin'], axes: ['opsz'] })
const display = Instrument_Serif({ variable: '--font-display-var', subsets: ['latin'], weight: '400', style: 'italic' })
const mono = JetBrains_Mono({ variable: '--font-mono-var', subsets: ['latin'], weight: ['400', '500'] })

export const metadata: Metadata = {
  title: 'Mandate — Authority for AI agents, enforced on-chain',
  description: 'A DeFi agent whose limits live in ENS and a mirror contract, composed with live reputation at the moment of every trade.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-full" style={{ background: '#000', color: '#fff' }}>
        <div className="grain" aria-hidden />
        <LiveProvider initial={null}>
          <UiProvider>
            <Header />
            <Main>{children}</Main>
            <CommandPalette />
            <KillSwitchDrawer />
          </UiProvider>
        </LiveProvider>
      </body>
    </html>
  )
}

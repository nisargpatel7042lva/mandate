import type { Metadata } from 'next'
import { Bricolage_Grotesque, Instrument_Serif, JetBrains_Mono } from 'next/font/google'
import { LiveProvider } from '@/components/live/LiveProvider'
import { UiProvider } from '@/components/layout/UiProvider'
import { CommandBar } from '@/components/layout/CommandBar'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { KillSwitchDrawer } from '@/components/layout/KillSwitchDrawer'
import './globals.css'

const sans = Bricolage_Grotesque({ variable: '--font-sans-var', subsets: ['latin'] })
const display = Instrument_Serif({ variable: '--font-display-var', subsets: ['latin'], weight: '400', style: ['normal', 'italic'] })
const mono = JetBrains_Mono({ variable: '--font-mono-var', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mandate — Agent Authority Enforcement',
  description: 'On-chain permission enforcement for autonomous DeFi trading agents.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} ${mono.variable}`}>
      <body className="min-h-full">
        <div className="atmosphere" aria-hidden />
        <LiveProvider initial={null}>
          <UiProvider>
            <CommandBar />
            <main className="mx-auto w-full max-w-[1440px] px-4 pb-20 pt-6 sm:px-6">
              {children}
            </main>
            <CommandPalette />
            <KillSwitchDrawer />
          </UiProvider>
        </LiveProvider>
      </body>
    </html>
  )
}

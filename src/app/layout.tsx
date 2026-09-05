import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Sidebar } from '@/components/layout/Sidebar'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mandate — Agent Authority Enforcement',
  description: 'On-chain permission enforcement for autonomous DeFi trading agents.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full`}
    >
      <body className="flex h-full overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  )
}

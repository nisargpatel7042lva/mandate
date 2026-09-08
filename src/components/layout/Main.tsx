'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

export function Main({ children }: { children: ReactNode }) {
  const landing = usePathname() === '/'
  return (
    <main className={landing ? 'relative z-10' : 'relative z-10 mx-auto w-full max-w-[1440px] px-5 pb-24 pt-8 sm:px-10'}>
      {children}
    </main>
  )
}

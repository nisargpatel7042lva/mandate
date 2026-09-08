'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface UiCtx {
  paletteOpen: boolean; setPaletteOpen: (v: boolean) => void
  killOpen: boolean; setKillOpen: (v: boolean) => void
}
const Ctx = createContext<UiCtx>({ paletteOpen: false, setPaletteOpen: () => {}, killOpen: false, setKillOpen: () => {} })

export function UiProvider({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [killOpen, setKillOpen] = useState(false)
  return <Ctx.Provider value={{ paletteOpen, setPaletteOpen, killOpen, setKillOpen }}>{children}</Ctx.Provider>
}
export function useUi() { return useContext(Ctx) }

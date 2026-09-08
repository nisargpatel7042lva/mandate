import { Suspense } from 'react'
import { Simulator } from '@/components/enforcement/Simulator'

export default function ExecutePage() {
  return (
    <Suspense fallback={<div className="skeleton h-[60vh] w-full rounded-2xl" />}>
      <Simulator />
    </Suspense>
  )
}

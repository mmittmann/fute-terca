'use client'

import { useTransition } from 'react'
import { togglePlayerActive } from '@/app/admin/actions'

export function PlayerToggle({ id, active }: { id: number; active: boolean }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(() => togglePlayerActive(id, !active).then(() => {}))}
      className={`shrink-0 transition disabled:opacity-50 ${active ? 'chip-volt' : 'rounded-full border border-line bg-transparent px-2.5 py-1 text-[11px] font-bold text-moss/70 hover:text-moss'}`}
    >
      {active ? 'Mensalista ✓' : 'Inativo'}
    </button>
  )
}

'use client'

import { useTransition } from 'react'
import { togglePlayerActive } from '@/app/admin/actions'

export function PlayerToggle({ id, active }: { id: number; active: boolean }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(() => togglePlayerActive(id, !active).then(() => {}))}
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {active ? 'Mensalista ✓' : 'Inativo'}
    </button>
  )
}

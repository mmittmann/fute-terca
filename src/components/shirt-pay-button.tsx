'use client'

import { useTransition } from 'react'
import { markShirtPaid } from '@/app/admin/actions'

export function ShirtPayButton({ shirtId, year, month }: { shirtId: number; year: number; month: number }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await markShirtPaid(shirtId, year, month)
          if (!r.ok) alert(r.error)
        })
      }
      className="rounded-lg bg-green-600 px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
    >
      Marcar paga
    </button>
  )
}

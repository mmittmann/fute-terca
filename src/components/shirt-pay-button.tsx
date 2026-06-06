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
      className="btn-volt !px-2.5 !py-1 !text-[11px]"
    >
      Marcar paga
    </button>
  )
}

'use client'

import { useState } from 'react'
import { formatBRL } from '@/lib/money'

export interface PaymentRow {
  id: string
  name: string
  status: 'pago' | 'pendente' | 'avulso'
  amountCents?: number
}

const FILTERS = ['Todos', 'Pendentes', 'Avulsos'] as const

export function PaymentList({ rows }: { rows: PaymentRow[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Todos')
  const visible = rows.filter((r) => {
    if (filter === 'Todos') return true
    if (filter === 'Pendentes') return r.status === 'pendente'
    return r.status === 'avulso'
  })
  return (
    <section>
      <div className="flex gap-2 px-4 pt-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === f ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <ul className="mt-2 divide-y divide-slate-200 bg-white">
        {visible.map((r) => (
          <li key={r.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-semibold">{r.name}</span>
            {r.status === 'pago' && <span className="font-bold text-green-600">✓ Pago</span>}
            {r.status === 'pendente' && <span className="font-bold text-red-600">Pendente</span>}
            {r.status === 'avulso' && (
              <span className="font-bold text-sky-600">Avulso {r.amountCents ? formatBRL(r.amountCents) : ''}</span>
            )}
          </li>
        ))}
        {visible.length === 0 && <li className="px-4 py-4 text-sm text-slate-500">Nada por aqui.</li>}
      </ul>
    </section>
  )
}

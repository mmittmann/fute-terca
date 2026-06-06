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

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function PaymentList({ rows }: { rows: PaymentRow[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Todos')
  const visible = rows.filter((r) => {
    if (filter === 'Todos') return true
    if (filter === 'Pendentes') return r.status === 'pendente'
    return r.status === 'avulso'
  })
  return (
    <section className="pb-2">
      <div className="mx-3 mt-4 flex rounded-xl border border-line/70 bg-turf p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
              filter === f ? 'bg-volt text-pitch shadow-[0_0_14px_rgba(198,245,66,0.25)]' : 'text-moss hover:text-ink'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <ul className="card mx-3 mt-3 divide-y divide-line/40">
        {visible.map((r) => (
          <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-pitch font-display text-[13px] tracking-wider text-moss">
              {initials(r.name)}
            </span>
            <span className="flex-1 truncate text-sm font-semibold text-ink">{r.name}</span>
            {r.status === 'pago' && <span className="chip-volt">✓ Pago</span>}
            {r.status === 'pendente' && <span className="chip-clay">Pendente</span>}
            {r.status === 'avulso' && (
              <span className="chip-sand">Avulso{r.amountCents ? ` ${formatBRL(r.amountCents)}` : ''}</span>
            )}
          </li>
        ))}
        {visible.length === 0 && <li className="px-4 py-5 text-center text-sm text-moss">Nada por aqui.</li>}
      </ul>
    </section>
  )
}

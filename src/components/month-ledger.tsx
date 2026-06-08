'use client'

import { useState } from 'react'
import { formatBRL } from '@/lib/money'

export interface LedgerRow {
  id: number
  name: string
  type: string
  amountCents: number
}

const FILTERS = ['Todos', 'Entradas', 'Saídas'] as const

const TYPE_LABEL: Record<string, string> = {
  mensal: 'Mensal', avulso: 'Avulso', quadra: 'Quadra', goleiro: 'Goleiro',
  evento: 'Evento', camisa: 'Camisa', outro: 'Outro',
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export function MonthLedger({ rows }: { rows: LedgerRow[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Todos')
  const visible = rows.filter((r) => {
    if (filter === 'Entradas') return r.amountCents > 0
    if (filter === 'Saídas') return r.amountCents < 0
    return true
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
        {visible.map((r) => {
          const positive = r.amountCents >= 0
          return (
            <li key={r.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className={`flex size-9 shrink-0 items-center justify-center rounded-full border font-display text-[13px] tracking-wider ${
                positive ? 'border-volt/30 bg-volt/10 text-volt' : 'border-clay/30 bg-clay/10 text-clay'
              }`}>
                {initials(r.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{r.name}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-moss">
                  {TYPE_LABEL[r.type] ?? r.type}
                </span>
              </span>
              <span className={`shrink-0 font-display text-sm tracking-wide ${positive ? 'text-volt' : 'text-clay'}`}>
                {positive ? '+' : ''}{formatBRL(r.amountCents)}
              </span>
            </li>
          )
        })}
        {visible.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-moss">
            Nada lançado ainda. Comece pela quadra e vá adicionando quem pagar.
          </li>
        )}
      </ul>
    </section>
  )
}

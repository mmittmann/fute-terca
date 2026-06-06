'use client'

import { useTransition } from 'react'
import { deleteEntry } from '@/app/admin/actions'
import { formatBRL } from '@/lib/money'

export interface EntryRow {
  id: number
  label: string
  type: string
  amountCents: number
}

export function EntryList({ rows }: { rows: EntryRow[] }) {
  const [pending, start] = useTransition()
  return (
    <ul className="card divide-y divide-line/40">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold text-ink">{r.label}</span>
            <span className="shrink-0 rounded-md border border-line bg-pitch px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-moss">
              {r.type}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2.5">
            <span className={`font-display text-sm tracking-wide ${r.amountCents >= 0 ? 'text-volt' : 'text-clay'}`}>
              {formatBRL(r.amountCents)}
            </span>
            <button
              disabled={pending}
              onClick={() => {
                if (!confirm(`Excluir lançamento de ${r.label}?`)) return
                start(async () => {
                  const res = await deleteEntry(r.id)
                  if (!res.ok) alert(res.error)
                })
              }}
              className="text-moss/50 transition hover:text-clay"
              aria-label="Excluir"
            >
              ✕
            </button>
          </span>
        </li>
      ))}
      {rows.length === 0 && <li className="px-4 py-5 text-center text-sm text-moss">Nenhum lançamento no mês.</li>}
    </ul>
  )
}

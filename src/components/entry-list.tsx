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
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
          <span>
            <strong>{r.label}</strong>
            <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase">{r.type}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className={r.amountCents >= 0 ? 'font-bold text-green-600' : 'font-bold text-red-600'}>
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
              className="text-slate-400 hover:text-red-600"
              aria-label="Excluir"
            >
              ✕
            </button>
          </span>
        </li>
      ))}
      {rows.length === 0 && <li className="px-4 py-4 text-sm text-slate-500">Nenhum lançamento no mês.</li>}
    </ul>
  )
}

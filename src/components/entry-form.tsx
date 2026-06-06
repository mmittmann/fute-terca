'use client'

import { useRef, useState, useTransition } from 'react'
import { createEntry, type ActionResult } from '@/app/admin/actions'

const TYPES = [
  ['mensal', 'Mensal'], ['avulso', 'Avulso'], ['quadra', 'Quadra'], ['goleiro', 'Goleiro'],
  ['evento', 'Evento'], ['camisa', 'Camisa'], ['outro', 'Outro'],
] as const

export interface FormRefs {
  players: { id: number; name: string }[]
  events: { id: number; name: string }[]
  year: number
  month: number
  defaultFee: string // ex: "75,00" — pré-preenche no tipo mensal
  defaultAvulso: string
}

export function EntryForm({ refs }: { refs: FormRefs }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [type, setType] = useState<string>('mensal')
  const [amount, setAmount] = useState(refs.defaultFee)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'confirm'; text: string } | null>(null)
  const [pending, start] = useTransition()

  function pickType(t: string) {
    setType(t)
    if (t === 'mensal') setAmount(refs.defaultFee)
    else if (t === 'avulso') setAmount(refs.defaultAvulso)
    else setAmount('')
  }

  function submit(formData: FormData, confirmed = false) {
    if (confirmed) formData.set('confirmed', 'true')
    start(async () => {
      const r: ActionResult = await createEntry(formData)
      if (r.ok) {
        setMsg({ kind: 'ok', text: 'Lançamento salvo ✓' })
        formRef.current?.reset()
        pickType('mensal')
      } else if (r.needsConfirm) {
        setMsg({ kind: 'confirm', text: r.error })
      } else {
        setMsg({ kind: 'err', text: r.error })
      }
    })
  }

  return (
    <form
      ref={formRef}
      action={(fd) => submit(fd)}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h2 className="text-sm font-bold">Novo lançamento — {String(refs.month).padStart(2, '0')}/{refs.year}</h2>
      <input type="hidden" name="year" value={refs.year} />
      <input type="hidden" name="month" value={refs.month} />
      <input type="hidden" name="type" value={type} />

      <div className="flex flex-wrap gap-1.5">
        {TYPES.map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => pickType(val)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              type === val ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="text-xs font-bold text-slate-600">
        Jogador (opcional para quadra/goleiro)
        <select name="playerId" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">—</option>
          {refs.players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      {type === 'evento' && (
        <label className="text-xs font-bold text-slate-600">
          Evento
          <select name="eventId" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
            <option value="">—</option>
            {refs.events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </label>
      )}

      <label className="text-xs font-bold text-slate-600">
        Valor (negativo = despesa)
        <input
          name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} required
          inputMode="decimal" placeholder="75,00"
          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-bold text-slate-600">
        Descrição (opcional)
        <input name="description" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
      </label>

      {msg && (
        <p className={`text-xs font-semibold ${msg.kind === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
          {msg.text}
          {msg.kind === 'confirm' && (
            // Nota: o re-submit lê o form no clique do Confirmar; se o admin alterar campos
            // entre o aviso e a confirmação, vale o estado atual (aceitável p/ 1 admin).
            <button
              type="button"
              onClick={() => formRef.current && submit(new FormData(formRef.current), true)}
              className="ml-2 rounded bg-red-600 px-2 py-0.5 text-white"
            >
              Confirmar
            </button>
          )}
        </p>
      )}

      <button disabled={pending} className="rounded-lg bg-green-600 py-2 text-sm font-bold text-white disabled:opacity-50">
        Salvar lançamento
      </button>
    </form>
  )
}

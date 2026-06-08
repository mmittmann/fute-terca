'use client'

import { useRef, useState, useTransition } from 'react'
import { createEntry, type ActionResult } from '@/app/admin/actions'
import { PlayerCombobox } from '@/components/player-combobox'
import { guessEntryType, type GuessConfig } from '@/lib/guess-type'
import { parseToCents } from '@/lib/money'

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
  guessConfig: GuessConfig
}

export function EntryForm({ refs }: { refs: FormRefs }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [type, setType] = useState<string>('mensal')
  const [amount, setAmount] = useState(refs.defaultFee)
  const [playerId, setPlayerId] = useState<number | null>(null)
  const [autoType, setAutoType] = useState(false) // tipo veio do valor digitado
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'confirm'; text: string } | null>(null)
  const [pending, start] = useTransition()

  function pickType(t: string) {
    setType(t)
    setAutoType(false)
    if (t === 'mensal') setAmount(refs.defaultFee)
    else if (t === 'avulso') setAmount(refs.defaultAvulso)
    else setAmount('')
  }

  function onAmountChange(v: string) {
    setAmount(v)
    const cents = parseToCents(v)
    if (cents !== null) {
      const guess = guessEntryType(cents, refs.guessConfig)
      if (guess) {
        setType(guess)
        setAutoType(true)
      }
    }
  }

  function reset() {
    formRef.current?.reset()
    setType('mensal')
    setAmount(refs.defaultFee)
    setPlayerId(null)
    setAutoType(false)
  }

  function submit(formData: FormData, confirmed = false) {
    if (confirmed) formData.set('confirmed', 'true')
    start(async () => {
      const r: ActionResult = await createEntry(formData)
      if (r.ok) {
        setMsg({ kind: 'ok', text: 'Lançamento salvo ✓' })
        reset()
      } else if (r.needsConfirm) {
        setMsg({ kind: 'confirm', text: r.error })
      } else {
        setMsg({ kind: 'err', text: r.error })
      }
    })
  }

  return (
    <form ref={formRef} action={(fd) => submit(fd)} className="card flex flex-col gap-3.5 p-4">
      <h2 className="label">Novo lançamento · {String(refs.month).padStart(2, '0')}/{refs.year}</h2>
      <input type="hidden" name="year" value={refs.year} />
      <input type="hidden" name="month" value={refs.month} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="playerId" value={playerId ?? ''} />

      {/* Valor primeiro: ao digitar, o tipo é detectado automaticamente */}
      <label className="block">
        <span className="label">Valor (negativo = despesa)</span>
        <input
          name="amount" value={amount} onChange={(e) => onAmountChange(e.target.value)} required
          inputMode="decimal" placeholder="75,00"
          className="input mt-1.5 font-display tracking-wide"
        />
      </label>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label">Tipo</span>
          {autoType && <span className="text-[10px] font-bold text-volt">detectado pelo valor</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => pickType(val)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                type === val
                  ? 'border-volt bg-volt text-pitch shadow-[0_0_12px_rgba(198,245,66,0.3)]'
                  : 'border-line bg-transparent text-moss hover:border-moss/60 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="label">Jogador (opcional p/ quadra e goleiro)</span>
        <div className="mt-1.5">
          <PlayerCombobox players={refs.players} value={playerId} onChange={setPlayerId} />
        </div>
      </label>

      {type === 'evento' && (
        <label className="block">
          <span className="label">Evento</span>
          <select name="eventId" className="input mt-1.5">
            <option value="">—</option>
            {refs.events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="label">Descrição (opcional)</span>
        <input name="description" className="input mt-1.5" />
      </label>

      {msg && (
        <p className={`text-xs font-bold ${msg.kind === 'ok' ? 'text-volt' : 'text-clay'}`}>
          {msg.text}
          {msg.kind === 'confirm' && (
            // Nota: o re-submit lê o form no clique do Confirmar; se o admin alterar campos
            // entre o aviso e a confirmação, vale o estado atual (aceitável p/ 1 admin).
            <button
              type="button"
              onClick={() => formRef.current && submit(new FormData(formRef.current), true)}
              className="ml-2 rounded-lg bg-clay px-2.5 py-1 font-extrabold text-pitch"
            >
              Confirmar
            </button>
          )}
        </p>
      )}

      <button disabled={pending} className="btn-volt">
        Salvar lançamento
      </button>
    </form>
  )
}

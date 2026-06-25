'use client'

import { useRef, useState, useTransition } from 'react'
import { createEntry, createPlayer, type ActionResult } from '@/app/admin/actions'
import { PlayerCombobox, type PlayerOption } from '@/components/player-combobox'
import { categoryAfterSignChange, signForType, type Sign } from '@/lib/entry-sign'

const TYPES = [
  ['mensal', 'Mensal'], ['avulso', 'Avulso'], ['quadra', 'Quadra'], ['goleiro', 'Goleiro'],
  ['evento', 'Evento'], ['camisa', 'Camisa'], ['outro', 'Outro'],
] as const

/** Valor padrão por categoria (magnitude "75,00"); categorias fora do mapa não autopreenchem. */
export type CategoryDefaults = Partial<Record<string, string>>

export interface FormRefs {
  players: { id: number; name: string }[]
  events: { id: number; name: string }[]
  year: number
  month: number
  defaults: CategoryDefaults // ex: { mensal: "75,00", avulso: "20,00", quadra: "240,00", goleiro: "45,00" }
  gameOptions: { value: string; label: string }[]
  defaultGame: string // value 'YYYY-MM-DD' da terça default
}

export function EntryForm({ refs }: { refs: FormRefs }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [sign, setSign] = useState<Sign>('receita')
  const [type, setType] = useState<string>('mensal')
  const [amount, setAmount] = useState(refs.defaults.mensal ?? '')
  const [valueIsAuto, setValueIsAuto] = useState(true) // valor foi preenchido pela categoria (vs. digitado)
  const [playerId, setPlayerId] = useState<number | null>(null)
  const [gameDate, setGameDate] = useState(refs.defaultGame)
  const [players, setPlayers] = useState<PlayerOption[]>(refs.players)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'confirm'; text: string } | null>(null)
  const [pending, start] = useTransition()

  function onAmountChange(v: string) {
    setAmount(v.replace(/-/g, '')) // campo é só magnitude positiva
    setValueIsAuto(false) // a partir de agora o valor é "manual"
  }

  function pickSign(s: Sign) {
    setSign(s)
    // mantém a categoria se compatível com o novo sinal; senão cai em 'outro'
    setType((t) => categoryAfterSignChange(t, s))
  }

  function pickType(t: string) {
    setType(t)
    const req = signForType(t)
    if (req) setSign(req)
    // autopreenche o valor da categoria enquanto o valor for automático (ou estiver vazio);
    // categorias sem default (evento/camisa/outro) preservam o que estiver no campo
    const def = refs.defaults[t]
    if (def && (valueIsAuto || amount === '')) { // "" (preço não configurado) = sem default
      setAmount(def)
      setValueIsAuto(true)
    }
  }

  function reset() {
    formRef.current?.reset()
    setSign('receita')
    setType('mensal')
    setAmount(refs.defaults.mensal ?? '')
    setValueIsAuto(true)
    setPlayerId(null)
    setGameDate(refs.defaultGame)
  }

  async function onCreatePlayer(name: string): Promise<PlayerOption | null> {
    const fd = new FormData()
    fd.set('name', name)
    const r = await createPlayer(fd)
    if (r.ok) {
      const opt = { id: r.player.id, name: r.player.name }
      setPlayers((prev) => [...prev, opt])
      return opt
    }
    // conflito (acento/maiúscula): seleciona o existente
    return players.find((p) => p.name.toLowerCase() === name.toLowerCase()) ?? null
  }

  function submit(formData: FormData, confirmed = false) {
    formData.set('amount', sign === 'despesa' ? `-${amount}` : amount)
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
      <input type="hidden" name="gameDate" value={gameDate} />

      {/* Despesa / Receita — define o sinal (valor digitado é sempre positivo) */}
      <div className="grid grid-cols-2 gap-1.5">
        {(['despesa', 'receita'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => pickSign(s)}
            className={`rounded-xl border px-3 py-2 text-sm font-bold uppercase tracking-wide transition ${
              sign === s
                ? s === 'despesa'
                  ? 'border-clay bg-clay text-pitch'
                  : 'border-volt bg-volt text-pitch'
                : 'border-line bg-transparent text-moss hover:text-ink'
            }`}
          >
            {s === 'despesa' ? 'Despesa' : 'Receita'}
          </button>
        ))}
      </div>

      <div>
        <span className="label mb-1.5 block">Categoria</span>
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
        <span className="label">Valor</span>
        <input
          name="amount" value={amount} onChange={(e) => onAmountChange(e.target.value)} required
          inputMode="decimal" placeholder="75,00"
          className="input mt-1.5 font-display tracking-wide"
        />
      </label>

      <label className="block">
        <span className="label">Jogador (opcional p/ quadra e goleiro)</span>
        <div className="mt-1.5">
          <PlayerCombobox players={players} value={playerId} onChange={setPlayerId} onCreate={onCreatePlayer} />
        </div>
      </label>

      <label className="block">
        <span className="label">Jogo (terça)</span>
        <select
          name="gameDateSelect" value={gameDate} onChange={(e) => setGameDate(e.target.value)}
          className="input mt-1.5"
        >
          <option value="">— (sem jogo)</option>
          {refs.gameOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
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

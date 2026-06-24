'use client'

import { useMemo, useState } from 'react'
import type { GameOption } from '@/lib/game-options'
import { buildAliasMap, type PlayerAliases } from '@/lib/normalize'
import { parsePlayedList } from '@/lib/parse-played'
import {
  reconcilePayments, scopePaidForGame, type PaidEntry, type ReconcileResult,
} from '@/lib/reconcile'

export type { PaidEntry } from '@/lib/reconcile'

export function PostGameReconcile({
  players,
  paidEntries,
  gameOptions,
  defaultGame,
}: {
  players: PlayerAliases[]
  paidEntries: PaidEntry[]
  gameOptions: GameOption[]
  defaultGame: string
}) {
  const [text, setText] = useState('')
  const [game, setGame] = useState(defaultGame)
  const [result, setResult] = useState<(ReconcileResult & { goalkeepers: string[] }) | null>(null)
  const [removed, setRemoved] = useState<Set<number>>(new Set())
  const [copied, setCopied] = useState(false)

  const aliasMap = useMemo(() => buildAliasMap(players), [players])

  function runReconcile(gameDate: string, txt: string) {
    const parsed = parsePlayedList(txt)
    const paidByCanonical = scopePaidForGame(paidEntries, gameDate)
    const r = reconcilePayments(parsed.players, paidByCanonical, aliasMap)
    setResult({ ...r, goalkeepers: parsed.goalkeepers })
    setRemoved(new Set())
    setCopied(false)
  }

  function removeFromCobrar(index: number) {
    setRemoved((prev) => new Set(prev).add(index))
    setCopied(false)
  }

  function onGameChange(gameDate: string) {
    setGame(gameDate)
    if (text.trim()) runReconcile(gameDate, text) // recalcula na hora, sem recarregar
  }

  async function copyCobrar() {
    if (!result) return
    const names = result.cobrar
      .filter((_, i) => !removed.has(i))
      .map((c) => c.name)
      .join(', ')
    try {
      await navigator.clipboard.writeText(names)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('Não foi possível copiar.')
    }
  }

  return (
    <section className="card p-4">
      <h2 className="label mb-3">Conferência pós-jogo</h2>
      <p className="mb-2 text-[11px] leading-relaxed text-moss/70">
        Cole a lista final do WhatsApp. Eu cruzo com quem pagou <strong>este jogo</strong> e aponto quem jogou e não acertou.
      </p>

      <label className="label mb-1 block !text-moss/70">Jogo</label>
      <select
        value={game}
        onChange={(e) => onGameChange(e.target.value)}
        className="input mb-3"
        disabled={gameOptions.length === 0}
      >
        {gameOptions.length === 0 && <option value="">Sem terças neste mês</option>}
        {gameOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Cole aqui a lista de quem jogou…"
        className="input resize-y font-sans"
      />
      <button
        onClick={() => runReconcile(game, text)}
        disabled={!text.trim() || !game}
        className="btn-volt mt-3 w-full"
      >
        Conferir
      </button>

      {result && (
        <div className="mt-4 flex flex-col gap-4">
          {(() => {
            const visibleCount = result.cobrar.length - removed.size
            return (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="label !text-clay">Cobrar · jogou e não pagou ({visibleCount})</span>
                  {visibleCount > 0 && (
                    <button onClick={copyCobrar} className="btn-ghost !text-[11px]">
                      {copied ? 'Copiado ✓' : 'Copiar nomes'}
                    </button>
                  )}
                </div>
                {visibleCount === 0 ? (
                  <p className="text-xs text-moss">Todo mundo que jogou pagou. 🎉</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {result.cobrar.map((c, i) =>
                      removed.has(i) ? null : (
                        <span key={`${c.name}-${i}`} className="chip-clay inline-flex items-center gap-1">
                          {c.name}{!c.cadastrado && <span className="opacity-70"> · novo</span>}
                          <button
                            onClick={() => removeFromCobrar(i)}
                            aria-label={`Remover ${c.name} da cobrança`}
                            className="-mr-0.5 ml-0.5 leading-none opacity-60 hover:opacity-100"
                          >
                            ×
                          </button>
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          <div>
            <span className="label">Pagaram e jogaram ({result.pagaramEjogaram.length})</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {result.pagaramEjogaram.map((p, i) => (
                <span key={`${p.name}-${i}`} className={p.tipo === 'mensal' ? 'chip-volt' : 'chip-sand'}>
                  {p.name} {p.tipo === 'mensal' ? '✅' : '⚽'}
                </span>
              ))}
              {result.pagaramEjogaram.length === 0 && <span className="text-xs text-moss">—</span>}
            </div>
          </div>

          {result.pagaramNaoJogaram.length > 0 && (
            <div>
              <span className="label">Pagaram e não jogaram ({result.pagaramNaoJogaram.length})</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {result.pagaramNaoJogaram.map((n) => (
                  <span key={n} className="rounded-full border border-line bg-pitch px-2.5 py-1 text-[11px] font-semibold text-moss">
                    {n}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.goalkeepers.length > 0 && (
            <p className="text-[11px] text-moss/60">
              Goleiros (não cobrados): {result.goalkeepers.join(', ')}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

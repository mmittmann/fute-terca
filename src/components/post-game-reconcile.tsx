'use client'

import { useMemo, useState } from 'react'
import { buildAliasMap, type PlayerAliases } from '@/lib/normalize'
import { parsePlayedList } from '@/lib/parse-played'
import { reconcilePayments, type ReconcileResult } from '@/lib/reconcile'

export interface ReconcilePaid {
  name: string
  tipo: 'mensal' | 'avulso'
}

export function PostGameReconcile({
  players,
  paid,
}: {
  players: PlayerAliases[]
  paid: ReconcilePaid[]
}) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<(ReconcileResult & { goalkeepers: string[] }) | null>(null)
  const [copied, setCopied] = useState(false)

  const aliasMap = useMemo(() => buildAliasMap(players), [players])
  const paidByCanonical = useMemo(
    () => new Map(paid.map((p) => [p.name, p.tipo] as const)),
    [paid],
  )

  function conferir() {
    const parsed = parsePlayedList(text)
    const r = reconcilePayments(parsed.players, paidByCanonical, aliasMap)
    setResult({ ...r, goalkeepers: parsed.goalkeepers })
    setCopied(false)
  }

  async function copyCobrar() {
    if (!result) return
    const names = result.cobrar.map((c) => c.name).join(', ')
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
        Cole a lista final do WhatsApp. Eu cruzo com quem pagou no mês e aponto quem jogou e não acertou.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder="Cole aqui a lista de quem jogou…"
        className="input resize-y font-sans"
      />
      <button onClick={conferir} disabled={!text.trim()} className="btn-volt mt-3 w-full">
        Conferir
      </button>

      {result && (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="label !text-clay">Cobrar · jogou e não pagou ({result.cobrar.length})</span>
              {result.cobrar.length > 0 && (
                <button onClick={copyCobrar} className="btn-ghost !text-[11px]">
                  {copied ? 'Copiado ✓' : 'Copiar nomes'}
                </button>
              )}
            </div>
            {result.cobrar.length === 0 ? (
              <p className="text-xs text-moss">Todo mundo que jogou pagou. 🎉</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {result.cobrar.map((c, i) => (
                  <span key={`${c.name}-${i}`} className="chip-clay">
                    {c.name}{!c.cadastrado && <span className="opacity-70"> · novo</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

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

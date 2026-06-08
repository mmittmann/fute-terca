import Link from 'next/link'
import { getAllPlayers, getMonthEntries } from '@/db/queries'
import { currentYearMonth, monthLabel } from '@/lib/dates'
import { buildMonthPresence, type AvulsoRef } from '@/lib/presence'
import { tuesdaysInMonth } from '@/lib/tuesdays'

export const dynamic = 'force-dynamic'

const spDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
})

function parseMonthParam(m: string | undefined): { year: number; month: number } {
  const match = m?.match(/^(\d{4})-(\d{2})$/)
  if (match) {
    const year = Number(match[1])
    const month = Number(match[2])
    if (month >= 1 && month <= 12) return { year, month }
  }
  return currentYearMonth()
}

function shift(year: number, month: number, delta: number): string {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export default async function JogosPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>
}) {
  const { m } = await searchParams
  const { year, month } = parseMonthParam(m)
  const [entries, players] = await Promise.all([getMonthEntries(year, month), getAllPlayers()])
  const nameById = new Map(players.map((p) => [p.id, p.name]))

  const tuesdays = tuesdaysInMonth(year, month)
  const mensalistas = entries
    .filter((e) => e.type === 'mensal' && e.amountCents > 0 && e.playerId)
    .map((e) => nameById.get(e.playerId!) ?? '?')
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const avulsos: AvulsoRef[] = entries
    .filter((e) => e.type === 'avulso' && e.amountCents > 0)
    .map((e) => {
      const created = spDate.format(e.createdAt) // YYYY-MM-DD
      const sameMonth = created.startsWith(`${year}-${String(month).padStart(2, '0')}`)
      return {
        name: e.playerId ? (nameById.get(e.playerId) ?? '?') : (e.description ?? '?'),
        day: sameMonth ? Number(created.slice(8, 10)) : null,
      }
    })

  const presence = buildMonthPresence(tuesdays, mensalistas, avulsos)
  const today = spDate.format(new Date())

  return (
    <main>
      <header className="page-header rise">
        <p className="label">Calendário das terças</p>
        <h1 className="mt-1.5 font-display text-[32px] uppercase leading-none tracking-wide text-ink">Jogos</h1>
      </header>

      <div className="mx-3 mt-4 flex items-center justify-between rounded-xl border border-line/70 bg-turf p-1 rise rise-1">
        <Link href={`/jogos?m=${shift(year, month, -1)}`} className="rounded-lg px-4 py-1.5 text-sm font-bold text-moss transition hover:text-volt" aria-label="Mês anterior">
          ‹
        </Link>
        <span className="font-display text-sm uppercase tracking-wider text-ink">{monthLabel(year, month)}</span>
        <Link href={`/jogos?m=${shift(year, month, 1)}`} className="rounded-lg px-4 py-1.5 text-sm font-bold text-moss transition hover:text-volt" aria-label="Próximo mês">
          ›
        </Link>
      </div>

      <p className="mx-4 mt-3 text-[11px] leading-relaxed text-moss/70 rise rise-1">
        {tuesdays.length} terças neste mês. Presença derivada dos pagamentos: mensalistas contam em todas as
        terças; avulso entra na terça da semana do lançamento.
      </p>

      <div className="flex flex-col gap-3 p-3">
        {presence.perTuesday.map((t, i) => {
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`
          const isFuture = dateStr > today
          const total = t.mensalistas.length + t.avulsos.length
          return (
            <section key={t.day} className={`card p-4 rise rise-${Math.min(i + 2, 5)} ${isFuture ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-pitch">
                  <span className="font-display text-lg leading-none text-volt">{String(t.day).padStart(2, '0')}</span>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-moss">ter</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">
                    Terça, {String(t.day).padStart(2, '0')}/{String(month).padStart(2, '0')}
                  </p>
                  <p className="text-[11px] text-moss">
                    {isFuture ? 'ainda não rolou' : `${total} no jogo`}
                  </p>
                </div>
                {!isFuture && <span className="chip-volt font-display !text-sm">{total}</span>}
              </div>
              {!isFuture && total > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line/40 pt-3">
                  {t.mensalistas.map((n) => (
                    <span key={`m-${n}`} className="rounded-full border border-line bg-pitch px-2 py-0.5 text-[10px] font-semibold text-moss">
                      {n}
                    </span>
                  ))}
                  {t.avulsos.map((n, j) => (
                    <span key={`a-${n}-${j}`} className="rounded-full border border-sand/30 bg-sand/10 px-2 py-0.5 text-[10px] font-bold text-sand">
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </section>
          )
        })}

        {presence.undated.length > 0 && (
          <section className="card p-4 rise rise-5">
            <p className="label mb-2.5">Avulsos do mês (sem data identificada)</p>
            <div className="flex flex-wrap gap-1.5">
              {presence.undated.map((n, j) => (
                <span key={`u-${n}-${j}`} className="rounded-full border border-sand/30 bg-sand/10 px-2 py-0.5 text-[10px] font-bold text-sand">
                  {n}
                </span>
              ))}
            </div>
          </section>
        )}

        {mensalistas.length === 0 && avulsos.length === 0 && (
          <p className="card px-4 py-6 text-center text-sm text-moss rise rise-2">
            Nenhum pagamento registrado neste mês ainda.
          </p>
        )}
      </div>
    </main>
  )
}

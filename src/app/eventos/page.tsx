import { getEventEntries, getEvents, getAllPlayers } from '@/db/queries'
import { sumCents } from '@/lib/balance'
import { formatBRL } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function EventosPage() {
  const [events, entries, players] = await Promise.all([getEvents(), getEventEntries(), getAllPlayers()])
  const nameById = new Map(players.map((p) => [p.id, p.name]))

  return (
    <main>
      <header className="page-header rise">
        <p className="label">Resenha fora de campo</p>
        <h1 className="mt-1.5 font-display text-[32px] uppercase leading-none tracking-wide text-ink">Eventos</h1>
      </header>
      <div className="flex flex-col gap-3 p-3 pt-4">
        {events.length === 0 && (
          <p className="card px-4 py-6 text-center text-sm text-moss rise rise-1">Nenhum evento ainda.</p>
        )}
        {events.map((ev, i) => {
          const evEntries = entries.filter((e) => e.eventId === ev.id)
          const saldo = sumCents(evEntries)
          const gastos = evEntries.filter((e) => e.amountCents < 0)
          const contribs = evEntries.filter((e) => e.amountCents > 0)
          return (
            <details key={ev.id} className={`card group rise rise-${Math.min(i + 1, 5)}`}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2.5 text-sm font-semibold text-ink">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="size-3.5 shrink-0 text-moss transition-transform group-open:rotate-180"
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {ev.name}
                </span>
                <span className={saldo >= 0 ? 'chip-volt' : 'chip-clay'}>{formatBRL(saldo)}</span>
              </summary>
              <div className="grid grid-cols-2 gap-4 border-t border-line/40 p-4 text-xs">
                <div>
                  <p className="label mb-2 !text-clay">Gastos</p>
                  {gastos.map((e) => (
                    <p key={e.id} className="flex justify-between gap-2 py-1 text-moss">
                      <span className="truncate">{e.description ?? (e.playerId ? nameById.get(e.playerId) : 'Gasto')}</span>
                      <span className="shrink-0 font-semibold text-ink">{formatBRL(e.amountCents)}</span>
                    </p>
                  ))}
                  {gastos.length === 0 && <p className="py-1 text-moss/50">—</p>}
                </div>
                <div>
                  <p className="label mb-2 !text-volt">Contribuições</p>
                  {contribs.map((e) => (
                    <p key={e.id} className="flex justify-between gap-2 py-1 text-moss">
                      <span className="truncate">{e.playerId ? nameById.get(e.playerId) : (e.description ?? '?')}</span>
                      <span className="shrink-0 font-semibold text-ink">{formatBRL(e.amountCents)}</span>
                    </p>
                  ))}
                  {contribs.length === 0 && <p className="py-1 text-moss/50">—</p>}
                </div>
              </div>
            </details>
          )
        })}
      </div>
    </main>
  )
}

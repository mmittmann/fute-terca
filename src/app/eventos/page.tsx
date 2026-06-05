import { getEventEntries, getEvents, getAllPlayers } from '@/db/queries'
import { sumCents } from '@/lib/balance'
import { formatBRL } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function EventosPage() {
  const [events, entries, players] = await Promise.all([getEvents(), getEventEntries(), getAllPlayers()])
  const nameById = new Map(players.map((p) => [p.id, p.name]))

  return (
    <main>
      <header className="bg-green-600 px-4 py-4 text-white">
        <h1 className="text-lg font-bold">🍖 Eventos</h1>
      </header>
      <div className="flex flex-col gap-3 p-3">
        {events.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum evento ainda.</p>}
        {events.map((ev) => {
          const evEntries = entries.filter((e) => e.eventId === ev.id)
          const saldo = sumCents(evEntries)
          const gastos = evEntries.filter((e) => e.amountCents < 0)
          const contribs = evEntries.filter((e) => e.amountCents > 0)
          return (
            <details key={ev.id} className="rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold">
                <span>{ev.name}</span>
                <span className={saldo >= 0 ? 'text-green-600' : 'text-red-600'}>{formatBRL(saldo)}</span>
              </summary>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 text-xs">
                <div>
                  <p className="mb-1 font-bold text-red-600">Gastos</p>
                  {gastos.map((e) => (
                    <p key={e.id} className="flex justify-between py-0.5">
                      <span>{e.description ?? (e.playerId ? nameById.get(e.playerId) : 'Gasto')}</span>
                      <span>{formatBRL(e.amountCents)}</span>
                    </p>
                  ))}
                </div>
                <div>
                  <p className="mb-1 font-bold text-green-600">Contribuições</p>
                  {contribs.map((e) => (
                    <p key={e.id} className="flex justify-between py-0.5">
                      <span>{e.playerId ? nameById.get(e.playerId) : (e.description ?? '?')}</span>
                      <span>{formatBRL(e.amountCents)}</span>
                    </p>
                  ))}
                </div>
              </div>
            </details>
          )
        })}
      </div>
    </main>
  )
}

import { getShirtEntries, getShirtsWithPlayers } from '@/db/queries'
import { sumCents } from '@/lib/balance'
import { formatBRL } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function CamisasPage() {
  const [shirtList, shirtEntries] = await Promise.all([getShirtsWithPlayers(), getShirtEntries()])
  const arrecadado = sumCents(shirtEntries.filter((e) => e.amountCents > 0))
  const custo = sumCents(shirtEntries.filter((e) => e.amountCents < 0))
  const saldo = arrecadado + custo

  return (
    <main>
      <header className="page-header rise">
        <p className="label">O manto sagrado</p>
        <h1 className="mt-1.5 font-display text-[32px] uppercase leading-none tracking-wide text-ink">Camisas</h1>
      </header>

      <section className="card mx-3 mt-4 rise rise-1">
        <div className="grid grid-cols-3 items-center px-2 py-4">
          <div className="text-center">
            <div className="font-display text-lg leading-none text-volt">{formatBRL(arrecadado)}</div>
            <div className="label mt-1.5">Arrecadado</div>
          </div>
          <div className="border-x border-line/60 px-1 text-center">
            <div className="font-display text-lg leading-none text-clay">{formatBRL(custo)}</div>
            <div className="label mt-1.5">Custo</div>
          </div>
          <div className="text-center">
            <div className={`font-display text-lg leading-none ${saldo >= 0 ? 'text-volt' : 'text-clay'}`}>
              {formatBRL(saldo)}
            </div>
            <div className="label mt-1.5">Saldo</div>
          </div>
        </div>
      </section>

      <ul className="card mx-3 mt-3 divide-y divide-line/40 rise rise-2">
        {shirtList.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-pitch font-display text-xs text-moss">
              {s.size}
            </span>
            <span className="flex-1 truncate">
              <span className="font-semibold text-ink">{s.playerName}</span>
              {s.note && <span className="ml-1.5 text-xs text-moss/70">{s.note}</span>}
            </span>
            {s.paidEntryId ? (
              <span className="chip-volt">✓ {formatBRL(s.valueCents)}</span>
            ) : (
              <span className="chip-clay">Pendente</span>
            )}
          </li>
        ))}
        {shirtList.length === 0 && <li className="px-4 py-6 text-center text-sm text-moss">Nenhum pedido ainda.</li>}
      </ul>
    </main>
  )
}

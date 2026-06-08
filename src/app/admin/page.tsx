import Link from 'next/link'
import { EntryForm } from '@/components/entry-form'
import { EntryList, type EntryRow } from '@/components/entry-list'
import {
  getAllPlayers, getEvents, getFeeTable, getMonth, getMonthEntries, getAllYearSettings,
} from '@/db/queries'
import { currentYearMonth, monthLabel } from '@/lib/dates'
import { monthlyFeeCents } from '@/lib/fees'
import { monthSummary } from '@/lib/month-summary'
import { formatBRL } from '@/lib/money'
import { tuesdaysInMonth } from '@/lib/tuesdays'

export const dynamic = 'force-dynamic'

function centsToInput(cents: number | null): string {
  return cents === null ? '' : (cents / 100).toFixed(2).replace('.', ',')
}

export default async function AdminPage() {
  const { year, month } = currentYearMonth()
  const [allPlayers, eventsList, monthRow, monthEntries, feeTable, yearsCfg] = await Promise.all([
    getAllPlayers(), getEvents(), getMonth(year, month), getMonthEntries(year, month), getFeeTable(), getAllYearSettings(),
  ])

  // nº de jogos = terças do mês (override manual em Config quando existir)
  const gamesCount = monthRow?.gamesCount ?? tuesdaysInMonth(year, month).length
  const fee = monthlyFeeCents(feeTable, year, gamesCount)
  const yearCfg = yearsCfg.find((y) => y.year === year)
  const summary = monthSummary(monthEntries)
  const guessConfig = {
    monthlyFeeCents: feeTable.filter((f) => f.year === year).map((f) => f.feeCents),
    avulsoFeeCents: yearCfg?.avulsoFeeCents ?? 0,
    courtFeePerGameCents: yearCfg?.courtFeePerGameCents ?? 0,
    goalkeeperFeePerGameCents: yearCfg?.goalkeeperFeePerGameCents ?? 0,
  }
  const nameById = new Map(allPlayers.map((p) => [p.id, p.name]))

  const rows: EntryRow[] = monthEntries.map((e) => ({
    id: e.id,
    label: e.playerId ? (nameById.get(e.playerId) ?? '?') : (e.description ?? e.type),
    type: e.type,
    amountCents: e.amountCents,
  }))

  return (
    <main>
      <header className="page-header rise">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="label">Vestiário · {monthLabel(year, month)}</p>
            <h1 className="mt-1.5 font-display text-[32px] uppercase leading-none tracking-wide text-ink">Admin</h1>
          </div>
          <nav className="flex gap-1.5 pb-0.5">
            <Link href="/admin/jogadores" className="btn-ghost">Jogadores</Link>
            <Link href="/admin/config" className="btn-ghost">Config</Link>
            <Link href="/" className="btn-ghost">Sair</Link>
          </nav>
        </div>
        <p className="mt-2 text-xs text-moss">
          Saldo do mês <span className={`font-bold ${summary.saldoCents >= 0 ? 'text-volt' : 'text-clay'}`}>{formatBRL(summary.saldoCents)}</span>
          {' · '}{summary.pagamentos} pagamentos
        </p>
      </header>

      <div className="flex flex-col gap-3 p-3 pt-4">
        {fee === null && (
          <p className="warn-sand rise">
            Sem mensalidade cadastrada para {gamesCount} jogos em {year} — cadastre em Config → Mensalidade por nº de jogos (opcional; usado só para sugerir o valor).
          </p>
        )}

        <div className="rise rise-1">
          <EntryForm
            refs={{
              players: allPlayers.map((p) => ({ id: p.id, name: p.name })),
              events: eventsList.map((ev) => ({ id: ev.id, name: ev.name })),
              year, month,
              defaultFee: centsToInput(fee),
              defaultAvulso: centsToInput(yearCfg?.avulsoFeeCents ?? null),
              guessConfig,
            }}
          />
        </div>

        <section className="rise rise-2">
          <h2 className="label mb-2 mt-1 px-1">Lançamentos do mês</h2>
          <EntryList rows={rows} />
        </section>
      </div>
    </main>
  )
}

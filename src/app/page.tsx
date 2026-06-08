import { MonthLedger, type LedgerRow } from '@/components/month-ledger'
import { getAllPlayers, getFeeTable, getMonth, getMonthEntries, getSettingsMap } from '@/db/queries'
import { currentYearMonth, monthLabel } from '@/lib/dates'
import { monthlyFeeCents } from '@/lib/fees'
import { formatBRL } from '@/lib/money'
import { monthSummary } from '@/lib/month-summary'
import { tuesdaysInMonth } from '@/lib/tuesdays'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { year, month } = currentYearMonth()
  const [settings, allPlayers, monthRow, monthEntries, feeTable] = await Promise.all([
    getSettingsMap(), getAllPlayers(), getMonth(year, month), getMonthEntries(year, month), getFeeTable(),
  ])

  // nº de jogos = terças do mês (override manual em /admin/config quando existir)
  const gamesCount = monthRow?.gamesCount ?? tuesdaysInMonth(year, month).length
  const fee = monthlyFeeCents(feeTable, year, gamesCount)

  const summary = monthSummary(monthEntries)
  const nameById = new Map(allPlayers.map((p) => [p.id, p.name]))

  const rows: LedgerRow[] = monthEntries.map((e) => ({
    id: e.id,
    name: e.playerId ? (nameById.get(e.playerId) ?? '?') : (e.description ?? e.type),
    type: e.type,
    amountCents: e.amountCents,
  }))

  return (
    <main>
      <header className="page-header rise">
        <p className="label">{settings.group_name ?? 'Controle Futebol'}</p>
        <h1 className="mt-1.5 font-display text-[32px] uppercase leading-none tracking-wide text-ink">
          {monthLabel(year, month)}
        </h1>
        <p className="mt-2 text-xs text-moss">
          {`${gamesCount} jogos no mês (terças)`}
          {fee !== null && (
            <>
              {' · mensalidade '}
              <span className="font-bold text-ink">{formatBRL(fee)}</span>
            </>
          )}
        </p>
      </header>

      {/* Placar do mês */}
      <section className="card mx-3 mt-4 rise rise-1">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 px-3 py-5">
          <div className="text-center">
            <div className="font-display text-[26px] leading-none text-ink">{summary.pagamentos}</div>
            <div className="label mt-2">Pagaram</div>
          </div>
          <div className="border-x border-line/60 px-5 text-center">
            <div
              className={`font-display text-[30px] leading-none whitespace-nowrap ${
                summary.saldoCents >= 0 ? 'score-glow text-volt' : 'score-glow-clay text-clay'
              }`}
            >
              {formatBRL(summary.saldoCents)}
            </div>
            <div className="label mt-2">Saldo do mês</div>
          </div>
          <div className="text-center">
            <div className="font-display text-[26px] leading-none text-ink">{gamesCount}</div>
            <div className="label mt-2">Jogos</div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-4 border-t border-line/50 py-2.5 text-[11px]">
          <span className="text-moss">
            Entradas <span className="font-bold text-volt">{formatBRL(summary.entradasCents)}</span>
          </span>
          <span className="text-line">·</span>
          <span className="text-moss">
            Saídas <span className="font-bold text-clay">{formatBRL(summary.saidasCents)}</span>
          </span>
        </div>
      </section>

      <p className="mx-4 mt-3 text-[11px] leading-relaxed text-moss/70 rise rise-2">
        O mês começa zerado. Lance a quadra e vá adicionando quem pagar — o saldo sobe a cada pagamento.
      </p>

      <div className="rise rise-2">
        <MonthLedger rows={rows} />
      </div>
    </main>
  )
}

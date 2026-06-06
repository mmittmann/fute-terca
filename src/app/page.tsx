import { PaymentList, type PaymentRow } from '@/components/payment-list'
import {
  getActivePlayers, getAllEntries, getAllPlayers, getFeeTable, getMonth, getMonthEntries, getSettingsMap,
} from '@/db/queries'
import { sumCents, monthCollection } from '@/lib/balance'
import { currentYearMonth, monthLabel } from '@/lib/dates'
import { monthlyFeeCents } from '@/lib/fees'
import { formatBRL } from '@/lib/money'
import { computeMonthStatus } from '@/lib/status'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { year, month } = currentYearMonth()
  const [settings, active, allPlayers, monthRow, monthEntries, feeTable, allEntries] = await Promise.all([
    getSettingsMap(), getActivePlayers(), getAllPlayers(), getMonth(year, month),
    getMonthEntries(year, month), getFeeTable(), getAllEntries(),
  ])

  const fee = monthRow ? monthlyFeeCents(feeTable, year, monthRow.gamesCount) : null
  const status = computeMonthStatus(active, monthEntries)
  const cash = sumCents(allEntries)
  const collection = fee ? monthCollection(active.length, fee, monthEntries) : null
  const nameById = new Map(allPlayers.map((p) => [p.id, p.name]))

  const rows: PaymentRow[] = [
    ...status.pending.map((p) => ({ id: `p-${p.id}`, name: p.name, status: 'pendente' as const })),
    ...status.paid.map((p) => ({ id: `p-${p.id}`, name: p.name, status: 'pago' as const })),
    ...monthEntries
      .filter((e) => e.type === 'avulso')
      .map((e) => ({
        id: `e-${e.id}`,
        name: e.playerId ? (nameById.get(e.playerId) ?? '?') : (e.description ?? '?'),
        status: 'avulso' as const,
        amountCents: e.amountCents,
      })),
  ]

  const pct = collection && collection.expectedCents > 0
    ? Math.min(100, Math.round((collection.collectedCents / collection.expectedCents) * 100))
    : 0

  return (
    <main>
      <header className="page-header rise">
        <p className="label">{settings.group_name ?? 'Controle Futebol'}</p>
        <h1 className="mt-1.5 font-display text-[32px] uppercase leading-none tracking-wide text-ink">
          {monthLabel(year, month)}
        </h1>
        <p className="mt-2 text-xs text-moss">
          {monthRow ? `${monthRow.gamesCount} jogos no mês` : 'mês ainda sem configuração'}
          {fee !== null && (
            <>
              {' · mensalidade '}
              <span className="font-bold text-ink">{formatBRL(fee)}</span>
            </>
          )}
        </p>
      </header>

      {/* Placar */}
      <section className="card mx-3 mt-4 rise rise-1">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1 px-3 py-5">
          <div className="text-center">
            <div className="font-display text-[26px] leading-none text-ink">
              {status.paid.length}
              <span className="text-moss/60">/{active.length}</span>
            </div>
            <div className="label mt-2">Pagos</div>
          </div>
          <div className="border-x border-line/60 px-5 text-center">
            <div
              className={`font-display text-[30px] leading-none whitespace-nowrap ${
                cash >= 0 ? 'score-glow text-volt' : 'score-glow-clay text-clay'
              }`}
            >
              {formatBRL(cash)}
            </div>
            <div className="label mt-2">Caixa</div>
          </div>
          <div className="text-center">
            <div className="font-display text-[26px] leading-none text-ink">
              {monthRow ? monthRow.gamesCount : '—'}
            </div>
            <div className="label mt-2">Jogos</div>
          </div>
        </div>
      </section>

      {collection && (
        <section className="card mx-3 mt-3 rise rise-2 p-4">
          <div className="flex items-baseline justify-between">
            <span className="label">Arrecadação do mês</span>
            <span className="text-xs text-moss">
              <span className="font-bold text-ink">{formatBRL(collection.collectedCents)}</span>
              {' de '}
              {formatBRL(collection.expectedCents)}
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full border border-line/50 bg-pitch/80">
            <div
              className="h-full rounded-full bg-gradient-to-r from-volt-deep to-volt shadow-[0_0_12px_rgba(198,245,66,0.5)] transition-[width] duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </section>
      )}

      <div className="rise rise-3">
        <PaymentList rows={rows} />
      </div>
    </main>
  )
}

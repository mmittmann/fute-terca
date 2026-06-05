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
    ...status.pending.map((p) => ({ name: p.name, status: 'pendente' as const })),
    ...status.paid.map((p) => ({ name: p.name, status: 'pago' as const })),
    ...monthEntries
      .filter((e) => e.type === 'avulso')
      .map((e) => ({
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
      <header className="bg-green-600 px-4 py-4 text-white">
        <h1 className="text-lg font-bold">⚽ {settings.group_name ?? 'Controle Futebol'}</h1>
        <p className="text-xs opacity-90">
          {monthLabel(year, month)}
          {monthRow && ` · ${monthRow.gamesCount} jogos`}
          {fee !== null && ` · mensalidade ${formatBRL(fee)}`}
        </p>
      </header>

      <section className="flex gap-2 px-3 py-3">
        <Card value={formatBRL(cash)} label="CAIXA" />
        <Card value={`${status.paid.length}/${active.length}`} label="PAGOS" />
        <Card value={monthRow ? String(monthRow.gamesCount) : '—'} label="JOGOS" />
      </section>

      {collection && (
        <section className="mx-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <strong>Arrecadação do mês</strong> — {formatBRL(collection.collectedCents)} de{' '}
          {formatBRL(collection.expectedCents)}
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-green-600" style={{ width: `${pct}%` }} />
          </div>
        </section>
      )}

      <PaymentList rows={rows} />
    </main>
  )
}

function Card({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-center">
      <div className="text-base font-extrabold">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold text-slate-500">{label}</div>
    </div>
  )
}

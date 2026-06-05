import Link from 'next/link'
import { EntryForm } from '@/components/entry-form'
import { EntryList, type EntryRow } from '@/components/entry-list'
import { CopyButton } from '@/components/copy-button'
import {
  getActivePlayers, getAllPlayers, getEvents, getFeeTable, getMonth, getMonthEntries, getSettingsMap, getAllYearSettings,
} from '@/db/queries'
import { buildCobrancaMessage } from '@/lib/cobranca'
import { currentYearMonth, monthLabel } from '@/lib/dates'
import { monthlyFeeCents } from '@/lib/fees'
import { computeMonthStatus } from '@/lib/status'

export const dynamic = 'force-dynamic'

function centsToInput(cents: number | null): string {
  return cents === null ? '' : (cents / 100).toFixed(2).replace('.', ',')
}

export default async function AdminPage() {
  const { year, month } = currentYearMonth()
  const [settings, active, allPlayers, eventsList, monthRow, monthEntries, feeTable, yearsCfg] = await Promise.all([
    getSettingsMap(), getActivePlayers(), getAllPlayers(), getEvents(), getMonth(year, month),
    getMonthEntries(year, month), getFeeTable(), getAllYearSettings(),
  ])

  const fee = monthRow ? monthlyFeeCents(feeTable, year, monthRow.gamesCount) : null
  const yearCfg = yearsCfg.find((y) => y.year === year)
  const status = computeMonthStatus(active, monthEntries)
  const nameById = new Map(allPlayers.map((p) => [p.id, p.name]))

  const rows: EntryRow[] = monthEntries.map((e) => ({
    id: e.id,
    label: e.playerId ? (nameById.get(e.playerId) ?? '?') : (e.description ?? e.type),
    type: e.type,
    amountCents: e.amountCents,
  }))

  const cobranca = buildCobrancaMessage({
    monthLabel: monthLabel(year, month),
    feeCents: fee ?? 0,
    pendingNames: status.pending.map((p) => p.name),
    pixKey: settings.pix_key ?? '(configure a chave PIX em /admin/config)',
  })

  return (
    <main className="flex flex-col gap-4 p-3">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">🔒 Admin · {monthLabel(year, month)}</h1>
        <nav className="flex gap-3 text-xs font-semibold text-green-700">
          <Link href="/admin/jogadores">Jogadores</Link>
          <Link href="/admin/config">Config</Link>
          <Link href="/">Sair p/ app</Link>
        </nav>
      </header>

      {!monthRow && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
          Mês sem nº de jogos definido — configure em /admin/config para calcular a mensalidade.
        </p>
      )}

      <EntryForm
        refs={{
          players: allPlayers.map((p) => ({ id: p.id, name: p.name })),
          events: eventsList.map((ev) => ({ id: ev.id, name: ev.name })),
          year, month,
          defaultFee: centsToInput(fee),
          defaultAvulso: centsToInput(yearCfg?.avulsoFeeCents ?? null),
        }}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Cobrança — {status.pending.length} pendentes</h2>
        <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs">{cobranca}</pre>
        <CopyButton text={cobranca} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold">Lançamentos do mês</h2>
        <EntryList rows={rows} />
      </section>
    </main>
  )
}

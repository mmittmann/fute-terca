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

  const cobranca = fee !== null ? buildCobrancaMessage({
    monthLabel: monthLabel(year, month),
    feeCents: fee,
    pendingNames: status.pending.map((p) => p.name),
    pixKey: settings.pix_key ?? '(configure a chave PIX em /admin/config)',
  }) : ''

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
      </header>

      <div className="flex flex-col gap-3 p-3 pt-4">
        {!monthRow && (
          <p className="warn-sand rise">
            Mês sem nº de jogos definido — configure em Config para calcular a mensalidade.
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
            }}
          />
        </div>

        {fee !== null ? (
          <section className="card rise rise-2 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="label">Cobrança</h2>
              <span className="chip-clay">{status.pending.length} pendentes</span>
            </div>
            <pre className="mb-3 whitespace-pre-wrap rounded-xl border border-line/50 bg-pitch/80 p-3.5 font-sans text-xs leading-relaxed text-moss">
              {cobranca}
            </pre>
            <CopyButton text={cobranca} />
          </section>
        ) : (
          <p className="warn-sand rise rise-2">
            Cobrança indisponível — configure os jogos do mês e a tabela de mensalidade em Config.
          </p>
        )}

        <section className="rise rise-3">
          <h2 className="label mb-2 mt-1 px-1">Lançamentos do mês</h2>
          <EntryList rows={rows} />
        </section>
      </div>
    </main>
  )
}

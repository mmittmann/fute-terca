import Link from 'next/link'
import { EntryForm } from '@/components/entry-form'
import { EntryList, type EntryRow } from '@/components/entry-list'
import { GameListCard } from '@/components/game-list-card'
import { PostGameReconcile, type ReconcilePaid } from '@/components/post-game-reconcile'
import {
  getAllPlayers, getEvents, getFeeTable, getMonth, getMonthEntries, getSettingsMap, getAllYearSettings,
} from '@/db/queries'
import { currentYearMonth, monthLabel } from '@/lib/dates'
import { monthlyFeeCents } from '@/lib/fees'
import { buildGameListMessage } from '@/lib/game-list'
import { monthSummary } from '@/lib/month-summary'
import { formatBRL } from '@/lib/money'
import { tuesdaysInMonth } from '@/lib/tuesdays'

export const dynamic = 'force-dynamic'

function centsToInput(cents: number | null): string {
  return cents === null ? '' : (cents / 100).toFixed(2).replace('.', ',')
}

/** Próxima terça-feira (>= hoje) no fuso de São Paulo. */
function nextTuesdaySP(): { label: string; year: number; month: number } {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const [y, m, d] = ymd.split('-').map(Number)
  const base = new Date(Date.UTC(y, m - 1, d))
  const add = (2 - base.getUTCDay() + 7) % 7 // dias até a próxima terça (0 se hoje for terça)
  base.setUTCDate(base.getUTCDate() + add)
  const dd = String(base.getUTCDate()).padStart(2, '0')
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0')
  return { label: `${dd}/${mm}`, year: base.getUTCFullYear(), month: base.getUTCMonth() + 1 }
}

export default async function AdminPage() {
  const { year, month } = currentYearMonth()
  const game = nextTuesdaySP()
  const [settings, allPlayers, eventsList, monthRow, monthEntries, gameEntries, feeTable, yearsCfg] = await Promise.all([
    getSettingsMap(), getAllPlayers(), getEvents(), getMonth(year, month),
    getMonthEntries(year, month), getMonthEntries(game.year, game.month), getFeeTable(), getAllYearSettings(),
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

  // Lista do jogo (próxima terça): mensalistas pagos no mês do jogo, em ordem cronológica
  const gameGames = game.year === year && game.month === month ? gamesCount : tuesdaysInMonth(game.year, game.month).length
  const gameFee = monthlyFeeCents(feeTable, game.year, gameGames)
  const gameYearCfg = yearsCfg.find((y) => y.year === game.year)
  const paidMensalNames = [...gameEntries]
    .reverse() // getMonthEntries vem desc(createdAt); reverte p/ cronológico
    .filter((e) => e.type === 'mensal' && e.amountCents > 0 && e.playerId)
    .map((e) => nameById.get(e.playerId!) ?? '?')
  const gameMessage = buildGameListMessage({
    dateLabel: game.label,
    mensalFeeCents: gameFee,
    avulsoFeeCents: gameYearCfg?.avulsoFeeCents ?? null,
    pixKey: settings.pix_key || '(configure a chave PIX em Config)',
    paidMensalNames,
  })

  // Conferência pós-jogo: quem pagou (mensal/avulso positivo) no mês do jogo
  const reconcilePlayers = allPlayers.map((p) => ({ name: p.name, aliases: p.aliases }))
  const reconcilePaid: ReconcilePaid[] = gameEntries
    .filter((e) => (e.type === 'mensal' || e.type === 'avulso') && e.amountCents > 0 && e.playerId)
    .map((e) => ({ name: nameById.get(e.playerId!) ?? '?', tipo: e.type as 'mensal' | 'avulso' }))

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
        <div className="rise rise-1">
          <GameListCard text={gameMessage} />
        </div>

        <div className="rise rise-2">
          <PostGameReconcile players={reconcilePlayers} paid={reconcilePaid} />
        </div>

        {fee === null && (
          <p className="warn-sand rise rise-1">
            Sem mensalidade cadastrada para {gamesCount} jogos em {year} — cadastre em Config → Mensalidade por nº de jogos (usado para sugerir o valor).
          </p>
        )}

        <div className="rise rise-2">
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

        <section className="rise rise-3">
          <h2 className="label mb-2 mt-1 px-1">Lançamentos do mês</h2>
          <EntryList rows={rows} />
        </section>
      </div>
    </main>
  )
}

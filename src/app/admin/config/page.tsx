import Link from 'next/link'
import {
  createEvent, createShirt, saveSetting, upsertMonth, upsertMonthlyFee, upsertYearSettings,
} from '@/app/admin/actions'
import {
  getAllMonths, getAllPlayers, getAllYearSettings, getEvents, getFeeTable, getSettingsMap,
  getShirtsWithPlayers,
} from '@/db/queries'
import { currentYearMonth } from '@/lib/dates'
import { formatBRL } from '@/lib/money'
import { ShirtPayButton } from '@/components/shirt-pay-button'

export const dynamic = 'force-dynamic'

const btnCls = 'btn-volt shrink-0 !px-3.5 !py-2 !text-xs'

export default async function ConfigPage() {
  const { year, month } = currentYearMonth()
  const [settings, yearsCfg, feeTable, monthsList, players, eventsList, shirtsList] = await Promise.all([
    getSettingsMap(), getAllYearSettings(), getFeeTable(), getAllMonths(), getAllPlayers(), getEvents(),
    getShirtsWithPlayers(),
  ])

  return (
    <main>
      <header className="page-header rise">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="label">Prancheta do treinador</p>
            <h1 className="mt-1.5 font-display text-[32px] uppercase leading-none tracking-wide text-ink">Config</h1>
          </div>
          <Link href="/admin" className="btn-ghost mb-0.5">← Admin</Link>
        </div>
      </header>

      <div className="flex flex-col gap-3 p-3 pt-4">
        <section className="card rise rise-1 p-4">
          <h2 className="label mb-3">Grupo e PIX</h2>
          {(['group_name', 'pix_key'] as const).map((key) => (
            <form key={key} action={async (fd) => { 'use server'; await saveSetting(fd) }} className="mb-2 flex gap-2">
              <input type="hidden" name="key" value={key} />
              <input name="value" defaultValue={settings[key] ?? ''} className="input flex-1"
                placeholder={key === 'group_name' ? 'Nome do grupo' : 'Chave PIX'} />
              <button className={btnCls}>Salvar</button>
            </form>
          ))}
        </section>

        <section className="card rise rise-2 p-4">
          <h2 className="label mb-3">Jogos do mês atual · {String(month).padStart(2, '0')}/{year}</h2>
          <form action={async (fd) => { 'use server'; await upsertMonth(fd) }} className="flex gap-2">
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />
            <input name="gamesCount" type="number" min={1} max={6}
              defaultValue={monthsList.find((m) => m.year === year && m.month === month)?.gamesCount ?? 4}
              className="input w-24" />
            <button className={btnCls}>Salvar</button>
          </form>
        </section>

        <section className="card rise rise-3 p-4">
          <h2 className="label mb-3">Preços do ano (reajuste)</h2>
          <form action={async (fd) => { 'use server'; await upsertYearSettings(fd) }} className="grid grid-cols-2 gap-2">
            <input name="year" type="number" defaultValue={year} className="input" />
            <input name="avulsoFee" placeholder="Avulso (25,00)" required className="input" />
            <input name="courtFeePerGame" placeholder="Quadra/jogo (240,00)" required className="input" />
            <input name="goalkeeperFeePerGame" placeholder="Goleiro/jogo (45,00)" required className="input" />
            <button className={`${btnCls} col-span-2`}>Salvar preços do ano</button>
          </form>
          <ul className="mt-3 space-y-1 text-xs text-moss">
            {yearsCfg.map((y) => (
              <li key={y.year}>
                <span className="font-display text-ink">{y.year}</span> · avulso {formatBRL(y.avulsoFeeCents)} · quadra {formatBRL(y.courtFeePerGameCents)}/jogo · goleiro {formatBRL(y.goalkeeperFeePerGameCents)}/jogo
              </li>
            ))}
          </ul>
        </section>

        <section className="card rise rise-4 p-4">
          <h2 className="label mb-3">Mensalidade por nº de jogos</h2>
          <form action={async (fd) => { 'use server'; await upsertMonthlyFee(fd) }} className="flex gap-2">
            <input name="year" type="number" defaultValue={year} className="input w-24" />
            <input name="gamesCount" type="number" min={1} max={6} placeholder="Jogos" required className="input w-20" />
            <input name="fee" placeholder="75,00" required className="input flex-1" />
            <button className={btnCls}>Salvar</button>
          </form>
          <ul className="mt-3 space-y-1 text-xs text-moss">
            {feeTable.map((f) => (
              <li key={`${f.year}-${f.gamesCount}`}>
                <span className="font-display text-ink">{f.year}</span> · {f.gamesCount} jogos → <span className="font-bold text-volt">{formatBRL(f.feeCents)}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card rise rise-5 p-4">
          <h2 className="label mb-3">Novo evento</h2>
          <form action={async (fd) => { 'use server'; await createEvent(fd) }} className="flex gap-2">
            <input name="name" required placeholder="Churrasco de fim de ano" className="input flex-1" />
            <input name="date" type="date" className="input w-36" />
            <button className={btnCls}>Criar</button>
          </form>
          <p className="mt-2.5 text-xs text-moss">{eventsList.length} eventos cadastrados.</p>
        </section>

        <section className="card rise rise-5 p-4">
          <h2 className="label mb-3">Novo pedido de camisa</h2>
          <form action={async (fd) => { 'use server'; await createShirt(fd) }} className="grid grid-cols-2 gap-2">
            <select name="playerId" required className="input">
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select name="size" required className="input">
              {['P', 'M', 'G', 'GG'].map((s) => <option key={s}>{s}</option>)}
            </select>
            <input name="value" placeholder="120,00" required className="input" />
            <input name="note" placeholder="Obs (opcional)" className="input" />
            <button className={`${btnCls} col-span-2`}>Criar pedido</button>
          </form>
          <ul className="mt-3 divide-y divide-line/40 text-xs">
            {shirtsList.filter((s) => !s.paidEntryId).map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-moss">
                  <span className="font-semibold text-ink">{s.playerName}</span> · {s.size} · {formatBRL(s.valueCents)}
                </span>
                <ShirtPayButton shirtId={s.id} year={year} month={month} />
              </li>
            ))}
            {shirtsList.every((s) => s.paidEntryId) && (
              <li className="py-2 text-moss/60">Nenhuma camisa pendente.</li>
            )}
          </ul>
        </section>
      </div>
    </main>
  )
}

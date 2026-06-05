import Link from 'next/link'
import {
  createEvent, createShirt, saveSetting, upsertMonth, upsertMonthlyFee, upsertYearSettings,
} from '@/app/admin/actions'
import {
  getAllMonths, getAllPlayers, getAllYearSettings, getEvents, getFeeTable, getSettingsMap,
} from '@/db/queries'
import { currentYearMonth } from '@/lib/dates'
import { formatBRL } from '@/lib/money'

export const dynamic = 'force-dynamic'

const inputCls = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm'
const btnCls = 'rounded-lg bg-green-600 px-3 py-1.5 text-sm font-bold text-white'

export default async function ConfigPage() {
  const { year, month } = currentYearMonth()
  const [settings, yearsCfg, feeTable, monthsList, players, eventsList] = await Promise.all([
    getSettingsMap(), getAllYearSettings(), getFeeTable(), getAllMonths(), getAllPlayers(), getEvents(),
  ])

  return (
    <main className="flex flex-col gap-5 p-3">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Configurações</h1>
        <Link href="/admin" className="text-xs font-semibold text-green-700">← Admin</Link>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Grupo e PIX</h2>
        {(['group_name', 'pix_key'] as const).map((key) => (
          <form key={key} action={async (fd) => { 'use server'; await saveSetting(fd) }} className="mb-2 flex gap-2">
            <input type="hidden" name="key" value={key} />
            <input name="value" defaultValue={settings[key] ?? ''} className={`flex-1 ${inputCls}`}
              placeholder={key === 'group_name' ? 'Nome do grupo' : 'Chave PIX'} />
            <button className={btnCls}>Salvar</button>
          </form>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Jogos do mês atual ({String(month).padStart(2, '0')}/{year})</h2>
        <form action={async (fd) => { 'use server'; await upsertMonth(fd) }} className="flex gap-2">
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <input name="gamesCount" type="number" min={1} max={6}
            defaultValue={monthsList.find((m) => m.year === year && m.month === month)?.gamesCount ?? 4}
            className={`w-20 ${inputCls}`} />
          <button className={btnCls}>Salvar</button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Preços do ano (reajuste)</h2>
        <form action={async (fd) => { 'use server'; await upsertYearSettings(fd) }} className="grid grid-cols-2 gap-2">
          <input name="year" type="number" defaultValue={year} className={inputCls} />
          <input name="avulsoFee" placeholder="Avulso (25,00)" required className={inputCls} />
          <input name="courtFeePerGame" placeholder="Quadra/jogo (240,00)" required className={inputCls} />
          <input name="goalkeeperFeePerGame" placeholder="Goleiro/jogo (45,00)" required className={inputCls} />
          <button className={`col-span-2 ${btnCls}`}>Salvar preços do ano</button>
        </form>
        <ul className="mt-2 text-xs text-slate-500">
          {yearsCfg.map((y) => (
            <li key={y.year}>
              {y.year}: avulso {formatBRL(y.avulsoFeeCents)} · quadra {formatBRL(y.courtFeePerGameCents)}/jogo · goleiro {formatBRL(y.goalkeeperFeePerGameCents)}/jogo
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Mensalidade por nº de jogos</h2>
        <form action={async (fd) => { 'use server'; await upsertMonthlyFee(fd) }} className="flex gap-2">
          <input name="year" type="number" defaultValue={year} className={`w-20 ${inputCls}`} />
          <input name="gamesCount" type="number" min={1} max={6} placeholder="Jogos" required className={`w-16 ${inputCls}`} />
          <input name="fee" placeholder="75,00" required className={`flex-1 ${inputCls}`} />
          <button className={btnCls}>Salvar</button>
        </form>
        <ul className="mt-2 text-xs text-slate-500">
          {feeTable.map((f) => (
            <li key={`${f.year}-${f.gamesCount}`}>{f.year} · {f.gamesCount} jogos → {formatBRL(f.feeCents)}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Novo evento</h2>
        <form action={async (fd) => { 'use server'; await createEvent(fd) }} className="flex gap-2">
          <input name="name" required placeholder="Churrasco de fim de ano" className={`flex-1 ${inputCls}`} />
          <input name="date" type="date" className={inputCls} />
          <button className={btnCls}>Criar</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">{eventsList.length} eventos cadastrados.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Novo pedido de camisa</h2>
        <form action={async (fd) => { 'use server'; await createShirt(fd) }} className="grid grid-cols-2 gap-2">
          <select name="playerId" required className={inputCls}>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select name="size" required className={inputCls}>
            {['P', 'M', 'G', 'GG'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <input name="value" placeholder="120,00" required className={inputCls} />
          <input name="note" placeholder="Obs (opcional)" className={inputCls} />
          <button className={`col-span-2 ${btnCls}`}>Criar pedido</button>
        </form>
      </section>
    </main>
  )
}

import Link from 'next/link'
import { PlayerForm } from '@/components/player-form'
import { PlayerToggle } from '@/components/player-toggle'
import { getAllPlayers } from '@/db/queries'

export const dynamic = 'force-dynamic'

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

export default async function JogadoresPage() {
  const list = await getAllPlayers()
  const ativos = list.filter((p) => p.isMonthlyActive).length
  return (
    <main>
      <header className="page-header rise">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="label">Elenco · {ativos} mensalistas de {list.length}</p>
            <h1 className="mt-1.5 font-display text-[32px] uppercase leading-none tracking-wide text-ink">Jogadores</h1>
          </div>
          <Link href="/admin" className="btn-ghost mb-0.5">← Admin</Link>
        </div>
      </header>

      <div className="flex flex-col gap-3 p-3 pt-4">
        <div className="card rise rise-1 p-4">
          <PlayerForm />
        </div>

        <ul className="card rise rise-2 divide-y divide-line/40">
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line bg-pitch font-display text-[13px] tracking-wider text-moss">
                {initials(p.name)}
              </span>
              <span className="flex-1 truncate font-semibold text-ink">{p.name}</span>
              <PlayerToggle id={p.id} active={p.isMonthlyActive} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

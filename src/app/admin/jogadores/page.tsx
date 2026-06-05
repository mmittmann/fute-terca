import Link from 'next/link'
import { PlayerForm } from '@/components/player-form'
import { PlayerToggle } from '@/components/player-toggle'
import { getAllPlayers } from '@/db/queries'

export const dynamic = 'force-dynamic'

export default async function JogadoresPage() {
  const list = await getAllPlayers()
  return (
    <main className="flex flex-col gap-4 p-3">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Jogadores ({list.length})</h1>
        <Link href="/admin" className="text-xs font-semibold text-green-700">← Admin</Link>
      </header>

      <PlayerForm />

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {list.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-semibold">{p.name}</span>
            <PlayerToggle id={p.id} active={p.isMonthlyActive} />
          </li>
        ))}
      </ul>
    </main>
  )
}

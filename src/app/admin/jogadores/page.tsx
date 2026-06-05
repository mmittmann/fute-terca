import Link from 'next/link'
import { createPlayer } from '@/app/admin/actions'
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

      <form action={async (fd) => { 'use server'; await createPlayer(fd) }} className="flex gap-2">
        <input name="name" required placeholder="Nome do jogador"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <label className="flex items-center gap-1 text-xs font-semibold">
          <input type="checkbox" name="isMonthlyActive" value="true" /> Mensalista
        </label>
        <button className="rounded-lg bg-green-600 px-4 text-sm font-bold text-white">Add</button>
      </form>

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

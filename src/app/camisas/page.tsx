import { getShirtEntries, getShirtsWithPlayers } from '@/db/queries'
import { sumCents } from '@/lib/balance'
import { formatBRL } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function CamisasPage() {
  const [shirtList, shirtEntries] = await Promise.all([getShirtsWithPlayers(), getShirtEntries()])
  const arrecadado = sumCents(shirtEntries.filter((e) => e.amountCents > 0))
  const custo = sumCents(shirtEntries.filter((e) => e.amountCents < 0))

  return (
    <main>
      <header className="bg-green-600 px-4 py-4 text-white">
        <h1 className="text-lg font-bold">👕 Camisas</h1>
        <p className="text-xs opacity-90">
          Arrecadado {formatBRL(arrecadado)} · Custo {formatBRL(custo)} · Saldo {formatBRL(arrecadado + custo)}
        </p>
      </header>
      <ul className="m-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {shirtList.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-semibold">
              {s.playerName} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">{s.size}</span>
              {s.note && <span className="ml-1 text-xs text-slate-400">{s.note}</span>}
            </span>
            {s.paidEntryId ? (
              <span className="font-bold text-green-600">✓ {formatBRL(s.valueCents)}</span>
            ) : (
              <span className="font-bold text-red-600">Pendente</span>
            )}
          </li>
        ))}
        {shirtList.length === 0 && <li className="px-4 py-4 text-sm text-slate-500">Nenhum pedido ainda.</li>}
      </ul>
    </main>
  )
}

import { HistoricoCharts } from '@/components/historico-charts'
import { getAllEntries } from '@/db/queries'
import { buildMonthlySeries, buildYearTotals } from '@/lib/series'

export const dynamic = 'force-dynamic'

export default async function HistoricoPage() {
  const entries = await getAllEntries()
  return (
    <main>
      <header className="bg-green-600 px-4 py-4 text-white">
        <h1 className="text-lg font-bold">📊 Histórico</h1>
      </header>
      <HistoricoCharts series={buildMonthlySeries(entries)} years={buildYearTotals(entries)} />
    </main>
  )
}

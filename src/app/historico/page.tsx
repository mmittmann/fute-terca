import { HistoricoCharts } from '@/components/historico-charts'
import { getAllEntries } from '@/db/queries'
import { buildMonthlySeries, buildYearTotals } from '@/lib/series'

export const dynamic = 'force-dynamic'

export default async function HistoricoPage() {
  const entries = await getAllEntries()
  return (
    <main>
      <header className="page-header rise">
        <p className="label">Retrospectiva</p>
        <h1 className="mt-1.5 font-display text-[32px] uppercase leading-none tracking-wide text-ink">Histórico</h1>
      </header>
      <HistoricoCharts series={buildMonthlySeries(entries)} years={buildYearTotals(entries)} />
    </main>
  )
}

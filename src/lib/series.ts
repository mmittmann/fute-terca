export interface SeriesEntry {
  year: number
  month: number
  amountCents: number
}

export interface MonthPoint {
  key: string
  label: string
  receitaCents: number
  despesaCents: number
  saldoAcumuladoCents: number
}

export function buildMonthlySeries(entries: SeriesEntry[]): MonthPoint[] {
  const byMonth = new Map<string, { receitaCents: number; despesaCents: number }>()
  for (const e of entries) {
    const key = `${e.year}-${String(e.month).padStart(2, '0')}`
    const acc = byMonth.get(key) ?? { receitaCents: 0, despesaCents: 0 }
    if (e.amountCents >= 0) acc.receitaCents += e.amountCents
    else acc.despesaCents += e.amountCents
    byMonth.set(key, acc)
  }
  const keys = [...byMonth.keys()].sort()
  let running = 0
  return keys.map((key) => {
    const { receitaCents, despesaCents } = byMonth.get(key)!
    running += receitaCents + despesaCents
    const [y, m] = key.split('-')
    return { key, label: `${m}/${y.slice(2)}`, receitaCents, despesaCents, saldoAcumuladoCents: running }
  })
}

export interface YearTotal {
  year: number
  receitaCents: number
  despesaCents: number
}

export function buildYearTotals(entries: SeriesEntry[]): YearTotal[] {
  const byYear = new Map<number, YearTotal>()
  for (const e of entries) {
    const acc = byYear.get(e.year) ?? { year: e.year, receitaCents: 0, despesaCents: 0 }
    if (e.amountCents >= 0) acc.receitaCents += e.amountCents
    else acc.despesaCents += e.amountCents
    byYear.set(e.year, acc)
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year)
}

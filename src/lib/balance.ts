import type { EntryRef } from './status'

export function sumCents(entries: { amountCents: number }[]): number {
  return entries.reduce((s, e) => s + e.amountCents, 0)
}

export interface MonthCollection {
  collectedCents: number
  expectedCents: number
}

export function monthCollection(
  activeCount: number,
  feeCents: number,
  monthEntries: EntryRef[],
): MonthCollection {
  const collectedCents = sumCents(
    monthEntries.filter((e) => e.type === 'mensal' || e.type === 'avulso'),
  )
  return { collectedCents, expectedCents: activeCount * feeCents }
}

export interface FeeRow {
  year: number
  gamesCount: number
  feeCents: number
}

export function monthlyFeeCents(table: FeeRow[], year: number, gamesCount: number): number | null {
  return table.find((r) => r.year === year && r.gamesCount === gamesCount)?.feeCents ?? null
}

export function courtCostCents(courtFeePerGameCents: number, gamesCount: number): number {
  return courtFeePerGameCents * gamesCount
}

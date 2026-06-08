export function sumCents(entries: { amountCents: number }[]): number {
  return entries.reduce((s, e) => s + e.amountCents, 0)
}

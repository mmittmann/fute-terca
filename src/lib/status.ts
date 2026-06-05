export interface PlayerRef {
  id: number
  name: string
}

export interface EntryRef {
  playerId: number | null
  type: string
  amountCents: number
}

export interface MonthStatus {
  paid: PlayerRef[]
  pending: PlayerRef[]
}

export function computeMonthStatus(activePlayers: PlayerRef[], monthEntries: EntryRef[]): MonthStatus {
  const paidIds = new Set(
    monthEntries.filter((e) => e.type === 'mensal' && e.playerId !== null).map((e) => e.playerId),
  )
  return {
    paid: activePlayers.filter((p) => paidIds.has(p.id)),
    pending: activePlayers.filter((p) => !paidIds.has(p.id)),
  }
}

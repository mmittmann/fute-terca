import { describe, expect, it } from 'vitest'
import { computeMonthStatus } from './status'

const active = [
  { id: 1, name: 'Roger' },
  { id: 2, name: 'Tales' },
  { id: 3, name: 'Tio Valdo' },
]

describe('computeMonthStatus', () => {
  it('separa quem tem entry mensal de quem não tem', () => {
    const entries = [
      { playerId: 1, type: 'mensal', amountCents: 7500 },
      { playerId: 2, type: 'avulso', amountCents: 2500 }, // avulso não conta como mensalidade
      { playerId: null, type: 'quadra', amountCents: -96000 },
    ]
    const s = computeMonthStatus(active, entries)
    expect(s.paid.map((p) => p.name)).toEqual(['Roger'])
    expect(s.pending.map((p) => p.name)).toEqual(['Tales', 'Tio Valdo'])
  })
  it('mês sem lançamentos: todos pendentes', () => {
    const s = computeMonthStatus(active, [])
    expect(s.paid).toEqual([])
    expect(s.pending).toHaveLength(3)
  })
})

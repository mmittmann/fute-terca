import { describe, expect, it } from 'vitest'
import { sumCents, monthCollection } from './balance'

describe('sumCents', () => {
  it('soma receitas e despesas', () => {
    expect(sumCents([{ amountCents: 7500 }, { amountCents: -96000 }, { amountCents: 2500 }])).toBe(-86000)
    expect(sumCents([])).toBe(0)
  })
})

describe('monthCollection', () => {
  it('arrecadado = mensal + avulso; esperado = ativos x mensalidade', () => {
    const entries = [
      { playerId: 1, type: 'mensal', amountCents: 7500 },
      { playerId: 2, type: 'avulso', amountCents: 2500 },
      { playerId: null, type: 'quadra', amountCents: -96000 },
    ]
    const r = monthCollection(14, 7500, entries)
    expect(r.collectedCents).toBe(10000)
    expect(r.expectedCents).toBe(105000)
  })
})

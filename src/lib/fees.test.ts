import { describe, expect, it } from 'vitest'
import { monthlyFeeCents, courtCostCents } from './fees'

const table = [
  { year: 2026, gamesCount: 4, feeCents: 7500 },
  { year: 2026, gamesCount: 5, feeCents: 8500 },
  { year: 2025, gamesCount: 4, feeCents: 7500 },
]

describe('monthlyFeeCents', () => {
  it('encontra a mensalidade do ano + nº de jogos', () => {
    expect(monthlyFeeCents(table, 2026, 4)).toBe(7500)
    expect(monthlyFeeCents(table, 2026, 5)).toBe(8500)
  })
  it('retorna null quando não há regra cadastrada', () => {
    expect(monthlyFeeCents(table, 2026, 3)).toBeNull()
    expect(monthlyFeeCents(table, 2030, 4)).toBeNull()
  })
})

describe('courtCostCents', () => {
  it('multiplica preço por jogo pelos jogos do mês', () => {
    expect(courtCostCents(24000, 4)).toBe(96000)
    expect(courtCostCents(24000, 3)).toBe(72000)
  })
})

import { describe, expect, it } from 'vitest'
import { buildMonthlySeries, buildYearTotals } from './series'

const entries = [
  { year: 2025, month: 1, amountCents: 10000 },
  { year: 2025, month: 1, amountCents: -4000 },
  { year: 2025, month: 2, amountCents: 5000 },
  { year: 2026, month: 1, amountCents: 2000 },
]

describe('buildMonthlySeries', () => {
  it('agrega receita/despesa por mês e acumula saldo', () => {
    const s = buildMonthlySeries(entries)
    expect(s).toEqual([
      { key: '2025-01', label: '01/25', receitaCents: 10000, despesaCents: -4000, saldoAcumuladoCents: 6000 },
      { key: '2025-02', label: '02/25', receitaCents: 5000, despesaCents: 0, saldoAcumuladoCents: 11000 },
      { key: '2026-01', label: '01/26', receitaCents: 2000, despesaCents: 0, saldoAcumuladoCents: 13000 },
    ])
  })
})

describe('buildYearTotals', () => {
  it('totaliza por ano', () => {
    expect(buildYearTotals(entries)).toEqual([
      { year: 2025, receitaCents: 15000, despesaCents: -4000 },
      { year: 2026, receitaCents: 2000, despesaCents: 0 },
    ])
  })
})

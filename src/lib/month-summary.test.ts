import { describe, expect, it } from 'vitest'
import { monthSummary } from './month-summary'

describe('monthSummary', () => {
  it('começa zerado quando não há lançamentos', () => {
    expect(monthSummary([])).toEqual({ saldoCents: 0, entradasCents: 0, saidasCents: 0, pagamentos: 0 })
  })

  it('quadra entra negativo, pagamentos somam e contam', () => {
    const r = monthSummary([
      { amountCents: -96000 }, // quadra
      { amountCents: 7500 },   // mensal
      { amountCents: 2500 },   // avulso
    ])
    expect(r.saldoCents).toBe(-86000)
    expect(r.entradasCents).toBe(10000)
    expect(r.saidasCents).toBe(-96000)
    expect(r.pagamentos).toBe(2)
  })

  it('só despesas: nenhum pagamento contado', () => {
    const r = monthSummary([{ amountCents: -96000 }, { amountCents: -4500 }])
    expect(r.pagamentos).toBe(0)
    expect(r.saldoCents).toBe(-100500)
  })
})

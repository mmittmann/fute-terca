import { describe, expect, it } from 'vitest'
import { sumCents } from './balance'

describe('sumCents', () => {
  it('soma receitas e despesas', () => {
    expect(sumCents([{ amountCents: 7500 }, { amountCents: -96000 }, { amountCents: 2500 }])).toBe(-86000)
    expect(sumCents([])).toBe(0)
  })
})

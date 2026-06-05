import { describe, expect, it } from 'vitest'
import { currentYearMonth, monthLabel } from './dates'

describe('monthLabel', () => {
  it('formata mês/ano em pt-BR', () => {
    expect(monthLabel(2026, 6)).toBe('junho/2026')
    expect(monthLabel(2025, 1)).toBe('janeiro/2025')
  })
})

describe('currentYearMonth', () => {
  it('currentYearMonth retorna ano e mês válidos', () => {
    const { year, month } = currentYearMonth()
    expect(year).toBeGreaterThanOrEqual(2026)
    expect(month).toBeGreaterThanOrEqual(1)
    expect(month).toBeLessThanOrEqual(12)
  })
})

import { describe, expect, it } from 'vitest'
import { monthLabel } from './dates'

describe('monthLabel', () => {
  it('formata mês/ano em pt-BR', () => {
    expect(monthLabel(2026, 6)).toBe('junho/2026')
    expect(monthLabel(2025, 1)).toBe('janeiro/2025')
  })
})

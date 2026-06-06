import { describe, expect, it } from 'vitest'
import { formatBRL, parseToCents } from './money'

describe('formatBRL', () => {
  it('formata centavos como reais', () => {
    expect(formatBRL(7500)).toBe('R$ 75,00')
    expect(formatBRL(124000)).toBe('R$ 1.240,00')
    expect(formatBRL(-96000)).toBe('- R$ 960,00')
    expect(formatBRL(6236)).toBe('R$ 62,36')
  })
})

describe('parseToCents', () => {
  it('aceita formatos comuns de input', () => {
    expect(parseToCents('75')).toBe(7500)
    expect(parseToCents('75,00')).toBe(7500)
    expect(parseToCents('R$ 1.234,56')).toBe(123456)
    expect(parseToCents('-960')).toBe(-96000)
  })
  it('retorna null para inválido', () => {
    expect(parseToCents('abc')).toBeNull()
    expect(parseToCents('')).toBeNull()
  })
})

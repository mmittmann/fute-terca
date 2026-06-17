import { describe, expect, it } from 'vitest'
import { categoryAfterSignChange, signError, signForType } from './entry-sign'

describe('signError', () => {
  it('mensal e avulso devem ser positivos (recebimento)', () => {
    expect(signError('mensal', -3000)).toMatch(/positivo/i)
    expect(signError('avulso', -2500)).toMatch(/positivo/i)
    expect(signError('mensal', 8000)).toBeNull()
    expect(signError('avulso', 2500)).toBeNull()
  })

  it('quadra e goleiro devem ser negativos (despesa)', () => {
    expect(signError('quadra', 96000)).toMatch(/negativo/i)
    expect(signError('goleiro', 3000)).toMatch(/negativo/i)
    expect(signError('quadra', -96000)).toBeNull()
    expect(signError('goleiro', -3000)).toBeNull()
  })

  it('tipos livres (evento, camisa, outro) aceitam qualquer sinal', () => {
    expect(signError('evento', -6000)).toBeNull()
    expect(signError('camisa', 12000)).toBeNull()
    expect(signError('outro', -5000)).toBeNull()
  })
})

describe('signForType', () => {
  it('mensal e avulso são receita', () => {
    expect(signForType('mensal')).toBe('receita')
    expect(signForType('avulso')).toBe('receita')
  })
  it('quadra e goleiro são despesa', () => {
    expect(signForType('quadra')).toBe('despesa')
    expect(signForType('goleiro')).toBe('despesa')
  })
  it('evento, camisa e outro aceitam qualquer sinal (null)', () => {
    expect(signForType('evento')).toBeNull()
    expect(signForType('camisa')).toBeNull()
    expect(signForType('outro')).toBeNull()
  })
})

describe('categoryAfterSignChange', () => {
  it('vira para outro quando o novo sinal é incompatível com a categoria', () => {
    expect(categoryAfterSignChange('mensal', 'despesa')).toBe('outro')
    expect(categoryAfterSignChange('quadra', 'receita')).toBe('outro')
  })
  it('mantém a categoria quando o sinal é compatível', () => {
    expect(categoryAfterSignChange('mensal', 'receita')).toBe('mensal')
    expect(categoryAfterSignChange('quadra', 'despesa')).toBe('quadra')
  })
  it('mantém categorias flexíveis em qualquer sinal', () => {
    expect(categoryAfterSignChange('evento', 'despesa')).toBe('evento')
    expect(categoryAfterSignChange('outro', 'receita')).toBe('outro')
  })
})

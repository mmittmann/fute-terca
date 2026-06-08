import { describe, expect, it } from 'vitest'
import { signError } from './entry-sign'

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

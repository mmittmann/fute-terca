import { describe, expect, it } from 'vitest'
import { guessEntryType } from './guess-type'

const cfg = {
  monthlyFeeCents: [7500, 8500], // 4 e 5 jogos em 2026
  avulsoFeeCents: 2500,
  courtFeePerGameCents: 24000,
  goalkeeperFeePerGameCents: 4500,
}

describe('guessEntryType', () => {
  it('valor exato de mensalidade → mensal', () => {
    expect(guessEntryType(7500, cfg)).toBe('mensal')
    expect(guessEntryType(8500, cfg)).toBe('mensal')
  })

  it('valor exato de avulso → avulso', () => {
    expect(guessEntryType(2500, cfg)).toBe('avulso')
  })

  it('múltiplo do preço da quadra → quadra', () => {
    expect(guessEntryType(-96000, cfg)).toBe('quadra') // 4 jogos
    expect(guessEntryType(-72000, cfg)).toBe('quadra') // 3 jogos
    expect(guessEntryType(-48000, cfg)).toBe('quadra') // 2 jogos
  })

  it('despesa pequena → goleiro', () => {
    expect(guessEntryType(-4500, cfg)).toBe('goleiro')
    expect(guessEntryType(-3000, cfg)).toBe('goleiro') // goleiro por fora (-30)
    expect(guessEntryType(-3800, cfg)).toBe('goleiro')
  })

  it('positivo desconhecido: heurística por faixa (avulso baixo, mensal alto)', () => {
    expect(guessEntryType(2000, cfg)).toBe('avulso') // avulso antigo (20)
    expect(guessEntryType(6000, cfg)).toBe('mensal') // mensalidade antiga (60)
  })

  it('despesa grande fora de padrão → outro', () => {
    expect(guessEntryType(-262700, cfg)).toBe('outro') // compra de camisas
  })

  it('zero ou sem config de preço não quebra', () => {
    expect(guessEntryType(0, cfg)).toBeNull()
    expect(guessEntryType(-96000, { ...cfg, courtFeePerGameCents: 0 })).toBe('outro')
  })
})

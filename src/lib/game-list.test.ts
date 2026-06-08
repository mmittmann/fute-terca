import { describe, expect, it } from 'vitest'
import { buildGameListMessage } from './game-list'

const base = {
  dateLabel: '02/06',
  mensalFeeCents: 8000,
  avulsoFeeCents: 2500,
  pixKey: '02758901048',
  paidMensalNames: ['Murilo', 'Sartor', 'Roger'],
}

describe('buildGameListMessage', () => {
  it('monta o cabeçalho com valores e pix', () => {
    const m = buildGameListMessage(base)
    expect(m.startsWith('Joguinho - 02/06')).toBe(true)
    expect(m).toContain('Mensalistas ✅ R$80')
    expect(m).toContain('Avulsos ⚽️ R$25')
    expect(m).toContain('Pix 02758901048')
  })

  it('preenche os mensalistas pagos com ✅ e deixa o resto vazio', () => {
    const m = buildGameListMessage(base)
    expect(m).toContain('1 - Murilo ✅')
    expect(m).toContain('2 - Sartor ✅')
    expect(m).toContain('3 - Roger ✅')
    expect(m).toContain('\n4 - \n') // slot vazio
    expect(m).toContain('\n14 - ') // 14 slots por padrão
  })

  it('tem 2 vagas de goleiro vazias e a seção Fora', () => {
    const m = buildGameListMessage(base)
    expect(m).toContain('Goleiros\n1 - \n2 - \n')
    expect(m).toMatch(/Fora:\s*\n-/)
  })

  it('expande as vagas se houver mais pagos que o padrão', () => {
    const names = Array.from({ length: 15 }, (_, i) => `J${i + 1}`)
    const m = buildGameListMessage({ ...base, paidMensalNames: names })
    expect(m).toContain('15 - J15 ✅')
  })

  it('formata valor com centavos e trata fee ausente', () => {
    expect(buildGameListMessage({ ...base, mensalFeeCents: 7550 })).toContain('R$75,50')
    expect(buildGameListMessage({ ...base, avulsoFeeCents: null })).toContain('Avulsos ⚽️ R$—')
  })
})

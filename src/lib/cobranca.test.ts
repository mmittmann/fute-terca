import { describe, expect, it } from 'vitest'
import { buildCobrancaMessage } from './cobranca'

describe('buildCobrancaMessage', () => {
  it('lista pendentes com valor e pix', () => {
    const msg = buildCobrancaMessage({
      monthLabel: 'junho/2026',
      feeCents: 7500,
      pendingNames: ['Tales', 'Tio Valdo', 'Erick'],
      pixKey: 'murilo@umbler.com',
    })
    expect(msg).toContain('junho/2026')
    expect(msg).toContain('R$ 75,00')
    expect(msg).toContain('Tales, Tio Valdo, Erick')
    expect(msg).toContain('PIX: murilo@umbler.com')
  })
  it('sem pendentes: mensagem de tudo em dia', () => {
    const msg = buildCobrancaMessage({
      monthLabel: 'junho/2026', feeCents: 7500, pendingNames: [], pixKey: 'x',
    })
    expect(msg).toContain('em dia')
  })
})

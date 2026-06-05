import { beforeAll, describe, expect, it } from 'vitest'
import { createSessionToken, verifySessionToken } from './session'

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret'
})

describe('session token', () => {
  it('cria e verifica token válido', () => {
    const t = createSessionToken()
    expect(verifySessionToken(t)).toBe(true)
  })
  it('rejeita token expirado', () => {
    const past = Date.now() - 1000 * 60 * 60 * 24 * 31
    const t = createSessionToken(past)
    expect(verifySessionToken(t)).toBe(false)
  })
  it('rejeita assinatura adulterada e lixo', () => {
    const t = createSessionToken()
    expect(verifySessionToken(t.slice(0, -2) + 'ff')).toBe(false)
    expect(verifySessionToken('garbage')).toBe(false)
    expect(verifySessionToken(undefined)).toBe(false)
  })
  it('lança erro se AUTH_SECRET ausente', () => {
    const saved = process.env.AUTH_SECRET
    delete process.env.AUTH_SECRET
    expect(() => createSessionToken()).toThrow('AUTH_SECRET')
    process.env.AUTH_SECRET = saved
  })
})

import { describe, expect, it } from 'vitest'
import { buildAliasMap, resolveName } from './normalize'

const players = [
  { name: 'Samuka', aliases: ['Samuca'] },
  { name: 'Tio Valdo', aliases: ['Tio Waldo'] },
  { name: 'Brandão', aliases: ['Brandao'] },
]

describe('resolveName', () => {
  it('resolve nome canônico, alias, caixa e espaços', () => {
    const map = buildAliasMap(players)
    expect(resolveName('Samuka', map)).toBe('Samuka')
    expect(resolveName('samuca', map)).toBe('Samuka')
    expect(resolveName('  Tio Waldo ', map)).toBe('Tio Valdo')
    expect(resolveName('brandao', map)).toBe('Brandão')
  })
  it('retorna null para desconhecido', () => {
    const map = buildAliasMap(players)
    expect(resolveName('Fulano', map)).toBeNull()
  })
})

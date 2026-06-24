import { describe, expect, it } from 'vitest'
import { buildAliasMap } from './normalize'
import { reconcilePayments, scopePaidForGame, type PaidEntry } from './reconcile'

const aliasMap = buildAliasMap([
  { name: 'Murilo', aliases: [] },
  { name: 'Tales', aliases: ['Thalles'] },
  { name: 'Samuka', aliases: ['Samuca'] },
  { name: 'Beltrano', aliases: [] },
])

const paid = new Map<string, 'mensal' | 'avulso'>([
  ['Murilo', 'mensal'],
  ['Tales', 'avulso'],
])

describe('reconcilePayments', () => {
  it('aponta quem jogou e não pagou (cobrar)', () => {
    const r = reconcilePayments(['Murilo', 'Tales', 'Beltrano'], paid, aliasMap)
    expect(r.cobrar).toEqual([{ name: 'Beltrano', cadastrado: true }])
  })

  it('lista quem pagou e jogou com o tipo', () => {
    const r = reconcilePayments(['Murilo', 'Thalles'], paid, aliasMap)
    expect(r.pagaramEjogaram).toEqual([
      { name: 'Murilo', tipo: 'mensal' },
      { name: 'Tales', tipo: 'avulso' },
    ])
  })

  it('nome desconhecido (fora do cadastro) entra como cobrar não-cadastrado', () => {
    const r = reconcilePayments(['ZéNovato'], paid, aliasMap)
    expect(r.cobrar).toEqual([{ name: 'ZéNovato', cadastrado: false }])
  })

  it('quem pagou e não apareceu na lista vai para pagaramNaoJogaram', () => {
    const r = reconcilePayments(['Murilo'], paid, aliasMap)
    expect(r.pagaramNaoJogaram).toEqual(['Tales'])
  })

  it('resolve apelido e não duplica nome repetido', () => {
    const r = reconcilePayments(['Samuca', 'Samuka'], paid, aliasMap)
    expect(r.cobrar).toEqual([{ name: 'Samuka', cadastrado: true }])
  })
})

describe('scopePaidForGame', () => {
  const entries: PaidEntry[] = [
    { name: 'Murilo', tipo: 'mensal', gameDate: null }, // mensal cobre o mês todo
    { name: 'Tales', tipo: 'avulso', gameDate: '2026-06-23' }, // avulso do jogo 23
    { name: 'Beltrano', tipo: 'avulso', gameDate: '2026-06-16' }, // avulso de outro jogo
  ]

  it('mensalista conta independente da terça', () => {
    const paid = scopePaidForGame(entries, '2026-06-23')
    expect(paid.get('Murilo')).toBe('mensal')
  })

  it('avulso só conta na terça do seu lançamento', () => {
    const paid = scopePaidForGame(entries, '2026-06-23')
    expect(paid.get('Tales')).toBe('avulso')
    expect(paid.has('Beltrano')).toBe(false) // pagou outro jogo (16/06)
  })

  it('avulso de outra terça entra ao selecionar a terça dele', () => {
    const paid = scopePaidForGame(entries, '2026-06-16')
    expect(paid.get('Beltrano')).toBe('avulso')
    expect(paid.has('Tales')).toBe(false)
    expect(paid.get('Murilo')).toBe('mensal') // mensal segue valendo
  })

  it('mensal prevalece quando o mesmo nome tem mensal e avulso', () => {
    const dupes: PaidEntry[] = [
      { name: 'Murilo', tipo: 'avulso', gameDate: '2026-06-23' },
      { name: 'Murilo', tipo: 'mensal', gameDate: null },
    ]
    expect(scopePaidForGame(dupes, '2026-06-23').get('Murilo')).toBe('mensal')
  })
})

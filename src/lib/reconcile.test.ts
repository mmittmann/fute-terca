import { describe, expect, it } from 'vitest'
import { buildAliasMap } from './normalize'
import { reconcilePayments } from './reconcile'

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

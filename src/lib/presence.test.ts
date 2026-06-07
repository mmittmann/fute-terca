import { describe, expect, it } from 'vitest'
import { buildMonthPresence } from './presence'

const tuesdays = [2, 9, 16, 23, 30]

describe('buildMonthPresence', () => {
  it('mensalistas aparecem em todas as terças', () => {
    const r = buildMonthPresence(tuesdays, ['Roger', 'Murilo'], [])
    expect(r.perTuesday).toHaveLength(5)
    for (const t of r.perTuesday) {
      expect(t.mensalistas).toEqual(['Roger', 'Murilo'])
      expect(t.avulsos).toEqual([])
    }
  })

  it('avulso entra na terça mais recente anterior ou igual ao dia do lançamento', () => {
    const r = buildMonthPresence(tuesdays, [], [
      { name: 'Binho', day: 9 },   // pagou na própria terça
      { name: 'Moha', day: 12 },   // pagou na sexta → terça dia 9
      { name: 'Bita', day: 30 },
    ])
    expect(r.perTuesday.find((t) => t.day === 9)?.avulsos).toEqual(['Binho', 'Moha'])
    expect(r.perTuesday.find((t) => t.day === 30)?.avulsos).toEqual(['Bita'])
  })

  it('avulso antes da primeira terça vai para a primeira terça', () => {
    const r = buildMonthPresence(tuesdays, [], [{ name: 'Breno', day: 1 }])
    expect(r.perTuesday.find((t) => t.day === 2)?.avulsos).toEqual(['Breno'])
  })

  it('avulso sem dia identificável fica em "sem data"', () => {
    const r = buildMonthPresence(tuesdays, [], [{ name: 'Carlos', day: null }])
    expect(r.undated).toEqual(['Carlos'])
    expect(r.perTuesday.every((t) => t.avulsos.length === 0)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { defaultGameValue, tuesdayOptions } from './game-options'

describe('tuesdayOptions', () => {
  it('lista as terças de junho/2026 como value YYYY-MM-DD e label dd/mm', () => {
    const opts = tuesdayOptions(2026, 6)
    expect(opts.map((o) => o.value)).toEqual([
      '2026-06-02', '2026-06-09', '2026-06-16', '2026-06-23', '2026-06-30',
    ])
    expect(opts[0].label).toBe('02/06')
  })
})

describe('defaultGameValue', () => {
  it('escolhe a próxima terça >= hoje quando é o mês atual', () => {
    expect(defaultGameValue(2026, 6, 17)).toBe('2026-06-23')
  })
  it('cai na última terça se hoje já passou da última', () => {
    expect(defaultGameValue(2026, 6, 28)).toBe('2026-06-30')
  })
  it('usa a última terça quando não é o mês atual (todayDay null)', () => {
    expect(defaultGameValue(2026, 6, null)).toBe('2026-06-30')
  })
})

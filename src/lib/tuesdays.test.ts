import { describe, expect, it } from 'vitest'
import { tuesdaysInMonth } from './tuesdays'

describe('tuesdaysInMonth', () => {
  it('junho/2026 tem 5 terças', () => {
    expect(tuesdaysInMonth(2026, 6)).toEqual([2, 9, 16, 23, 30])
  })
  it('fevereiro/2026 tem 4 terças', () => {
    expect(tuesdaysInMonth(2026, 2)).toEqual([3, 10, 17, 24])
  })
  it('dezembro/2026 começa numa terça', () => {
    expect(tuesdaysInMonth(2026, 12)).toEqual([1, 8, 15, 22, 29])
  })
})

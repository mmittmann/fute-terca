import { describe, expect, it } from 'vitest'
import { parsePlayedList } from './parse-played'

const lista = `Joguinho - 09/06

Mensalistas ✅ R$85
Avulsos ⚽️ R$25
Pix 02758901048

Goleiros
1 - Roberto
2 -

Jogadores
1 - Murilo ✅
2 - Tio Valdo ✅
3 - Beltrano
4 - Ciclano ⚽️
5 -
6 -

Fora:
- Sicrano`

describe('parsePlayedList', () => {
  it('separa goleiros, jogadores e fora, limpando numeração e emojis', () => {
    const r = parsePlayedList(lista)
    expect(r.goalkeepers).toEqual(['Roberto'])
    expect(r.players).toEqual(['Murilo', 'Tio Valdo', 'Beltrano', 'Ciclano'])
    expect(r.out).toEqual(['Sicrano'])
  })

  it('ignora cabeçalho, legenda, pix e vagas vazias', () => {
    const r = parsePlayedList(lista)
    expect(r.players).not.toContain('R$85')
    expect(r.players.join(' ')).not.toMatch(/Pix|Mensalistas|Avulsos|Joguinho/)
  })

  it('lista simples de nomes (sem seções) vira jogadores', () => {
    const r = parsePlayedList('Murilo\nTales\nGui')
    expect(r.players).toEqual(['Murilo', 'Tales', 'Gui'])
    expect(r.out).toEqual([])
  })

  it('remove emojis fora da faixa antiga (⭐ ™ ⏰ 🇧🇷)', () => {
    const r = parsePlayedList('Murilo ⭐\nTales ™\nGui ⏰\nSamuka \u{1F1E7}\u{1F1F7}')
    expect(r.players).toEqual(['Murilo', 'Tales', 'Gui', 'Samuka'])
  })
})

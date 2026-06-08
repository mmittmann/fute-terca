/**
 * Adivinha o tipo do lançamento a partir do valor (o "dicionário de valores"
 * da planilha, em versão viva: usa os preços configurados do ano, então
 * acompanha o reajuste anual). É apenas um palpite — o admin pode trocar o chip.
 */

export type GuessableType = 'mensal' | 'avulso' | 'quadra' | 'goleiro' | 'outro'

export interface GuessConfig {
  monthlyFeeCents: number[]
  avulsoFeeCents: number
  courtFeePerGameCents: number
  goalkeeperFeePerGameCents: number
}

export function guessEntryType(amountCents: number, cfg: GuessConfig): GuessableType | null {
  if (amountCents === 0) return null

  if (amountCents > 0) {
    if (cfg.monthlyFeeCents.includes(amountCents)) return 'mensal'
    if (amountCents === cfg.avulsoFeeCents) return 'avulso'
    // heurística: até ~1,5× o avulso é avulso; acima é mensalidade
    const boundary = cfg.avulsoFeeCents > 0 ? cfg.avulsoFeeCents * 1.5 : 4000
    return amountCents <= boundary ? 'avulso' : 'mensal'
  }

  const abs = -amountCents

  // múltiplo exato do preço da quadra (1 a 6 jogos) → quadra
  if (cfg.courtFeePerGameCents > 0) {
    const games = abs / cfg.courtFeePerGameCents
    if (Number.isInteger(games) && games >= 1 && games <= 6) return 'quadra'
  }

  // despesa pequena na faixa do goleiro → goleiro
  if (cfg.goalkeeperFeePerGameCents > 0 && abs <= cfg.goalkeeperFeePerGameCents * 2) return 'goleiro'

  return 'outro'
}

/**
 * Coerência entre tipo e sinal do valor:
 * - mensal e avulso são recebimentos (valor positivo);
 * - quadra e goleiro são despesas (valor negativo);
 * - evento, camisa e outro aceitam qualquer sinal.
 * Retorna a mensagem de erro, ou null se estiver ok.
 */
export function signError(type: string, amountCents: number): string | null {
  if ((type === 'mensal' || type === 'avulso') && amountCents < 0) {
    return 'Mensal e avulso são recebimentos — use valor positivo.'
  }
  if ((type === 'quadra' || type === 'goleiro') && amountCents > 0) {
    return 'Quadra e goleiro são despesas — use valor negativo.'
  }
  return null
}

export type Sign = 'despesa' | 'receita'

/** Sinal obrigatório de uma categoria, ou null se aceita qualquer sinal. */
export function signForType(type: string): Sign | null {
  if (type === 'mensal' || type === 'avulso') return 'receita'
  if (type === 'quadra' || type === 'goleiro') return 'despesa'
  return null
}

/** Ao virar o toggle: mantém a categoria se compatível; senão cai em 'outro'. */
export function categoryAfterSignChange(type: string, sign: Sign): string {
  const req = signForType(type)
  return req && req !== sign ? 'outro' : type
}

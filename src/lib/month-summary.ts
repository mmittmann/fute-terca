/**
 * Resumo financeiro do mês. Cada mês começa do zero: o saldo é apenas a soma
 * dos lançamentos daquele mês (quadra negativa, pagamentos positivos).
 */
export interface MonthSummary {
  saldoCents: number
  entradasCents: number
  saidasCents: number // negativo
  pagamentos: number // quantidade de lançamentos positivos
}

export function monthSummary(entries: { amountCents: number }[]): MonthSummary {
  let entradasCents = 0
  let saidasCents = 0
  let pagamentos = 0
  for (const e of entries) {
    if (e.amountCents > 0) {
      entradasCents += e.amountCents
      pagamentos += 1
    } else {
      saidasCents += e.amountCents
    }
  }
  return { saldoCents: entradasCents + saidasCents, entradasCents, saidasCents, pagamentos }
}

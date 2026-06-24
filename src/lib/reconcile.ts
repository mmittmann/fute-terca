import { resolveName } from './normalize'

/**
 * Cruza quem jogou (lista colada) com quem pagou no mês (mensal/avulso).
 * Nomes são resolvidos pelo cadastro + apelidos; nomes sem correspondência
 * entram como "cobrar não-cadastrado".
 */
export interface ReconcileResult {
  cobrar: { name: string; cadastrado: boolean }[] // jogou e não pagou
  pagaramEjogaram: { name: string; tipo: 'mensal' | 'avulso' }[]
  pagaramNaoJogaram: string[]
}

export interface PaidEntry {
  name: string
  tipo: 'mensal' | 'avulso'
  gameDate: string | null // 'YYYY-MM-DD' do jogo, ou null (sem jogo específico)
}

/**
 * Monta o conjunto de quem "pagou este jogo" para a terça selecionada:
 * - mensal: vale o mês todo, então todo mensalista pago conta;
 * - avulso: só conta se o lançamento for da terça selecionada (`gameDate`).
 * Quando o mesmo nome tem mensal e avulso, mensal prevalece.
 */
export function scopePaidForGame(
  entries: PaidEntry[],
  selectedGameDate: string,
): Map<string, 'mensal' | 'avulso'> {
  const paid = new Map<string, 'mensal' | 'avulso'>()
  for (const e of entries) {
    if (e.tipo === 'avulso' && e.gameDate !== selectedGameDate) continue
    if (paid.get(e.name) === 'mensal') continue
    paid.set(e.name, e.tipo)
  }
  return paid
}

export function reconcilePayments(
  played: string[],
  paidByCanonical: Map<string, 'mensal' | 'avulso'>,
  aliasMap: Map<string, string>,
): ReconcileResult {
  const cobrar: ReconcileResult['cobrar'] = []
  const pagaramEjogaram: ReconcileResult['pagaramEjogaram'] = []
  const playedCanonical = new Set<string>()
  const seen = new Set<string>()

  for (const raw of played) {
    const canonical = resolveName(raw, aliasMap)
    const key = canonical ?? `?${raw.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    if (canonical) playedCanonical.add(canonical)

    const tipo = canonical ? paidByCanonical.get(canonical) : undefined
    if (tipo) {
      pagaramEjogaram.push({ name: canonical!, tipo })
    } else {
      cobrar.push({ name: canonical ?? raw, cadastrado: canonical !== null })
    }
  }

  const pagaramNaoJogaram = [...paidByCanonical.keys()]
    .filter((name) => !playedCanonical.has(name))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return { cobrar, pagaramEjogaram, pagaramNaoJogaram }
}

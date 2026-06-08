/**
 * Monta a "lista do jogo" que o Murilo posta todo domingo no WhatsApp.
 * Os mensalistas que já pagaram no mês entram nas primeiras vagas com ✅;
 * o resto fica em branco para os avulsos se inscreverem durante a semana.
 */
export interface GameListOpts {
  dateLabel: string // 'DD/MM' da próxima terça
  mensalFeeCents: number | null
  avulsoFeeCents: number | null
  pixKey: string
  paidMensalNames: string[]
  goalkeeperSlots?: number // padrão 2
  playerSlots?: number // padrão 14
}

function money(cents: number | null): string {
  if (cents === null) return 'R$—'
  const reais = cents / 100
  return Number.isInteger(reais) ? `R$${reais}` : `R$${reais.toFixed(2).replace('.', ',')}`
}

export function buildGameListMessage(o: GameListOpts): string {
  const goalkeepers = o.goalkeeperSlots ?? 2
  const slots = Math.max(o.playerSlots ?? 14, o.paidMensalNames.length)
  const lines: string[] = []

  lines.push(`Joguinho - ${o.dateLabel}`)
  lines.push('')
  lines.push(`Mensalistas ✅ ${money(o.mensalFeeCents)}`)
  lines.push(`Avulsos ⚽️ ${money(o.avulsoFeeCents)}`)
  lines.push(`Pix ${o.pixKey}`)
  lines.push('')
  lines.push('Goleiros')
  for (let i = 1; i <= goalkeepers; i++) lines.push(`${i} - `)
  lines.push('')
  lines.push('Jogadores')
  for (let i = 1; i <= slots; i++) {
    const name = o.paidMensalNames[i - 1]
    lines.push(`${i} - ${name ? `${name} ✅` : ''}`)
  }
  lines.push('')
  lines.push('Fora: ')
  lines.push('- ')

  return lines.join('\n')
}

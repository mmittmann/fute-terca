import { formatBRL } from './money'

export interface CobrancaOpts {
  monthLabel: string
  feeCents: number
  pendingNames: string[]
  pixKey: string
}

export function buildCobrancaMessage({ monthLabel, feeCents, pendingNames, pixKey }: CobrancaOpts): string {
  if (pendingNames.length === 0) {
    return `✅ Mensalidade de ${monthLabel}: todo mundo em dia. Bom jogo! ⚽`
  }
  return [
    `⚽ Fala pessoal! Mensalidade de ${monthLabel} (${formatBRL(feeCents)}).`,
    `Ainda faltam: ${pendingNames.join(', ')}.`,
    `PIX: ${pixKey}`,
  ].join('\n')
}

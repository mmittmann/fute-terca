/**
 * Lê a lista do jogo colada do WhatsApp e separa em goleiros, jogadores e
 * "fora". Tolera numeração (1 -, 2., 3)), bullets, emojis (✅ ⚽️) e ignora
 * cabeçalho/legenda/pix e vagas vazias.
 */
export interface ParsedList {
  goalkeepers: string[]
  players: string[]
  out: string[]
}

// Remove pictográficos, bandeiras, keycaps, ZWJ, variation selector
// e enclosing keycap — sem tocar em dígitos/letras (a numeração "1 -"
// é tratada à parte).
const EMOJI = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u200D\uFE0F\u20E3]/gu

function clean(line: string): string {
  return line
    .replace(/^\s*\d+\s*[-.)]\s*/, '') // "1 - ", "2. ", "3) "
    .replace(/^\s*[-•*]\s*/, '') // bullet
    .replace(EMOJI, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

type Section = 'goalkeepers' | 'players' | 'out'

const SKIP_PREFIXES = ['joguinho', 'mensalista', 'avulso', 'pix']

export function parsePlayedList(text: string): ParsedList {
  const result: ParsedList = { goalkeepers: [], players: [], out: [] }
  let section: Section = 'players'

  for (const raw of text.split(/\r?\n/)) {
    const name = clean(raw)
    if (!name) continue
    const n = norm(name)

    if (n.startsWith('goleiro')) { section = 'goalkeepers'; continue }
    if (n.startsWith('jogador')) { section = 'players'; continue }
    if (n.startsWith('fora')) { section = 'out'; continue }
    if (SKIP_PREFIXES.some((p) => n.startsWith(p))) continue

    result[section].push(name)
  }

  return result
}

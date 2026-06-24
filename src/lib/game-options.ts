import { tuesdaysInMonth } from './tuesdays'

export interface GameOption {
  value: string // 'YYYY-MM-DD'
  label: string // 'dd/mm'
}

const pad = (n: number): string => String(n).padStart(2, '0')

/** Terças do mês como opções de <select>. */
export function tuesdayOptions(year: number, month: number): GameOption[] {
  return tuesdaysInMonth(year, month).map((day) => ({
    value: `${year}-${pad(month)}-${pad(day)}`,
    label: `${pad(day)}/${pad(month)}`,
  }))
}

/**
 * Default do campo Jogo: a terça mais próxima de hoje no mês exibido.
 * `todayDay` = dia do mês de hoje quando o mês exibido é o atual; senão `null`
 * (mês passado/futuro → última terça). Retorna '' se o mês não tiver terças.
 */
export function defaultGameValue(year: number, month: number, todayDay: number | null): string {
  const opts = tuesdayOptions(year, month)
  if (opts.length === 0) return ''
  if (todayDay === null) return opts[opts.length - 1].value
  const upcoming = opts.find((o) => Number(o.value.slice(-2)) >= todayDay)
  return (upcoming ?? opts[opts.length - 1]).value
}

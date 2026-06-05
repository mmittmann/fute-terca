const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

export function monthLabel(year: number, month: number): string {
  return `${MONTHS_PT[month - 1]}/${year}`
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

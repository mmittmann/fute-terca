export function formatBRL(cents: number): string {
  const sign = cents < 0 ? '- ' : ''
  const abs = Math.abs(cents)
  const reais = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const centavos = (abs % 100).toString().padStart(2, '0')
  return `${sign}R$ ${reais},${centavos}`
}

export function parseToCents(input: string): number | null {
  const cleaned = input.trim().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
  if (cleaned === '' || cleaned === '-') return null
  const n = Number(cleaned)
  if (Number.isNaN(n)) return null
  return Math.round(n * 100)
}

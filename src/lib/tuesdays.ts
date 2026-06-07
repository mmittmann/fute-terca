/** Dias do mês (1-31) que caem numa terça-feira. O jogo da pelada é toda terça. */
export function tuesdaysInMonth(year: number, month: number): number[] {
  const days: number[] = []
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  for (let day = 1; day <= lastDay; day++) {
    if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 2) days.push(day)
  }
  return days
}

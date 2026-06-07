/**
 * Presença derivada dos pagamentos (sem marcação manual):
 * - mensalistas pagantes do mês contam em todas as terças;
 * - avulso conta na terça mais recente <= dia do lançamento (pagamento costuma
 *   vir depois do jogo); antes da primeira terça, vai para a primeira;
 * - avulso sem dia identificável (ex: histórico importado) fica em `undated`.
 */

export interface AvulsoRef {
  name: string
  day: number | null
}

export interface TuesdayPresence {
  day: number
  mensalistas: string[]
  avulsos: string[]
}

export interface MonthPresence {
  perTuesday: TuesdayPresence[]
  undated: string[]
}

export function buildMonthPresence(
  tuesdays: number[],
  mensalistas: string[],
  avulsos: AvulsoRef[],
): MonthPresence {
  const perTuesday: TuesdayPresence[] = tuesdays.map((day) => ({
    day,
    mensalistas: [...mensalistas],
    avulsos: [],
  }))
  const undated: string[] = []

  for (const a of avulsos) {
    if (a.day === null || perTuesday.length === 0) {
      undated.push(a.name)
      continue
    }
    const past = perTuesday.filter((t) => t.day <= a.day!)
    const target = past.length > 0 ? past[past.length - 1] : perTuesday[0]
    target.avulsos.push(a.name)
  }

  return { perTuesday, undated }
}

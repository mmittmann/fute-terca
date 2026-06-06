'use client'

import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatBRL } from '@/lib/money'
import type { MonthPoint, YearTotal } from '@/lib/series'

const toReais = (c: number) => Math.round(c / 100)

export function HistoricoCharts({ series, years }: { series: MonthPoint[]; years: YearTotal[] }) {
  const lineData = series.map((p) => ({ label: p.label, saldo: toReais(p.saldoAcumuladoCents) }))
  const barData = series.map((p) => ({
    label: p.label,
    receita: toReais(p.receitaCents),
    despesa: toReais(Math.abs(p.despesaCents)),
  }))
  const yearData = years.map((y) => ({
    ano: String(y.year),
    receita: toReais(y.receitaCents),
    despesa: toReais(Math.abs(y.despesaCents)),
  }))

  return (
    <div className="flex flex-col gap-5 p-3">
      <Chart title="Evolução do caixa (saldo acumulado)">
        <LineChart data={lineData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" fontSize={10} />
          <YAxis fontSize={10} width={45} />
          <Tooltip formatter={(v) => formatBRL(Number(v) * 100)} />
          <Line type="monotone" dataKey="saldo" stroke="#16a34a" strokeWidth={2} dot={false} />
        </LineChart>
      </Chart>
      <Chart title="Receita × despesa por mês">
        <BarChart data={barData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" fontSize={10} />
          <YAxis fontSize={10} width={45} />
          <Tooltip formatter={(v) => formatBRL(Number(v) * 100)} />
          <Bar dataKey="receita" fill="#16a34a" />
          <Bar dataKey="despesa" fill="#dc2626" />
        </BarChart>
      </Chart>
      <Chart title="Comparativo ano a ano">
        <BarChart data={yearData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ano" fontSize={11} />
          <YAxis fontSize={10} width={45} />
          <Tooltip formatter={(v) => formatBRL(Number(v) * 100)} />
          <Bar dataKey="receita" fill="#16a34a" />
          <Bar dataKey="despesa" fill="#dc2626" />
        </BarChart>
      </Chart>
    </div>
  )
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <h2 className="mb-2 text-sm font-bold">{title}</h2>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </section>
  )
}

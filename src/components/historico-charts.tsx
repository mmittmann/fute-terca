'use client'

import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { formatBRL } from '@/lib/money'
import type { MonthPoint, YearTotal } from '@/lib/series'

const toReais = (c: number) => Math.round(c / 100)

const VOLT = '#c6f542'
const CLAY = '#ff7a66'
const MOSS = '#93b49e'
const GRID = 'rgba(236, 247, 238, 0.07)'
const AXIS = { fill: MOSS, fontSize: 10 }

const tooltipProps = {
  formatter: (v: unknown) => formatBRL(Number(v) * 100),
  contentStyle: {
    background: '#142619',
    border: '1px solid #2a4a33',
    borderRadius: 12,
    color: '#ecf7ee',
    fontSize: 12,
    boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
  },
  labelStyle: { color: MOSS, fontWeight: 700 },
  cursor: { fill: 'rgba(198, 245, 66, 0.06)' },
}

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
    <div className="flex flex-col gap-3 p-3 pt-4">
      <Chart title="Evolução do caixa" rise="rise-1">
        <LineChart data={lineData}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} axisLine={{ stroke: '#2a4a33' }} tickLine={false} />
          <YAxis tick={AXIS} width={42} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipProps} cursor={{ stroke: 'rgba(198,245,66,0.25)' }} />
          <Line
            type="monotone"
            dataKey="saldo"
            stroke={VOLT}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: VOLT, stroke: '#0a140e', strokeWidth: 2 }}
          />
        </LineChart>
      </Chart>
      <Chart title="Receita × despesa por mês" rise="rise-2">
        <BarChart data={barData} barGap={1}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} axisLine={{ stroke: '#2a4a33' }} tickLine={false} />
          <YAxis tick={AXIS} width={42} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipProps} />
          <Bar dataKey="receita" fill={VOLT} radius={[3, 3, 0, 0]} />
          <Bar dataKey="despesa" fill={CLAY} radius={[3, 3, 0, 0]} />
        </BarChart>
      </Chart>
      <Chart title="Comparativo ano a ano" rise="rise-3">
        <BarChart data={yearData} barGap={2}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="ano" tick={{ ...AXIS, fontSize: 11 }} axisLine={{ stroke: '#2a4a33' }} tickLine={false} />
          <YAxis tick={AXIS} width={42} axisLine={false} tickLine={false} />
          <Tooltip {...tooltipProps} />
          <Bar dataKey="receita" fill={VOLT} radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesa" fill={CLAY} radius={[4, 4, 0, 0]} />
        </BarChart>
      </Chart>
    </div>
  )
}

function Chart({ title, rise, children }: { title: string; rise: string; children: React.ReactElement }) {
  return (
    <section className={`card p-4 rise ${rise}`}>
      <h2 className="label mb-3">{title}</h2>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </section>
  )
}

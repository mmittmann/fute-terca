/* Importa o histórico da planilha para o banco.
 * Uso:  npx tsx scripts/import.ts          → dry-run (relatório)
 *       npx tsx scripts/import.ts --write  → grava no banco
 */
import 'dotenv/config'
import * as XLSX from 'xlsx'
import { db } from '../src/db/client'
import { appSettings, entries, events, monthlyFeeTable, months, players, shirts, yearSettings } from '../src/db/schema'
import { buildAliasMap, resolveName } from '../src/lib/normalize'

const WRITE = process.argv.includes('--write')

// ---- Cadastro canônico + aliases (ajustar aqui conforme o relatório apontar) ----
const PLAYER_ALIASES: { name: string; aliases: string[] }[] = [
  { name: 'Samuka', aliases: ['Samuca', 'Samoel'] },
  { name: 'Tio Valdo', aliases: ['Tio Waldo', 'Valdo'] },
  { name: 'Brandão', aliases: ['Brandao'] },
  { name: 'Gui', aliases: ['Guilhere', 'Guilherme'] },
  { name: 'Filipinho', aliases: ['Felipinho', 'FIlipinho'] },
  { name: 'Leandrinho', aliases: ['Lenadrinho'] },
  { name: 'Marcão', aliases: ['Marcao'] },
  { name: 'Tio Zé', aliases: ['Ze', 'Zé', 'Tio Ze'] },
  { name: 'Vini Santiago', aliases: ['Vinicius Santiago', 'Vini'] },
  { name: 'Malcom', aliases: ['Malcon'] },
  { name: 'Roberto (goleiro)', aliases: ['Roberto', 'Roberto (Goleiro)', 'Goleiro Roberto'] },
  { name: 'Vitor', aliases: ['Victor'] },
  { name: 'Tales', aliases: ['Thalles'] },
  { name: 'Leandro Melo', aliases: ['Leandro'] },
  { name: 'Leonardo Melo', aliases: ['Leonardo'] },
  { name: 'Matheuszinho', aliases: ['Matheus', 'Matheus Bittencourt'] },
  { name: 'Marcelo Machado', aliases: ['Marcelo'] },
  { name: 'Deparis', aliases: ['DeParis', 'deparis'] },
  { name: 'Mauricio', aliases: ['Maurício'] },
  // demais nomes entram automaticamente como canônicos na 1ª ocorrência
]

const NON_PLAYER_NAMES = new Set([
  'quadra', 'goleiro', 'goleiro (app)', 'churrasqueira', 'carne', 'pagamentos', 'compra',
  'camisa horário', 'churras', 'cod', 'mensalidade', 'reembolso leandro', 'saldo salchipão', 'tw7',
  'horário',
])

interface RawEntry {
  name: string
  amountCents: number
  year: number
  month: number
  type: 'mensal' | 'avulso' | 'quadra' | 'goleiro' | 'evento' | 'camisa' | 'outro'
  description: string | null
  eventKey?: string
}

function toCents(v: unknown): number | null {
  if (typeof v !== 'number' || Number.isNaN(v)) return null
  return Math.round(v * 100)
}

function parseMes(v: unknown): { year: number; month: number } | null {
  if (typeof v !== 'string') return null
  const m = v.trim().match(/^(\d{1,2})\/(\d{2})$/)
  if (!m) return null
  return { month: Number(m[1]), year: 2000 + Number(m[2]) }
}

function classify(name: string, tipo: string): RawEntry['type'] {
  const t = tipo.toLowerCase()
  const n = name.toLowerCase()
  if (n.startsWith('goleiro') || t.includes('goleiro')) return 'goleiro'
  if (n === 'quadra' || t.includes('quadra')) return 'quadra'
  if (t.includes('mensal')) return 'mensal'
  if (t.includes('avulso')) return 'avulso'
  return 'outro'
}

function gamesFromTipo(tipo: string): number | null {
  const m = tipo.match(/(\d)\s*jogos?/i)
  return m ? Number(m[1]) : null
}

async function main() {
  const wb = XLSX.readFile('planilha-controle-futebol.xlsx', { cellDates: true })
  const report: string[] = []
  const raw: RawEntry[] = []
  const gamesByMonth = new Map<string, number>()

  // ---- Abas anuais (ler como matriz: 2024 NÃO tem linha de cabeçalho) ----
  // Colunas: 0=Nome, 1=Valor, 2=Mes, 3/4=Tipo (varia por aba)
  for (const sheetName of ['2024', '2025', '2026']) {
    const ws = wb.Sheets[sheetName]
    if (!ws) { report.push(`AVISO: aba ${sheetName} não encontrada`); continue }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })
    let skipped = 0
    for (const r of rows) {
      const name = String(r[0] ?? '').trim()
      if (!name || name === 'Nome') { skipped++; continue } // vazio ou linha de header
      const amountCents = toCents(r[1])
      const ym = parseMes(r[2])
      const tipo = String(r[3] ?? '').trim() || String(r[4] ?? '').trim()
      if (amountCents === null || !ym) { skipped++; continue }
      const type = classify(name, tipo)
      if (type === 'quadra') {
        const g = gamesFromTipo(tipo)
        if (g) gamesByMonth.set(`${ym.year}-${ym.month}`, g)
      }
      const isNonPlayer = NON_PLAYER_NAMES.has(name.toLowerCase())
      raw.push({ name, amountCents, ...ym, type, description: type === 'quadra' || type === 'goleiro' ? tipo || name : isNonPlayer ? name : null })
    }
    report.push(`Aba ${sheetName}: ${rows.length} linhas, ${skipped} puladas (header/sem nome/valor/mês)`)
  }

  // ---- Eventos: agrupar por mês da Data ----
  const wsEv = wb.Sheets['Eventos']
  if (wsEv) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wsEv)
    let count = 0
    for (const row of rows) {
      const name = String(row['Pessoa'] ?? '').trim()
      const amountCents = toCents(row['Gasto'])
      const data = row['Data'] instanceof Date ? (row['Data'] as Date) : null
      if (!name || amountCents === null || !data) continue
      const year = data.getFullYear()
      const month = data.getMonth() + 1
      raw.push({
        name, amountCents, year, month, type: 'evento',
        description: String(row['Descrição'] ?? '').trim() || name,
        eventKey: `${year}-${String(month).padStart(2, '0')}`,
      })
      count++
    }
    report.push(`Aba Eventos: ${count} lançamentos`)
  }

  // ---- Camisas: bloco principal (colunas A-D) + linha Compra ----
  const wsCam = wb.Sheets['Camisas']
  const shirtRows: { name: string; valueCents: number | null; size: string; note: string | null }[] = []
  let shirtPurchaseCents = 0
  if (wsCam) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wsCam, { header: 1 })
    for (const r of rows) {
      const name = String(r[0] ?? '').trim()
      if (!name) continue
      if (name.toLowerCase() === 'compra') { shirtPurchaseCents = toCents(r[1]) ?? 0; continue }
      shirtRows.push({
        name,
        valueCents: toCents(r[1]),
        size: String(r[2] ?? '').trim() || '?',
        note: String(r[3] ?? '').trim() || null,
      })
    }
    report.push(`Aba Camisas: ${shirtRows.length} pedidos + compra ${shirtPurchaseCents / 100} (colunas F-I do 2º pedido NÃO importadas — conferir manualmente)`)
  }

  // ---- Resolver nomes ----
  const aliasMap = buildAliasMap(PLAYER_ALIASES)
  const canonical = new Set(PLAYER_ALIASES.map((p) => p.name))
  const unresolved = new Map<string, number>()
  for (const e of raw) {
    if (NON_PLAYER_NAMES.has(e.name.toLowerCase())) continue
    if (!resolveName(e.name, aliasMap)) {
      // 1ª ocorrência vira canônico automaticamente
      if (!canonical.has(e.name)) {
        canonical.add(e.name)
        aliasMap.set(e.name.toLowerCase(), e.name)
        unresolved.set(e.name, (unresolved.get(e.name) ?? 0) + 1)
      }
    }
  }
  // Nomes da aba Camisas que não são non-player e não estão ainda canônicos
  for (const s of shirtRows) {
    if (NON_PLAYER_NAMES.has(s.name.toLowerCase())) continue
    const resolved = resolveName(s.name, aliasMap)
    if (!resolved && !canonical.has(s.name)) {
      canonical.add(s.name)
      aliasMap.set(s.name.toLowerCase(), s.name)
      unresolved.set(s.name, (unresolved.get(s.name) ?? 0) + 1)
    }
  }
  report.push(`Jogadores detectados: ${canonical.size}`)
  report.push(`Nomes auto-canonizados (CONFERIR se não são variações): ${[...unresolved.keys()].sort().join(', ')}`)

  // ---- Totais por mês p/ validação ----
  const totals = new Map<string, number>()
  for (const e of raw) {
    const k = `${e.year}-${String(e.month).padStart(2, '0')}`
    totals.set(k, (totals.get(k) ?? 0) + e.amountCents)
  }
  report.push('--- Totais por mês (centavos) — comparar com a planilha ---')
  for (const k of [...totals.keys()].sort()) report.push(`${k}: ${totals.get(k)}`)

  console.log(report.join('\n'))
  if (!WRITE) {
    console.log('\nDry-run. Rode com --write para gravar.')
    return
  }

  // ---- Gravação ----
  // players
  const playerIds = new Map<string, number>()
  for (const name of [...canonical].sort()) {
    const aliases = PLAYER_ALIASES.find((p) => p.name === name)?.aliases ?? []
    const r = await db.insert(players).values({ name, aliases }).onConflictDoNothing().returning({ id: players.id })
    if (r[0]) playerIds.set(name, r[0].id)
  }
  const existing = await db.select().from(players)
  for (const p of existing) playerIds.set(p.name, p.id)

  // months (games dos tipos "N JOGOS"; default 4 — ajustar depois no admin)
  for (const k of [...totals.keys()].sort()) {
    const [y, m] = k.split('-').map(Number)
    await db.insert(months).values({ year: y, month: m, gamesCount: gamesByMonth.get(`${y}-${m}`) ?? 4 }).onConflictDoNothing()
  }

  // events
  const eventIds = new Map<string, number>()
  for (const e of raw.filter((e) => e.eventKey)) {
    if (!eventIds.has(e.eventKey!)) {
      const [y, m] = e.eventKey!.split('-')
      const r = await db.insert(events).values({ name: `Evento ${m}/${y}`, date: `${y}-${m}-01` }).returning({ id: events.id })
      eventIds.set(e.eventKey!, r[0].id)
    }
  }

  // entries
  for (const e of raw) {
    const canonicalName = resolveName(e.name, aliasMap)
    const playerId = NON_PLAYER_NAMES.has(e.name.toLowerCase()) ? null : (canonicalName ? (playerIds.get(canonicalName) ?? null) : null)
    await db.insert(entries).values({
      year: e.year, month: e.month, type: e.type, amountCents: e.amountCents,
      playerId, eventId: e.eventKey ? (eventIds.get(e.eventKey) ?? null) : null,
      description: e.description,
    })
  }

  // shirts (com valor = pago; gera entry camisa)
  for (const s of shirtRows) {
    if (NON_PLAYER_NAMES.has(s.name.toLowerCase())) {
      // Não é jogador (ex: Horário): apenas entry de pagamento, sem shirt record
      if (s.valueCents) {
        await db.insert(entries).values({
          year: 2025, month: 1, type: 'camisa', amountCents: s.valueCents,
          playerId: null, description: `Camisa - ${s.name}`,
        })
      }
      continue
    }
    const canonicalName = resolveName(s.name, aliasMap) ?? s.name
    const pid = playerIds.get(canonicalName)
    if (!pid) { console.log(`Camisa pulada (jogador não cadastrado): ${s.name}`); continue }
    let paidEntryId: number | null = null
    if (s.valueCents) {
      const r = await db.insert(entries).values({
        year: 2025, month: 1, type: 'camisa', amountCents: s.valueCents, playerId: pid, description: `Camisa ${s.size}`,
      }).returning({ id: entries.id })
      paidEntryId = r[0].id
    }
    await db.insert(shirts).values({ playerId: pid, size: s.size, valueCents: s.valueCents ?? 12000, note: s.note, paidEntryId })
  }
  if (shirtPurchaseCents) {
    await db.insert(entries).values({ year: 2025, month: 1, type: 'camisa', amountCents: shirtPurchaseCents, description: 'Compra das camisas' })
  }

  // seeds de preços (ajustar no admin depois)
  await db.insert(yearSettings).values([
    { year: 2026, avulsoFeeCents: 2500, courtFeePerGameCents: 24000, goalkeeperFeePerGameCents: 4500 },
  ]).onConflictDoNothing()
  await db.insert(monthlyFeeTable).values([
    { year: 2026, gamesCount: 4, feeCents: 7500 },
    { year: 2026, gamesCount: 5, feeCents: 8500 },
  ]).onConflictDoNothing()
  await db.insert(appSettings).values([
    { key: 'group_name', value: 'Futebol' },
    { key: 'pix_key', value: '' },
  ]).onConflictDoNothing()

  // validação: total geral no banco × total da planilha
  const dbEntries = await db.select({ amountCents: entries.amountCents }).from(entries)
  const dbTotal = dbEntries.reduce((s, e) => s + e.amountCents, 0)
  const sheetTotal = [...totals.values()].reduce((s, v) => s + v, 0) +
    shirtRows.reduce((s, r) => s + (r.valueCents ?? 0), 0) + shirtPurchaseCents
  console.log(`\nVALIDAÇÃO — banco: ${dbTotal} | planilha: ${sheetTotal} | diff: ${dbTotal - sheetTotal}`)
  console.log('Importação concluída. Marque os mensalistas ativos em /admin/jogadores.')
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })

# Controle Futebol — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a planilha de controle financeiro da pelada por um PWA mobile-first com área admin (senha única) e consulta pública via link.

**Architecture:** Next.js App Router com Server Components para leitura e Server Actions para escrita. Livro-caixa central (`entries`) em Postgres (Neon) via Drizzle. Regras de negócio em funções puras (`src/lib/*`) testadas com Vitest. Importação do histórico via script standalone com dry-run.

**Tech Stack:** Next.js + TypeScript, Tailwind CSS, Recharts, Drizzle ORM, Neon Postgres, Zod, Vitest, deploy Vercel.

**Spec:** `docs/superpowers/specs/2026-06-05-controle-futebol-design.md`

**Convenções do plano:**
- Dinheiro sempre em **centavos inteiros** (`amountCents`). Positivo = receita, negativo = despesa.
- Todos os comandos rodam na raiz `C:\Users\Murilo\projetos\m2c\controle-futebol`.
- Env vars em `.env.local`: `DATABASE_URL`, `ADMIN_PASSWORD`, `AUTH_SECRET`.

---

### Task 0: Pré-requisito — banco Neon e env vars

**Files:**
- Create: `.env.local`

- [ ] **Step 1: Provisionar o Postgres**

Pedir ao usuário (Murilo) a connection string do Neon. Opções: `vercel link` + Marketplace (Neon) + `vercel env pull`, ou criar projeto direto em https://neon.tech e copiar a string. **Bloquear aqui se não houver credencial.**

- [ ] **Step 2: Criar `.env.local`**

```bash
DATABASE_URL=postgresql://...   # fornecida pelo usuário
ADMIN_PASSWORD=...              # escolhida pelo usuário
AUTH_SECRET=...                 # gerar: openssl rand -hex 32  (ou [Convert]::ToHexString((1..32|%{Get-Random -Max 256})))
```

`.env*` já está no `.gitignore`. Nada a commitar.

---

### Task 1: Scaffold Next.js + Vitest

**Files:**
- Create: projeto Next.js na raiz, `vitest.config.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Scaffold**

A raiz já tem `docs/`, `planilha-controle-futebol.xlsx`, `.gitignore` e `.git` — `create-next-app` aceita diretório não-vazio com `--yes`? Não aceita arquivos arbitrários. Então: scaffold em pasta temporária e mover:

```bash
npx --yes create-next-app@latest tmp-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
# mover conteúdo (PowerShell):
Get-ChildItem tmp-app -Force | Where-Object Name -notin '.git','.gitignore' | Move-Item -Destination .
# mesclar o .gitignore gerado com o existente (manter .superpowers/, node_modules/, .env*):
Get-Content tmp-app\.gitignore | Add-Content .gitignore
Remove-Item -Recurse -Force tmp-app
```

- [ ] **Step 2: Instalar dependências**

```bash
npm i drizzle-orm @neondatabase/serverless zod recharts
npm i -D drizzle-kit vitest tsx xlsx dotenv
```

- [ ] **Step 3: Configurar Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

Em `package.json`, adicionar em `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verificar que o app sobe**

Run: `npm run dev` → abrir http://localhost:3000, ver página default do Next. Parar o servidor.
Run: `npm test` → Expected: "no test files found" (exit 0 com flag `--passWithNoTests`; adicionar `--passWithNoTests` ao script `test`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Vitest"
```

---

### Task 2: Schema Drizzle + client + push

**Files:**
- Create: `src/db/schema.ts`, `src/db/client.ts`, `drizzle.config.ts`

- [ ] **Step 1: Escrever o schema**

Create `src/db/schema.ts`:

```ts
import {
  pgTable, pgEnum, serial, text, integer, boolean, date, timestamp, primaryKey,
} from 'drizzle-orm/pg-core'

export const entryType = pgEnum('entry_type', [
  'mensal', 'avulso', 'quadra', 'goleiro', 'evento', 'camisa', 'outro',
])

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  aliases: text('aliases').array().notNull().default([]),
  isMonthlyActive: boolean('is_monthly_active').notNull().default(false),
})

export const yearSettings = pgTable('year_settings', {
  year: integer('year').primaryKey(),
  avulsoFeeCents: integer('avulso_fee_cents').notNull(),
  courtFeePerGameCents: integer('court_fee_per_game_cents').notNull(),
  goalkeeperFeePerGameCents: integer('goalkeeper_fee_per_game_cents').notNull(),
})

export const monthlyFeeTable = pgTable('monthly_fee_table', {
  year: integer('year').notNull(),
  gamesCount: integer('games_count').notNull(),
  feeCents: integer('fee_cents').notNull(),
}, (t) => [primaryKey({ columns: [t.year, t.gamesCount] })])

export const months = pgTable('months', {
  year: integer('year').notNull(),
  month: integer('month').notNull(), // 1-12
  gamesCount: integer('games_count').notNull(),
}, (t) => [primaryKey({ columns: [t.year, t.month] })])

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  date: date('date'),
})

export const entries = pgTable('entries', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  playerId: integer('player_id').references(() => players.id),
  type: entryType('type').notNull(),
  amountCents: integer('amount_cents').notNull(), // + receita / - despesa
  eventId: integer('event_id').references(() => events.id),
  description: text('description'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const shirts = pgTable('shirts', {
  id: serial('id').primaryKey(),
  playerId: integer('player_id').notNull().references(() => players.id),
  size: text('size').notNull(), // P | M | G | GG
  valueCents: integer('value_cents').notNull(),
  note: text('note'),
  paidEntryId: integer('paid_entry_id').references(() => entries.id),
})

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(), // group_name, pix_key
  value: text('value').notNull(),
})
```

- [ ] **Step 2: Client e config**

Create `src/db/client.ts` (driver `pg` — funciona com o Postgres local em Docker e com qualquer Postgres em produção):

```ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export const db = drizzle(new Pool({ connectionString: process.env.DATABASE_URL! }), { schema })
```

Dependências adicionais: `npm i pg` e `npm i -D @types/pg` (decisão tomada quando o banco passou a ser Docker local em vez de Neon).

Create `drizzle.config.ts`:

```ts
import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
```

Nota: `drizzle-kit` não lê `.env.local` sozinho — duplicar `DATABASE_URL` num arquivo `.env` (também ignorado) ou exportar na sessão antes do push.

- [ ] **Step 3: Push do schema**

Run: `npx drizzle-kit push`
Expected: tabelas criadas sem erro (listar com `npx drizzle-kit studio` se quiser conferir).

- [ ] **Step 4: Commit**

```bash
git add src/db drizzle.config.ts package.json package-lock.json
git commit -m "feat: schema Drizzle (players, entries, months, prices, events, shirts, settings)"
```

---

### Task 3: lib/money — formatação e parse de valores

**Files:**
- Create: `src/lib/money.ts`
- Test: `src/lib/money.test.ts`

- [ ] **Step 1: Teste que falha**

Create `src/lib/money.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatBRL, parseToCents } from './money'

describe('formatBRL', () => {
  it('formata centavos como reais', () => {
    expect(formatBRL(7500)).toBe('R$ 75,00')
    expect(formatBRL(124000)).toBe('R$ 1.240,00')
    expect(formatBRL(-96000)).toBe('- R$ 960,00')
    expect(formatBRL(6236)).toBe('R$ 62,36')
  })
})

describe('parseToCents', () => {
  it('aceita formatos comuns de input', () => {
    expect(parseToCents('75')).toBe(7500)
    expect(parseToCents('75,00')).toBe(7500)
    expect(parseToCents('R$ 1.234,56')).toBe(123456)
    expect(parseToCents('-960')).toBe(-96000)
  })
  it('retorna null para inválido', () => {
    expect(parseToCents('abc')).toBeNull()
    expect(parseToCents('')).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — "Cannot find module './money'".

- [ ] **Step 3: Implementação**

Create `src/lib/money.ts`:

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` → Expected: PASS (3 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts src/lib/money.test.ts
git commit -m "feat: helpers de dinheiro em centavos (formatBRL, parseToCents)"
```

---

### Task 4: lib/fees — mensalidade e custo da quadra

**Files:**
- Create: `src/lib/fees.ts`
- Test: `src/lib/fees.test.ts`

- [ ] **Step 1: Teste que falha**

Create `src/lib/fees.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { monthlyFeeCents, courtCostCents } from './fees'

const table = [
  { year: 2026, gamesCount: 4, feeCents: 7500 },
  { year: 2026, gamesCount: 5, feeCents: 8500 },
  { year: 2025, gamesCount: 4, feeCents: 7500 },
]

describe('monthlyFeeCents', () => {
  it('encontra a mensalidade do ano + nº de jogos', () => {
    expect(monthlyFeeCents(table, 2026, 4)).toBe(7500)
    expect(monthlyFeeCents(table, 2026, 5)).toBe(8500)
  })
  it('retorna null quando não há regra cadastrada', () => {
    expect(monthlyFeeCents(table, 2026, 3)).toBeNull()
    expect(monthlyFeeCents(table, 2030, 4)).toBeNull()
  })
})

describe('courtCostCents', () => {
  it('multiplica preço por jogo pelos jogos do mês', () => {
    expect(courtCostCents(24000, 4)).toBe(96000)
    expect(courtCostCents(24000, 3)).toBe(72000)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test` → Expected: FAIL "Cannot find module './fees'".

- [ ] **Step 3: Implementação**

Create `src/lib/fees.ts`:

```ts
export interface FeeRow {
  year: number
  gamesCount: number
  feeCents: number
}

export function monthlyFeeCents(table: FeeRow[], year: number, gamesCount: number): number | null {
  return table.find((r) => r.year === year && r.gamesCount === gamesCount)?.feeCents ?? null
}

export function courtCostCents(courtFeePerGameCents: number, gamesCount: number): number {
  return courtFeePerGameCents * gamesCount
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fees.ts src/lib/fees.test.ts
git commit -m "feat: regras de mensalidade por jogos e custo de quadra"
```

---

### Task 5: lib/status — pagos × pendentes do mês

**Files:**
- Create: `src/lib/status.ts`
- Test: `src/lib/status.test.ts`

- [ ] **Step 1: Teste que falha**

Create `src/lib/status.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeMonthStatus } from './status'

const active = [
  { id: 1, name: 'Roger' },
  { id: 2, name: 'Tales' },
  { id: 3, name: 'Tio Valdo' },
]

describe('computeMonthStatus', () => {
  it('separa quem tem entry mensal de quem não tem', () => {
    const entries = [
      { playerId: 1, type: 'mensal', amountCents: 7500 },
      { playerId: 2, type: 'avulso', amountCents: 2500 }, // avulso não conta como mensalidade
      { playerId: null, type: 'quadra', amountCents: -96000 },
    ]
    const s = computeMonthStatus(active, entries)
    expect(s.paid.map((p) => p.name)).toEqual(['Roger'])
    expect(s.pending.map((p) => p.name)).toEqual(['Tales', 'Tio Valdo'])
  })
  it('mês sem lançamentos: todos pendentes', () => {
    const s = computeMonthStatus(active, [])
    expect(s.paid).toEqual([])
    expect(s.pending).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test` → Expected: FAIL.

- [ ] **Step 3: Implementação**

Create `src/lib/status.ts`:

```ts
export interface PlayerRef {
  id: number
  name: string
}

export interface EntryRef {
  playerId: number | null
  type: string
  amountCents: number
}

export interface MonthStatus {
  paid: PlayerRef[]
  pending: PlayerRef[]
}

export function computeMonthStatus(activePlayers: PlayerRef[], monthEntries: EntryRef[]): MonthStatus {
  const paidIds = new Set(
    monthEntries.filter((e) => e.type === 'mensal' && e.playerId !== null).map((e) => e.playerId),
  )
  return {
    paid: activePlayers.filter((p) => paidIds.has(p.id)),
    pending: activePlayers.filter((p) => !paidIds.has(p.id)),
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/status.ts src/lib/status.test.ts
git commit -m "feat: status mensal pagos x pendentes"
```

---

### Task 6: lib/balance — saldos e progresso de arrecadação

**Files:**
- Create: `src/lib/balance.ts`
- Test: `src/lib/balance.test.ts`

- [ ] **Step 1: Teste que falha**

Create `src/lib/balance.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { sumCents, monthCollection } from './balance'

describe('sumCents', () => {
  it('soma receitas e despesas', () => {
    expect(sumCents([{ amountCents: 7500 }, { amountCents: -96000 }, { amountCents: 2500 }])).toBe(-86000)
    expect(sumCents([])).toBe(0)
  })
})

describe('monthCollection', () => {
  it('arrecadado = mensal + avulso; esperado = ativos x mensalidade', () => {
    const entries = [
      { playerId: 1, type: 'mensal', amountCents: 7500 },
      { playerId: 2, type: 'avulso', amountCents: 2500 },
      { playerId: null, type: 'quadra', amountCents: -96000 },
    ]
    const r = monthCollection(14, 7500, entries)
    expect(r.collectedCents).toBe(10000)
    expect(r.expectedCents).toBe(105000)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.

- [ ] **Step 3: Implementação**

Create `src/lib/balance.ts`:

```ts
import type { EntryRef } from './status'

export function sumCents(entries: { amountCents: number }[]): number {
  return entries.reduce((s, e) => s + e.amountCents, 0)
}

export interface MonthCollection {
  collectedCents: number
  expectedCents: number
}

export function monthCollection(
  activeCount: number,
  feeCents: number,
  monthEntries: EntryRef[],
): MonthCollection {
  const collectedCents = sumCents(
    monthEntries.filter((e) => e.type === 'mensal' || e.type === 'avulso'),
  )
  return { collectedCents, expectedCents: activeCount * feeCents }
}
```

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/balance.ts src/lib/balance.test.ts
git commit -m "feat: saldo de caixa e progresso de arrecadacao do mes"
```

---

### Task 7: lib/cobranca — mensagem de WhatsApp

**Files:**
- Create: `src/lib/cobranca.ts`
- Test: `src/lib/cobranca.test.ts`

- [ ] **Step 1: Teste que falha**

Create `src/lib/cobranca.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildCobrancaMessage } from './cobranca'

describe('buildCobrancaMessage', () => {
  it('lista pendentes com valor e pix', () => {
    const msg = buildCobrancaMessage({
      monthLabel: 'junho/2026',
      feeCents: 7500,
      pendingNames: ['Tales', 'Tio Valdo', 'Erick'],
      pixKey: 'murilo@umbler.com',
    })
    expect(msg).toContain('junho/2026')
    expect(msg).toContain('R$ 75,00')
    expect(msg).toContain('Tales, Tio Valdo, Erick')
    expect(msg).toContain('PIX: murilo@umbler.com')
  })
  it('sem pendentes: mensagem de tudo em dia', () => {
    const msg = buildCobrancaMessage({
      monthLabel: 'junho/2026', feeCents: 7500, pendingNames: [], pixKey: 'x',
    })
    expect(msg).toContain('em dia')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.

- [ ] **Step 3: Implementação**

Create `src/lib/cobranca.ts`:

```ts
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
```

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cobranca.ts src/lib/cobranca.test.ts
git commit -m "feat: gerador de mensagem de cobranca para WhatsApp"
```

---

### Task 8: lib/normalize — aliases de nomes (importação)

**Files:**
- Create: `src/lib/normalize.ts`
- Test: `src/lib/normalize.test.ts`

- [ ] **Step 1: Teste que falha**

Create `src/lib/normalize.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildAliasMap, resolveName } from './normalize'

const players = [
  { name: 'Samuka', aliases: ['Samuca'] },
  { name: 'Tio Valdo', aliases: ['Tio Waldo'] },
  { name: 'Brandão', aliases: ['Brandao'] },
]

describe('resolveName', () => {
  it('resolve nome canônico, alias, caixa e espaços', () => {
    const map = buildAliasMap(players)
    expect(resolveName('Samuka', map)).toBe('Samuka')
    expect(resolveName('samuca', map)).toBe('Samuka')
    expect(resolveName('  Tio Waldo ', map)).toBe('Tio Valdo')
    expect(resolveName('brandao', map)).toBe('Brandão')
  })
  it('retorna null para desconhecido', () => {
    const map = buildAliasMap(players)
    expect(resolveName('Fulano', map)).toBeNull()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.

- [ ] **Step 3: Implementação**

Create `src/lib/normalize.ts`:

```ts
export interface PlayerAliases {
  name: string
  aliases: string[]
}

const norm = (s: string) => s.trim().toLowerCase()

export function buildAliasMap(players: PlayerAliases[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const p of players) {
    map.set(norm(p.name), p.name)
    for (const a of p.aliases) map.set(norm(a), p.name)
  }
  return map
}

export function resolveName(raw: string, map: Map<string, string>): string | null {
  return map.get(norm(raw)) ?? null
}
```

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/normalize.ts src/lib/normalize.test.ts
git commit -m "feat: normalizador de nomes com aliases"
```

---

### Task 9: auth — sessão assinada + middleware

**Files:**
- Create: `src/auth/session.ts`, `src/middleware.ts`
- Test: `src/auth/session.test.ts`

- [ ] **Step 1: Teste que falha**

Create `src/auth/session.test.ts`:

```ts
import { beforeAll, describe, expect, it } from 'vitest'
import { createSessionToken, verifySessionToken } from './session'

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-secret'
})

describe('session token', () => {
  it('cria e verifica token válido', () => {
    const t = createSessionToken()
    expect(verifySessionToken(t)).toBe(true)
  })
  it('rejeita token expirado', () => {
    const past = Date.now() - 1000 * 60 * 60 * 24 * 31
    const t = createSessionToken(past)
    expect(verifySessionToken(t)).toBe(false)
  })
  it('rejeita assinatura adulterada e lixo', () => {
    const t = createSessionToken()
    expect(verifySessionToken(t.slice(0, -2) + 'ff')).toBe(false)
    expect(verifySessionToken('garbage')).toBe(false)
    expect(verifySessionToken(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.

- [ ] **Step 3: Implementação**

Create `src/auth/session.ts`:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
export const SESSION_COOKIE = 'admin_session'

function sign(payload: string): string {
  return createHmac('sha256', process.env.AUTH_SECRET!).update(payload).digest('hex')
}

export function createSessionToken(now: number = Date.now()): string {
  const exp = now + THIRTY_DAYS_MS
  return `${exp}.${sign(String(exp))}`
}

export function verifySessionToken(token: string | undefined, now: number = Date.now()): boolean {
  if (!token) return false
  const [expStr, sig] = token.split('.')
  if (!expStr || !sig) return false
  const exp = Number(expStr)
  if (!Number.isFinite(exp) || exp < now) return false
  const expected = Buffer.from(sign(expStr))
  const given = Buffer.from(sig)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
```

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.

- [ ] **Step 5: Middleware protegendo /admin**

Create `src/middleware.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/auth/session'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (pathname === '/admin/login') return NextResponse.next()
  const token = req.cookies.get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
  runtime: 'nodejs', // node:crypto no middleware
}
```

Nota: se o build reclamar do runtime nodejs no middleware, habilitar em `next.config.ts`: `experimental: { nodeMiddleware: true }` (depende da versão do Next instalada).

- [ ] **Step 6: Commit**

```bash
git add src/auth src/middleware.ts
git commit -m "feat: sessao admin assinada (HMAC) + middleware em /admin"
```

---

### Task 10: Login do admin (página + actions)

**Files:**
- Create: `src/app/admin/login/page.tsx`, `src/auth/actions.ts`

- [ ] **Step 1: Server actions de login/logout**

Create `src/auth/actions.ts`:

```ts
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createSessionToken, SESSION_COOKIE } from './session'

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const password = formData.get('password')
  if (typeof password !== 'string' || password !== process.env.ADMIN_PASSWORD) {
    return { error: 'Senha incorreta' }
  }
  const jar = await cookies()
  jar.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  })
  redirect('/admin')
}

export async function logout() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect('/')
}
```

- [ ] **Step 2: Página de login**

Create `src/app/admin/login/page.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { login } from '@/auth/actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null)
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-center text-2xl font-bold">🔒 Área do admin</h1>
      <form action={action} className="flex flex-col gap-3">
        <input
          type="password"
          name="password"
          placeholder="Senha"
          required
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          disabled={pending}
          className="rounded-lg bg-green-600 py-2 font-semibold text-white disabled:opacity-50"
        >
          Entrar
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 3: Verificar manualmente**

Run: `npm run dev`
- Acessar http://localhost:3000/admin → deve redirecionar para `/admin/login`
- Senha errada → "Senha incorreta"; senha do `.env.local` → redireciona para `/admin` (404 por enquanto — página vem na Task 15; o middleware deixar passar é o que importa)

- [ ] **Step 4: Commit**

```bash
git add src/auth/actions.ts src/app/admin/login
git commit -m "feat: login do admin com cookie de sessao"
```

---

### Task 11: Camada de queries

**Files:**
- Create: `src/db/queries.ts`

Sem testes unitários (depende do banco) — validada pelas páginas nas tasks seguintes.

- [ ] **Step 1: Implementar**

Create `src/db/queries.ts`:

```ts
import { and, asc, desc, eq } from 'drizzle-orm'
import { db } from './client'
import {
  appSettings, entries, events, monthlyFeeTable, months, players, shirts, yearSettings,
} from './schema'

export async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.select().from(appSettings)
  return Object.fromEntries(rows.map((r) => [r.key, r.value]))
}

export function getAllPlayers() {
  return db.select().from(players).orderBy(asc(players.name))
}

export function getActivePlayers() {
  return db.select().from(players).where(eq(players.isMonthlyActive, true)).orderBy(asc(players.name))
}

export async function getMonth(year: number, month: number) {
  const rows = await db
    .select()
    .from(months)
    .where(and(eq(months.year, year), eq(months.month, month)))
  return rows[0] ?? null
}

export function getAllMonths() {
  return db.select().from(months).orderBy(asc(months.year), asc(months.month))
}

export function getMonthEntries(year: number, month: number) {
  return db
    .select()
    .from(entries)
    .where(and(eq(entries.year, year), eq(entries.month, month)))
    .orderBy(desc(entries.createdAt))
}

export function getAllEntries() {
  return db.select().from(entries).orderBy(asc(entries.year), asc(entries.month))
}

export function getFeeTable() {
  return db.select().from(monthlyFeeTable).orderBy(asc(monthlyFeeTable.year), asc(monthlyFeeTable.gamesCount))
}

export function getAllYearSettings() {
  return db.select().from(yearSettings).orderBy(asc(yearSettings.year))
}

export function getEvents() {
  return db.select().from(events).orderBy(desc(events.date))
}

export function getEventEntries() {
  return db.select().from(entries).where(eq(entries.type, 'evento'))
}

export async function getShirtsWithPlayers() {
  return db
    .select({
      id: shirts.id,
      size: shirts.size,
      valueCents: shirts.valueCents,
      note: shirts.note,
      paidEntryId: shirts.paidEntryId,
      playerName: players.name,
    })
    .from(shirts)
    .innerJoin(players, eq(shirts.playerId, players.id))
    .orderBy(asc(players.name))
}

export function getShirtEntries() {
  return db.select().from(entries).where(eq(entries.type, 'camisa'))
}
```

- [ ] **Step 2: Checar tipos**

Run: `npx tsc --noEmit` → Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/db/queries.ts
git commit -m "feat: camada de queries"
```

---

### Task 12: Server Actions de gestão

**Files:**
- Create: `src/app/admin/actions.ts`

- [ ] **Step 1: Implementar actions com Zod**

Create `src/app/admin/actions.ts`:

```ts
'use server'

import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db/client'
import {
  appSettings, entries, events, monthlyFeeTable, months, players, shirts, yearSettings,
} from '@/db/schema'
import { parseToCents } from '@/lib/money'

export type ActionResult = { ok: true } | { ok: false; error: string; needsConfirm?: boolean }

function revalidateAll() {
  for (const p of ['/', '/eventos', '/camisas', '/historico', '/admin']) revalidatePath(p)
}

const entrySchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  type: z.enum(['mensal', 'avulso', 'quadra', 'goleiro', 'evento', 'camisa', 'outro']),
  amount: z.string().min(1),
  playerId: z.coerce.number().int().optional(),
  eventId: z.coerce.number().int().optional(),
  description: z.string().trim().max(200).optional(),
  confirmed: z.coerce.boolean().optional(),
})

export async function createEntry(formData: FormData): Promise<ActionResult> {
  const parsed = entrySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const d = parsed.data

  const amountCents = parseToCents(d.amount)
  if (amountCents === null || amountCents === 0) return { ok: false, error: 'Valor inválido' }

  if (d.type === 'mensal' && d.playerId && !d.confirmed) {
    const dup = await db
      .select({ id: entries.id })
      .from(entries)
      .where(and(
        eq(entries.year, d.year), eq(entries.month, d.month),
        eq(entries.playerId, d.playerId), eq(entries.type, 'mensal'),
      ))
    if (dup.length > 0) {
      return { ok: false, needsConfirm: true, error: 'Já existe mensalidade deste jogador neste mês. Confirmar mesmo assim?' }
    }
  }

  await db.insert(entries).values({
    year: d.year, month: d.month, type: d.type, amountCents,
    playerId: d.playerId ?? null, eventId: d.eventId ?? null,
    description: d.description || null,
  })
  revalidateAll()
  return { ok: true }
}

export async function deleteEntry(id: number): Promise<ActionResult> {
  await db.update(shirts).set({ paidEntryId: null }).where(eq(shirts.paidEntryId, id))
  await db.delete(entries).where(eq(entries.id, id))
  revalidateAll()
  return { ok: true }
}

const playerSchema = z.object({
  name: z.string().trim().min(1).max(60),
  isMonthlyActive: z.coerce.boolean().optional(),
})

export async function createPlayer(formData: FormData): Promise<ActionResult> {
  const parsed = playerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Nome inválido' }
  await db
    .insert(players)
    .values({ name: parsed.data.name, isMonthlyActive: parsed.data.isMonthlyActive ?? false })
    .onConflictDoNothing()
  revalidateAll()
  return { ok: true }
}

export async function togglePlayerActive(id: number, active: boolean): Promise<ActionResult> {
  await db.update(players).set({ isMonthlyActive: active }).where(eq(players.id, id))
  revalidateAll()
  return { ok: true }
}

const monthSchema = z.object({
  year: z.coerce.number().int(),
  month: z.coerce.number().int().min(1).max(12),
  gamesCount: z.coerce.number().int().min(1).max(6),
})

export async function upsertMonth(formData: FormData): Promise<ActionResult> {
  const parsed = monthSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const d = parsed.data
  await db
    .insert(months)
    .values(d)
    .onConflictDoUpdate({ target: [months.year, months.month], set: { gamesCount: d.gamesCount } })
  revalidateAll()
  return { ok: true }
}

const yearSettingsSchema = z.object({
  year: z.coerce.number().int(),
  avulsoFee: z.string(),
  courtFeePerGame: z.string(),
  goalkeeperFeePerGame: z.string(),
})

export async function upsertYearSettings(formData: FormData): Promise<ActionResult> {
  const parsed = yearSettingsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const d = parsed.data
  const vals = {
    avulsoFeeCents: parseToCents(d.avulsoFee),
    courtFeePerGameCents: parseToCents(d.courtFeePerGame),
    goalkeeperFeePerGameCents: parseToCents(d.goalkeeperFeePerGame),
  }
  if (Object.values(vals).some((v) => v === null)) return { ok: false, error: 'Valor inválido' }
  await db
    .insert(yearSettings)
    .values({ year: d.year, ...(vals as Record<string, number>) })
    .onConflictDoUpdate({ target: yearSettings.year, set: vals as Record<string, number> })
  revalidateAll()
  return { ok: true }
}

const feeRowSchema = z.object({
  year: z.coerce.number().int(),
  gamesCount: z.coerce.number().int().min(1).max(6),
  fee: z.string(),
})

export async function upsertMonthlyFee(formData: FormData): Promise<ActionResult> {
  const parsed = feeRowSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const feeCents = parseToCents(parsed.data.fee)
  if (feeCents === null) return { ok: false, error: 'Valor inválido' }
  const { year, gamesCount } = parsed.data
  await db
    .insert(monthlyFeeTable)
    .values({ year, gamesCount, feeCents })
    .onConflictDoUpdate({ target: [monthlyFeeTable.year, monthlyFeeTable.gamesCount], set: { feeCents } })
  revalidateAll()
  return { ok: true }
}

const eventSchema = z.object({
  name: z.string().trim().min(1).max(80),
  date: z.string().optional(),
})

export async function createEvent(formData: FormData): Promise<ActionResult> {
  const parsed = eventSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Nome inválido' }
  await db.insert(events).values({ name: parsed.data.name, date: parsed.data.date || null })
  revalidateAll()
  return { ok: true }
}

const shirtSchema = z.object({
  playerId: z.coerce.number().int(),
  size: z.enum(['P', 'M', 'G', 'GG']),
  value: z.string(),
  note: z.string().trim().max(100).optional(),
})

export async function createShirt(formData: FormData): Promise<ActionResult> {
  const parsed = shirtSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const valueCents = parseToCents(parsed.data.value)
  if (valueCents === null) return { ok: false, error: 'Valor inválido' }
  const { playerId, size, note } = parsed.data
  await db.insert(shirts).values({ playerId, size, valueCents, note: note || null })
  revalidateAll()
  return { ok: true }
}

export async function markShirtPaid(shirtId: number, year: number, month: number): Promise<ActionResult> {
  const rows = await db.select().from(shirts).where(eq(shirts.id, shirtId))
  const shirt = rows[0]
  if (!shirt) return { ok: false, error: 'Camisa não encontrada' }
  if (shirt.paidEntryId) return { ok: false, error: 'Camisa já paga' }
  const inserted = await db
    .insert(entries)
    .values({
      year, month, type: 'camisa', amountCents: shirt.valueCents,
      playerId: shirt.playerId, description: `Camisa ${shirt.size}`,
    })
    .returning({ id: entries.id })
  await db.update(shirts).set({ paidEntryId: inserted[0].id }).where(eq(shirts.id, shirtId))
  revalidateAll()
  return { ok: true }
}

const settingSchema = z.object({
  key: z.enum(['group_name', 'pix_key']),
  value: z.string().trim().max(200),
})

export async function saveSetting(formData: FormData): Promise<ActionResult> {
  const parsed = settingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Dados inválidos' }
  const { key, value } = parsed.data
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
  revalidateAll()
  return { ok: true }
}
```

- [ ] **Step 2: Checar tipos** — `npx tsc --noEmit` → sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/actions.ts
git commit -m "feat: server actions de gestao (entries, players, precos, eventos, camisas, settings)"
```

---

### Task 13: Layout público + dashboard (`/`)

**Files:**
- Create: `src/components/bottom-nav.tsx`, `src/components/payment-list.tsx`, `src/lib/dates.ts`
- Modify: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Helper de data (teste primeiro)**

Create `src/lib/dates.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { monthLabel } from './dates'

describe('monthLabel', () => {
  it('formata mês/ano em pt-BR', () => {
    expect(monthLabel(2026, 6)).toBe('junho/2026')
    expect(monthLabel(2025, 1)).toBe('janeiro/2025')
  })
})
```

Run: `npm test` → FAIL. Create `src/lib/dates.ts`:

```ts
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
```

Run: `npm test` → PASS.

- [ ] **Step 2: Bottom nav**

Create `src/components/bottom-nav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/', label: 'Mensal', icon: '⚽' },
  { href: '/eventos', label: 'Eventos', icon: '🍖' },
  { href: '/camisas', label: 'Camisas', icon: '👕' },
  { href: '/historico', label: 'Histórico', icon: '📊' },
]

export function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md border-t border-slate-200 bg-white">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          className={`flex flex-1 flex-col items-center py-2 text-xs ${
            pathname === it.href ? 'font-bold text-green-600' : 'text-slate-500'
          }`}
        >
          <span className="text-base">{it.icon}</span>
          {it.label}
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Layout raiz**

Modify `src/app/layout.tsx` (substituir conteúdo):

```tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'
import { BottomNav } from '@/components/bottom-nav'

export const metadata: Metadata = {
  title: 'Controle Futebol',
  description: 'Controle financeiro da pelada',
}

export const viewport: Viewport = { themeColor: '#16a34a' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <div className="mx-auto min-h-dvh max-w-md pb-16">{children}</div>
        <BottomNav />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Lista de pagamentos com filtros (client)**

Create `src/components/payment-list.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { formatBRL } from '@/lib/money'

export interface PaymentRow {
  name: string
  status: 'pago' | 'pendente' | 'avulso'
  amountCents?: number
}

const FILTERS = ['Todos', 'Pendentes', 'Avulsos'] as const

export function PaymentList({ rows }: { rows: PaymentRow[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('Todos')
  const visible = rows.filter((r) =>
    filter === 'Todos' ? true : filter === 'Pendentes' ? r.status === 'pendente' : r.status === 'avulso',
  )
  return (
    <section>
      <div className="flex gap-2 px-4 pt-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              filter === f ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <ul className="mt-2 divide-y divide-slate-200 bg-white">
        {visible.map((r, i) => (
          <li key={`${r.name}-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-semibold">{r.name}</span>
            {r.status === 'pago' && <span className="font-bold text-green-600">✓ Pago</span>}
            {r.status === 'pendente' && <span className="font-bold text-red-600">Pendente</span>}
            {r.status === 'avulso' && (
              <span className="font-bold text-sky-600">Avulso {r.amountCents ? formatBRL(r.amountCents) : ''}</span>
            )}
          </li>
        ))}
        {visible.length === 0 && <li className="px-4 py-4 text-sm text-slate-500">Nada por aqui.</li>}
      </ul>
    </section>
  )
}
```

- [ ] **Step 5: Dashboard (server component)**

Modify `src/app/page.tsx` (substituir conteúdo):

```tsx
import { PaymentList, type PaymentRow } from '@/components/payment-list'
import {
  getActivePlayers, getAllEntries, getAllPlayers, getFeeTable, getMonth, getMonthEntries, getSettingsMap,
} from '@/db/queries'
import { sumCents, monthCollection } from '@/lib/balance'
import { currentYearMonth, monthLabel } from '@/lib/dates'
import { monthlyFeeCents } from '@/lib/fees'
import { formatBRL } from '@/lib/money'
import { computeMonthStatus } from '@/lib/status'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { year, month } = currentYearMonth()
  const [settings, active, allPlayers, monthRow, monthEntries, feeTable, allEntries] = await Promise.all([
    getSettingsMap(), getActivePlayers(), getAllPlayers(), getMonth(year, month),
    getMonthEntries(year, month), getFeeTable(), getAllEntries(),
  ])

  const fee = monthRow ? monthlyFeeCents(feeTable, year, monthRow.gamesCount) : null
  const status = computeMonthStatus(active, monthEntries)
  const cash = sumCents(allEntries)
  const collection = fee ? monthCollection(active.length, fee, monthEntries) : null
  const nameById = new Map(allPlayers.map((p) => [p.id, p.name]))

  const rows: PaymentRow[] = [
    ...status.pending.map((p) => ({ name: p.name, status: 'pendente' as const })),
    ...status.paid.map((p) => ({ name: p.name, status: 'pago' as const })),
    ...monthEntries
      .filter((e) => e.type === 'avulso')
      .map((e) => ({
        name: e.playerId ? (nameById.get(e.playerId) ?? '?') : (e.description ?? '?'),
        status: 'avulso' as const,
        amountCents: e.amountCents,
      })),
  ]

  const pct = collection && collection.expectedCents > 0
    ? Math.min(100, Math.round((collection.collectedCents / collection.expectedCents) * 100))
    : 0

  return (
    <main>
      <header className="bg-green-600 px-4 py-4 text-white">
        <h1 className="text-lg font-bold">⚽ {settings.group_name ?? 'Controle Futebol'}</h1>
        <p className="text-xs opacity-90">
          {monthLabel(year, month)}
          {monthRow && ` · ${monthRow.gamesCount} jogos`}
          {fee !== null && ` · mensalidade ${formatBRL(fee)}`}
        </p>
      </header>

      <section className="flex gap-2 px-3 py-3">
        <Card value={formatBRL(cash)} label="CAIXA" />
        <Card value={`${status.paid.length}/${active.length}`} label="PAGOS" />
        <Card value={monthRow ? String(monthRow.gamesCount) : '—'} label="JOGOS" />
      </section>

      {collection && (
        <section className="mx-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <strong>Arrecadação do mês</strong> — {formatBRL(collection.collectedCents)} de{' '}
          {formatBRL(collection.expectedCents)}
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full bg-green-600" style={{ width: `${pct}%` }} />
          </div>
        </section>
      )}

      <PaymentList rows={rows} />
    </main>
  )
}

function Card({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-xl border border-slate-200 bg-white p-3 text-center">
      <div className="text-base font-extrabold">{value}</div>
      <div className="mt-0.5 text-[10px] font-bold text-slate-500">{label}</div>
    </div>
  )
}
```

- [ ] **Step 6: Verificar manualmente**

Inserir dados mínimos direto no banco (ou via `npx drizzle-kit studio`): 2-3 players ativos, `months` (ano/mês atual, 4 jogos), `monthly_fee_table` (2026, 4, 7500), 1 entry mensal. Run `npm run dev` → `/` mostra cards, barra e lista com filtros funcionando.

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx src/components src/lib/dates.ts src/lib/dates.test.ts
git commit -m "feat: layout publico com bottom nav e dashboard em cards"
```

---

### Task 14: Páginas Eventos e Camisas

**Files:**
- Create: `src/app/eventos/page.tsx`, `src/app/camisas/page.tsx`

- [ ] **Step 1: Página de eventos**

Create `src/app/eventos/page.tsx`:

```tsx
import { getEventEntries, getEvents, getAllPlayers } from '@/db/queries'
import { sumCents } from '@/lib/balance'
import { formatBRL } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function EventosPage() {
  const [events, entries, players] = await Promise.all([getEvents(), getEventEntries(), getAllPlayers()])
  const nameById = new Map(players.map((p) => [p.id, p.name]))

  return (
    <main>
      <header className="bg-green-600 px-4 py-4 text-white">
        <h1 className="text-lg font-bold">🍖 Eventos</h1>
      </header>
      <div className="flex flex-col gap-3 p-3">
        {events.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum evento ainda.</p>}
        {events.map((ev) => {
          const evEntries = entries.filter((e) => e.eventId === ev.id)
          const saldo = sumCents(evEntries)
          const gastos = evEntries.filter((e) => e.amountCents < 0)
          const contribs = evEntries.filter((e) => e.amountCents > 0)
          return (
            <details key={ev.id} className="rounded-xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold">
                <span>{ev.name}</span>
                <span className={saldo >= 0 ? 'text-green-600' : 'text-red-600'}>{formatBRL(saldo)}</span>
              </summary>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3 text-xs">
                <div>
                  <p className="mb-1 font-bold text-red-600">Gastos</p>
                  {gastos.map((e) => (
                    <p key={e.id} className="flex justify-between py-0.5">
                      <span>{e.description ?? (e.playerId ? nameById.get(e.playerId) : 'Gasto')}</span>
                      <span>{formatBRL(e.amountCents)}</span>
                    </p>
                  ))}
                </div>
                <div>
                  <p className="mb-1 font-bold text-green-600">Contribuições</p>
                  {contribs.map((e) => (
                    <p key={e.id} className="flex justify-between py-0.5">
                      <span>{e.playerId ? nameById.get(e.playerId) : (e.description ?? '?')}</span>
                      <span>{formatBRL(e.amountCents)}</span>
                    </p>
                  ))}
                </div>
              </div>
            </details>
          )
        })}
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Página de camisas**

Create `src/app/camisas/page.tsx`:

```tsx
import { getShirtEntries, getShirtsWithPlayers } from '@/db/queries'
import { sumCents } from '@/lib/balance'
import { formatBRL } from '@/lib/money'

export const dynamic = 'force-dynamic'

export default async function CamisasPage() {
  const [shirtList, shirtEntries] = await Promise.all([getShirtsWithPlayers(), getShirtEntries()])
  const arrecadado = sumCents(shirtEntries.filter((e) => e.amountCents > 0))
  const custo = sumCents(shirtEntries.filter((e) => e.amountCents < 0))

  return (
    <main>
      <header className="bg-green-600 px-4 py-4 text-white">
        <h1 className="text-lg font-bold">👕 Camisas</h1>
        <p className="text-xs opacity-90">
          Arrecadado {formatBRL(arrecadado)} · Custo {formatBRL(custo)} · Saldo {formatBRL(arrecadado + custo)}
        </p>
      </header>
      <ul className="m-3 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {shirtList.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-semibold">
              {s.playerName} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">{s.size}</span>
              {s.note && <span className="ml-1 text-xs text-slate-400">{s.note}</span>}
            </span>
            {s.paidEntryId ? (
              <span className="font-bold text-green-600">✓ {formatBRL(s.valueCents)}</span>
            ) : (
              <span className="font-bold text-red-600">Pendente</span>
            )}
          </li>
        ))}
        {shirtList.length === 0 && <li className="px-4 py-4 text-sm text-slate-500">Nenhum pedido ainda.</li>}
      </ul>
    </main>
  )
}
```

- [ ] **Step 3: Verificar** — `npm run dev`, abrir `/eventos` e `/camisas` (vazias ou com dados de teste, sem erro).

- [ ] **Step 4: Commit**

```bash
git add src/app/eventos src/app/camisas
git commit -m "feat: paginas publicas de eventos e camisas"
```

---

### Task 15: Histórico com gráficos

**Files:**
- Create: `src/lib/series.ts`, `src/components/historico-charts.tsx`, `src/app/historico/page.tsx`
- Test: `src/lib/series.test.ts`

- [ ] **Step 1: Teste das séries (puro)**

Create `src/lib/series.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildMonthlySeries, buildYearTotals } from './series'

const entries = [
  { year: 2025, month: 1, amountCents: 10000 },
  { year: 2025, month: 1, amountCents: -4000 },
  { year: 2025, month: 2, amountCents: 5000 },
  { year: 2026, month: 1, amountCents: 2000 },
]

describe('buildMonthlySeries', () => {
  it('agrega receita/despesa por mês e acumula saldo', () => {
    const s = buildMonthlySeries(entries)
    expect(s).toEqual([
      { key: '2025-01', label: '01/25', receitaCents: 10000, despesaCents: -4000, saldoAcumuladoCents: 6000 },
      { key: '2025-02', label: '02/25', receitaCents: 5000, despesaCents: 0, saldoAcumuladoCents: 11000 },
      { key: '2026-01', label: '01/26', receitaCents: 2000, despesaCents: 0, saldoAcumuladoCents: 13000 },
    ])
  })
})

describe('buildYearTotals', () => {
  it('totaliza por ano', () => {
    expect(buildYearTotals(entries)).toEqual([
      { year: 2025, receitaCents: 15000, despesaCents: -4000 },
      { year: 2026, receitaCents: 2000, despesaCents: 0 },
    ])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npm test` → FAIL.

- [ ] **Step 3: Implementação**

Create `src/lib/series.ts`:

```ts
export interface SeriesEntry {
  year: number
  month: number
  amountCents: number
}

export interface MonthPoint {
  key: string
  label: string
  receitaCents: number
  despesaCents: number
  saldoAcumuladoCents: number
}

export function buildMonthlySeries(entries: SeriesEntry[]): MonthPoint[] {
  const byMonth = new Map<string, { receitaCents: number; despesaCents: number }>()
  for (const e of entries) {
    const key = `${e.year}-${String(e.month).padStart(2, '0')}`
    const acc = byMonth.get(key) ?? { receitaCents: 0, despesaCents: 0 }
    if (e.amountCents >= 0) acc.receitaCents += e.amountCents
    else acc.despesaCents += e.amountCents
    byMonth.set(key, acc)
  }
  const keys = [...byMonth.keys()].sort()
  let running = 0
  return keys.map((key) => {
    const { receitaCents, despesaCents } = byMonth.get(key)!
    running += receitaCents + despesaCents
    const [y, m] = key.split('-')
    return { key, label: `${m}/${y.slice(2)}`, receitaCents, despesaCents, saldoAcumuladoCents: running }
  })
}

export interface YearTotal {
  year: number
  receitaCents: number
  despesaCents: number
}

export function buildYearTotals(entries: SeriesEntry[]): YearTotal[] {
  const byYear = new Map<number, YearTotal>()
  for (const e of entries) {
    const acc = byYear.get(e.year) ?? { year: e.year, receitaCents: 0, despesaCents: 0 }
    if (e.amountCents >= 0) acc.receitaCents += e.amountCents
    else acc.despesaCents += e.amountCents
    byYear.set(e.year, acc)
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year)
}
```

- [ ] **Step 4: Rodar e ver passar** — `npm test` → PASS.

- [ ] **Step 5: Componente de gráficos (client)**

Create `src/components/historico-charts.tsx`:

```tsx
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
```

- [ ] **Step 6: Página**

Create `src/app/historico/page.tsx`:

```tsx
import { HistoricoCharts } from '@/components/historico-charts'
import { getAllEntries } from '@/db/queries'
import { buildMonthlySeries, buildYearTotals } from '@/lib/series'

export const dynamic = 'force-dynamic'

export default async function HistoricoPage() {
  const entries = await getAllEntries()
  return (
    <main>
      <header className="bg-green-600 px-4 py-4 text-white">
        <h1 className="text-lg font-bold">📊 Histórico</h1>
      </header>
      <HistoricoCharts series={buildMonthlySeries(entries)} years={buildYearTotals(entries)} />
    </main>
  )
}
```

- [ ] **Step 7: Verificar** — `npm run dev` → `/historico` renderiza os 3 gráficos.

- [ ] **Step 8: Commit**

```bash
git add src/lib/series.ts src/lib/series.test.ts src/components/historico-charts.tsx src/app/historico
git commit -m "feat: historico com graficos de caixa, receita x despesa e comparativo anual"
```

---

### Task 16: Admin — lançamentos + cobrança

**Files:**
- Create: `src/app/admin/page.tsx`, `src/components/entry-form.tsx`, `src/components/entry-list.tsx`, `src/components/copy-button.tsx`

- [ ] **Step 1: Formulário clássico de lançamento (client)**

Create `src/components/entry-form.tsx`:

```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { createEntry, type ActionResult } from '@/app/admin/actions'

const TYPES = [
  ['mensal', 'Mensal'], ['avulso', 'Avulso'], ['quadra', 'Quadra'], ['goleiro', 'Goleiro'],
  ['evento', 'Evento'], ['camisa', 'Camisa'], ['outro', 'Outro'],
] as const

export interface FormRefs {
  players: { id: number; name: string }[]
  events: { id: number; name: string }[]
  year: number
  month: number
  defaultFee: string // ex: "75,00" — pré-preenche no tipo mensal
  defaultAvulso: string
}

export function EntryForm({ refs }: { refs: FormRefs }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [type, setType] = useState<string>('mensal')
  const [amount, setAmount] = useState(refs.defaultFee)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'confirm'; text: string } | null>(null)
  const [pending, start] = useTransition()

  function pickType(t: string) {
    setType(t)
    if (t === 'mensal') setAmount(refs.defaultFee)
    else if (t === 'avulso') setAmount(refs.defaultAvulso)
    else setAmount('')
  }

  function submit(formData: FormData, confirmed = false) {
    if (confirmed) formData.set('confirmed', 'true')
    start(async () => {
      const r: ActionResult = await createEntry(formData)
      if (r.ok) {
        setMsg({ kind: 'ok', text: 'Lançamento salvo ✓' })
        formRef.current?.reset()
        pickType('mensal')
      } else if (r.needsConfirm) {
        setMsg({ kind: 'confirm', text: r.error })
      } else {
        setMsg({ kind: 'err', text: r.error })
      }
    })
  }

  return (
    <form
      ref={formRef}
      action={(fd) => submit(fd)}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h2 className="text-sm font-bold">Novo lançamento — {String(refs.month).padStart(2, '0')}/{refs.year}</h2>
      <input type="hidden" name="year" value={refs.year} />
      <input type="hidden" name="month" value={refs.month} />
      <input type="hidden" name="type" value={type} />

      <div className="flex flex-wrap gap-1.5">
        {TYPES.map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => pickType(val)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              type === val ? 'border-green-600 bg-green-600 text-white' : 'border-slate-300 bg-white text-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <label className="text-xs font-bold text-slate-600">
        Jogador (opcional para quadra/goleiro)
        <select name="playerId" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
          <option value="">—</option>
          {refs.players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </label>

      {type === 'evento' && (
        <label className="text-xs font-bold text-slate-600">
          Evento
          <select name="eventId" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
            <option value="">—</option>
            {refs.events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </label>
      )}

      <label className="text-xs font-bold text-slate-600">
        Valor (negativo = despesa)
        <input
          name="amount" value={amount} onChange={(e) => setAmount(e.target.value)} required
          inputMode="decimal" placeholder="75,00"
          className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
        />
      </label>

      <label className="text-xs font-bold text-slate-600">
        Descrição (opcional)
        <input name="description" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
      </label>

      {msg && (
        <p className={`text-xs font-semibold ${msg.kind === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
          {msg.text}
          {msg.kind === 'confirm' && (
            <button
              type="button"
              onClick={() => formRef.current && submit(new FormData(formRef.current), true)}
              className="ml-2 rounded bg-red-600 px-2 py-0.5 text-white"
            >
              Confirmar
            </button>
          )}
        </p>
      )}

      <button disabled={pending} className="rounded-lg bg-green-600 py-2 text-sm font-bold text-white disabled:opacity-50">
        Salvar lançamento
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Lista de lançamentos do mês com exclusão**

Create `src/components/entry-list.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { deleteEntry } from '@/app/admin/actions'
import { formatBRL } from '@/lib/money'

export interface EntryRow {
  id: number
  label: string
  type: string
  amountCents: number
}

export function EntryList({ rows }: { rows: EntryRow[] }) {
  const [pending, start] = useTransition()
  return (
    <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between px-4 py-2 text-sm">
          <span>
            <strong>{r.label}</strong>
            <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase">{r.type}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className={r.amountCents >= 0 ? 'font-bold text-green-600' : 'font-bold text-red-600'}>
              {formatBRL(r.amountCents)}
            </span>
            <button
              disabled={pending}
              onClick={() => { if (confirm(`Excluir lançamento de ${r.label}?`)) start(() => deleteEntry(r.id).then(() => {})) }}
              className="text-slate-400 hover:text-red-600"
              aria-label="Excluir"
            >
              ✕
            </button>
          </span>
        </li>
      ))}
      {rows.length === 0 && <li className="px-4 py-4 text-sm text-slate-500">Nenhum lançamento no mês.</li>}
    </ul>
  )
}
```

- [ ] **Step 3: Botão de copiar cobrança**

Create `src/components/copy-button.tsx`:

```tsx
'use client'

import { useState } from 'react'

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
    >
      {copied ? 'Copiado ✓' : '📋 Copiar cobrança'}
    </button>
  )
}
```

- [ ] **Step 4: Página admin principal**

Create `src/app/admin/page.tsx`:

```tsx
import Link from 'next/link'
import { EntryForm } from '@/components/entry-form'
import { EntryList, type EntryRow } from '@/components/entry-list'
import { CopyButton } from '@/components/copy-button'
import {
  getActivePlayers, getAllPlayers, getEvents, getFeeTable, getMonth, getMonthEntries, getSettingsMap, getAllYearSettings,
} from '@/db/queries'
import { buildCobrancaMessage } from '@/lib/cobranca'
import { currentYearMonth, monthLabel } from '@/lib/dates'
import { monthlyFeeCents } from '@/lib/fees'
import { computeMonthStatus } from '@/lib/status'

export const dynamic = 'force-dynamic'

function centsToInput(cents: number | null): string {
  return cents === null ? '' : (cents / 100).toFixed(2).replace('.', ',')
}

export default async function AdminPage() {
  const { year, month } = currentYearMonth()
  const [settings, active, allPlayers, eventsList, monthRow, monthEntries, feeTable, yearsCfg] = await Promise.all([
    getSettingsMap(), getActivePlayers(), getAllPlayers(), getEvents(), getMonth(year, month),
    getMonthEntries(year, month), getFeeTable(), getAllYearSettings(),
  ])

  const fee = monthRow ? monthlyFeeCents(feeTable, year, monthRow.gamesCount) : null
  const yearCfg = yearsCfg.find((y) => y.year === year)
  const status = computeMonthStatus(active, monthEntries)
  const nameById = new Map(allPlayers.map((p) => [p.id, p.name]))

  const rows: EntryRow[] = monthEntries.map((e) => ({
    id: e.id,
    label: e.playerId ? (nameById.get(e.playerId) ?? '?') : (e.description ?? e.type),
    type: e.type,
    amountCents: e.amountCents,
  }))

  const cobranca = buildCobrancaMessage({
    monthLabel: monthLabel(year, month),
    feeCents: fee ?? 0,
    pendingNames: status.pending.map((p) => p.name),
    pixKey: settings.pix_key ?? '(configure a chave PIX em /admin/config)',
  })

  return (
    <main className="flex flex-col gap-4 p-3">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">🔒 Admin · {monthLabel(year, month)}</h1>
        <nav className="flex gap-3 text-xs font-semibold text-green-700">
          <Link href="/admin/jogadores">Jogadores</Link>
          <Link href="/admin/config">Config</Link>
          <Link href="/">Sair p/ app</Link>
        </nav>
      </header>

      {!monthRow && (
        <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-800">
          Mês sem nº de jogos definido — configure em /admin/config para calcular a mensalidade.
        </p>
      )}

      <EntryForm
        refs={{
          players: allPlayers.map((p) => ({ id: p.id, name: p.name })),
          events: eventsList.map((ev) => ({ id: ev.id, name: ev.name })),
          year, month,
          defaultFee: centsToInput(fee),
          defaultAvulso: centsToInput(yearCfg?.avulsoFeeCents ?? null),
        }}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Cobrança — {status.pending.length} pendentes</h2>
        <pre className="mb-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs">{cobranca}</pre>
        <CopyButton text={cobranca} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold">Lançamentos do mês</h2>
        <EntryList rows={rows} />
      </section>
    </main>
  )
}
```

- [ ] **Step 5: Verificar manualmente**

`npm run dev` → login em `/admin/login` → criar lançamento mensal (valor pré-preenchido), tentar duplicar (aviso + confirmar), excluir, copiar cobrança e colar em algum lugar.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/page.tsx src/components/entry-form.tsx src/components/entry-list.tsx src/components/copy-button.tsx
git commit -m "feat: admin de lancamentos com formulario classico e cobranca copiavel"
```

---

### Task 17: Admin — jogadores + configurações

**Files:**
- Create: `src/app/admin/jogadores/page.tsx`, `src/components/player-toggle.tsx`, `src/app/admin/config/page.tsx`

- [ ] **Step 1: Toggle de mensalista (client)**

Create `src/components/player-toggle.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { togglePlayerActive } from '@/app/admin/actions'

export function PlayerToggle({ id, active }: { id: number; active: boolean }) {
  const [pending, start] = useTransition()
  return (
    <button
      disabled={pending}
      onClick={() => start(() => togglePlayerActive(id, !active).then(() => {}))}
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {active ? 'Mensalista ✓' : 'Inativo'}
    </button>
  )
}
```

- [ ] **Step 2: Página de jogadores**

Create `src/app/admin/jogadores/page.tsx`:

```tsx
import Link from 'next/link'
import { createPlayer } from '@/app/admin/actions'
import { PlayerToggle } from '@/components/player-toggle'
import { getAllPlayers } from '@/db/queries'

export const dynamic = 'force-dynamic'

export default async function JogadoresPage() {
  const list = await getAllPlayers()
  return (
    <main className="flex flex-col gap-4 p-3">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Jogadores ({list.length})</h1>
        <Link href="/admin" className="text-xs font-semibold text-green-700">← Admin</Link>
      </header>

      <form action={async (fd) => { 'use server'; await createPlayer(fd) }} className="flex gap-2">
        <input name="name" required placeholder="Nome do jogador"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <label className="flex items-center gap-1 text-xs font-semibold">
          <input type="checkbox" name="isMonthlyActive" value="true" /> Mensalista
        </label>
        <button className="rounded-lg bg-green-600 px-4 text-sm font-bold text-white">Add</button>
      </form>

      <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {list.map((p) => (
          <li key={p.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="font-semibold">{p.name}</span>
            <PlayerToggle id={p.id} active={p.isMonthlyActive} />
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 3: Página de configurações**

Create `src/app/admin/config/page.tsx`:

```tsx
import Link from 'next/link'
import {
  createEvent, createShirt, saveSetting, upsertMonth, upsertMonthlyFee, upsertYearSettings,
} from '@/app/admin/actions'
import {
  getAllMonths, getAllPlayers, getAllYearSettings, getEvents, getFeeTable, getSettingsMap,
} from '@/db/queries'
import { currentYearMonth } from '@/lib/dates'
import { formatBRL } from '@/lib/money'

export const dynamic = 'force-dynamic'

const inputCls = 'rounded-lg border border-slate-300 px-2 py-1.5 text-sm'
const btnCls = 'rounded-lg bg-green-600 px-3 py-1.5 text-sm font-bold text-white'

export default async function ConfigPage() {
  const { year, month } = currentYearMonth()
  const [settings, yearsCfg, feeTable, monthsList, players, eventsList] = await Promise.all([
    getSettingsMap(), getAllYearSettings(), getFeeTable(), getAllMonths(), getAllPlayers(), getEvents(),
  ])

  return (
    <main className="flex flex-col gap-5 p-3">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Configurações</h1>
        <Link href="/admin" className="text-xs font-semibold text-green-700">← Admin</Link>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Grupo e PIX</h2>
        {(['group_name', 'pix_key'] as const).map((key) => (
          <form key={key} action={async (fd) => { 'use server'; await saveSetting(fd) }} className="mb-2 flex gap-2">
            <input type="hidden" name="key" value={key} />
            <input name="value" defaultValue={settings[key] ?? ''} className={`flex-1 ${inputCls}`}
              placeholder={key === 'group_name' ? 'Nome do grupo' : 'Chave PIX'} />
            <button className={btnCls}>Salvar</button>
          </form>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Jogos do mês atual ({String(month).padStart(2, '0')}/{year})</h2>
        <form action={async (fd) => { 'use server'; await upsertMonth(fd) }} className="flex gap-2">
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <input name="gamesCount" type="number" min={1} max={6}
            defaultValue={monthsList.find((m) => m.year === year && m.month === month)?.gamesCount ?? 4}
            className={`w-20 ${inputCls}`} />
          <button className={btnCls}>Salvar</button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Preços do ano (reajuste)</h2>
        <form action={async (fd) => { 'use server'; await upsertYearSettings(fd) }} className="grid grid-cols-2 gap-2">
          <input name="year" type="number" defaultValue={year} className={inputCls} />
          <input name="avulsoFee" placeholder="Avulso (25,00)" required className={inputCls} />
          <input name="courtFeePerGame" placeholder="Quadra/jogo (240,00)" required className={inputCls} />
          <input name="goalkeeperFeePerGame" placeholder="Goleiro/jogo (45,00)" required className={inputCls} />
          <button className={`col-span-2 ${btnCls}`}>Salvar preços do ano</button>
        </form>
        <ul className="mt-2 text-xs text-slate-500">
          {yearsCfg.map((y) => (
            <li key={y.year}>
              {y.year}: avulso {formatBRL(y.avulsoFeeCents)} · quadra {formatBRL(y.courtFeePerGameCents)}/jogo · goleiro {formatBRL(y.goalkeeperFeePerGameCents)}/jogo
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Mensalidade por nº de jogos</h2>
        <form action={async (fd) => { 'use server'; await upsertMonthlyFee(fd) }} className="flex gap-2">
          <input name="year" type="number" defaultValue={year} className={`w-20 ${inputCls}`} />
          <input name="gamesCount" type="number" min={1} max={6} placeholder="Jogos" required className={`w-16 ${inputCls}`} />
          <input name="fee" placeholder="75,00" required className={`flex-1 ${inputCls}`} />
          <button className={btnCls}>Salvar</button>
        </form>
        <ul className="mt-2 text-xs text-slate-500">
          {feeTable.map((f) => (
            <li key={`${f.year}-${f.gamesCount}`}>{f.year} · {f.gamesCount} jogos → {formatBRL(f.feeCents)}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Novo evento</h2>
        <form action={async (fd) => { 'use server'; await createEvent(fd) }} className="flex gap-2">
          <input name="name" required placeholder="Churrasco de fim de ano" className={`flex-1 ${inputCls}`} />
          <input name="date" type="date" className={inputCls} />
          <button className={btnCls}>Criar</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">{eventsList.length} eventos cadastrados.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold">Novo pedido de camisa</h2>
        <form action={async (fd) => { 'use server'; await createShirt(fd) }} className="grid grid-cols-2 gap-2">
          <select name="playerId" required className={inputCls}>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select name="size" required className={inputCls}>
            {['P', 'M', 'G', 'GG'].map((s) => <option key={s}>{s}</option>)}
          </select>
          <input name="value" placeholder="120,00" required className={inputCls} />
          <input name="note" placeholder="Obs (opcional)" className={inputCls} />
          <button className={`col-span-2 ${btnCls}`}>Criar pedido</button>
        </form>
      </section>
    </main>
  )
}
```

- [ ] **Step 4: Verificar manualmente**

`npm run dev` → `/admin/config`: salvar nome do grupo, PIX, preços 2026 (avulso 25, quadra 240, goleiro 45), mensalidades (4→75, 5→85), jogos do mês. `/admin/jogadores`: criar jogador, alternar mensalista. Conferir reflexo no `/`.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/jogadores src/app/admin/config src/components/player-toggle.tsx
git commit -m "feat: admin de jogadores e configuracoes (precos, mes, eventos, camisas, settings)"
```

---

### Task 18: Script de importação do histórico

**Files:**
- Create: `scripts/import.ts`
- Test: já coberto por `src/lib/normalize.test.ts`; validação por totais no próprio script

O script roda em duas fases: **dry-run** (default — só imprime o relatório) e `--write` (grava). Fonte: `planilha-controle-futebol.xlsx` na raiz.

- [ ] **Step 1: Implementar o script**

Create `scripts/import.ts`:

```ts
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
  { name: 'Samuka', aliases: ['Samuca'] },
  { name: 'Tio Valdo', aliases: ['Tio Waldo'] },
  { name: 'Brandão', aliases: ['Brandao'] },
  { name: 'Gui', aliases: ['Guilhere', 'Guilherme'] },
  { name: 'Matheuszinho', aliases: [] },
  // demais nomes entram automaticamente como canônicos na 1ª ocorrência
]

const NON_PLAYER_NAMES = new Set([
  'quadra', 'goleiro', 'goleiro (app)', 'churrasqueira', 'carne', 'pagamentos', 'compra',
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
      raw.push({ name, amountCents, ...ym, type, description: type === 'quadra' || type === 'goleiro' ? tipo || name : null })
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
```


- [ ] **Step 2: Dry-run e ajuste de aliases**

Run: `npx tsx scripts/import.ts`
Expected: relatório com contagens por aba, lista de nomes auto-canonizados e totais por mês. **Revisar com o usuário** a lista de nomes (ex: decidir se "Leandrinho"≠"Leandro Melo", "Marcelo"≠"Marcelo Machado") e completar `PLAYER_ALIASES`. Repetir o dry-run até a lista estar limpa.

- [ ] **Step 3: Gravar e validar**

Run: `npx tsx scripts/import.ts --write`
Expected: `VALIDAÇÃO — ... diff: 0` (diferenças de camisas contadas 1x explicam diff ≠ 0 — investigar antes de seguir).
Conferir `/historico` e `/` no navegador com os dados reais.

- [ ] **Step 4: Marcar mensalistas ativos**

Em `/admin/jogadores`, ativar os mensalistas atuais (lista de 06/2026 da planilha).

- [ ] **Step 5: Commit**

```bash
git add scripts/import.ts
git commit -m "feat: script de importacao do historico da planilha (dry-run + write + validacao)"
```

---

### Task 19: PWA, build final e README

**Files:**
- Create: `src/app/manifest.ts`, `public/icon.svg`, `README.md`

- [ ] **Step 1: Manifest PWA**

Create `src/app/manifest.ts`:

```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Controle Futebol',
    short_name: 'Futebol',
    description: 'Controle financeiro da pelada',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#16a34a',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
```

Create `public/icon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#16a34a"/>
  <text x="50" y="68" font-size="52" text-anchor="middle">⚽</text>
</svg>
```

- [ ] **Step 2: README**

Create `README.md`:

```markdown
# Controle Futebol

Controle financeiro da pelada — substitui a planilha do Google Sheets.

## Rodar local
1. `.env.local` com `DATABASE_URL` (Neon), `ADMIN_PASSWORD`, `AUTH_SECRET`
2. `npm install && npx drizzle-kit push`
3. `npm run dev`

## Importar histórico da planilha
`npx tsx scripts/import.ts` (dry-run) → ajustar aliases → `--write`

## Testes
`npm test`

## Deploy
Vercel + Neon (Marketplace). Configurar as 3 env vars no projeto.

Spec: `docs/superpowers/specs/2026-06-05-controle-futebol-design.md`
```

- [ ] **Step 3: Suite completa + build**

Run: `npm test` → Expected: PASS (todas as suites de `src/lib` e `src/auth`).
Run: `npm run build` → Expected: build sem erros.

- [ ] **Step 4: Smoke manual completo**

`npm run dev`: percorrer `/`, `/eventos`, `/camisas`, `/historico`, login, lançamento, cobrança, config. Instalar como PWA no celular (mesma rede) se possível.

- [ ] **Step 5: Commit**

```bash
git add src/app/manifest.ts public/icon.svg README.md
git commit -m "feat: manifest PWA, icone e README"
```

---

## Deploy (pós-plano, com o usuário)

1. `vercel link` + criar projeto
2. Neon via Marketplace (ou usar o DATABASE_URL existente) + `ADMIN_PASSWORD`/`AUTH_SECRET` em env vars
3. `vercel deploy --prod` (ou skill `vercel:deploy`)
4. Compartilhar o link no grupo 🎉



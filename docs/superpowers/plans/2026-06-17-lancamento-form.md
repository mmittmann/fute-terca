# Melhorias no Formulário de Lançamento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Melhorar o formulário "Novo lançamento": toggle Despesa/Receita (valor sempre positivo p/ mobile), troca de categoria não-destrutiva, campo "Jogo" (terça) e adicionar jogador inline no combobox.

**Architecture:** Toda a UI vive em `EntryForm`. Lógica pura (opções de terça, sinal×categoria) sai pra `lib/` com testes. Coluna nova `game_date` (nullable) em `entries`. As actions ganham `gameDate` (em `createEntry`) e retorno do jogador criado (em `createPlayer`).

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Drizzle ORM + Postgres, Zod, Vitest, Tailwind v4.

---

## File Structure

- **Create:** `src/lib/game-options.ts` (+ `.test.ts`) — opções de terça e default.
- **Modify:** `src/lib/entry-sign.ts` (+ `.test.ts`) — helpers de sinal×categoria.
- **Modify:** `src/db/schema.ts` — coluna `game_date`.
- **Modify:** `src/app/admin/actions.ts` — `createEntry` (gameDate), `createPlayer` (retorna player).
- **Modify:** `src/components/player-combobox.tsx` — prop `onCreate` + botão "+ Adicionar".
- **Modify:** `src/components/entry-form.tsx` — toggle de sinal, valor positivo, `pickType` não-destrutivo, campo Jogo, jogadores em estado + `onCreate`.
- **Modify:** `src/components/entry-list.tsx` — exibir `gameDate`.
- **Modify:** `src/app/admin/page.tsx` — calcular `gameOptions`/`defaultGame` e passar `gameDate` nas rows.

---

## Task 1: Helper de opções de terça (`lib/game-options.ts`)

**Files:**
- Create: `src/lib/game-options.ts`
- Test: `src/lib/game-options.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/game-options.test.ts
import { describe, expect, it } from 'vitest'
import { defaultGameValue, tuesdayOptions } from './game-options'

describe('tuesdayOptions', () => {
  it('lista as terças de junho/2026 como value YYYY-MM-DD e label dd/mm', () => {
    const opts = tuesdayOptions(2026, 6)
    expect(opts.map((o) => o.value)).toEqual([
      '2026-06-02', '2026-06-09', '2026-06-16', '2026-06-23', '2026-06-30',
    ])
    expect(opts[0].label).toBe('02/06')
  })
})

describe('defaultGameValue', () => {
  it('escolhe a próxima terça >= hoje quando é o mês atual', () => {
    expect(defaultGameValue(2026, 6, 17)).toBe('2026-06-23')
  })
  it('cai na última terça se hoje já passou da última', () => {
    expect(defaultGameValue(2026, 6, 28)).toBe('2026-06-30')
  })
  it('usa a última terça quando não é o mês atual (todayDay null)', () => {
    expect(defaultGameValue(2026, 6, null)).toBe('2026-06-30')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/game-options.test.ts`
Expected: FAIL (Cannot find module './game-options').

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/game-options.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/game-options.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/game-options.ts src/lib/game-options.test.ts
git commit -m "feat: helper de opções de terça (game-options) p/ campo Jogo"
```

---

## Task 2: Helpers de sinal × categoria (`lib/entry-sign.ts`)

**Files:**
- Modify: `src/lib/entry-sign.ts`
- Test: `src/lib/entry-sign.test.ts` (já existe; adicionar casos)

- [ ] **Step 1: Write the failing test** (anexar ao arquivo de teste existente)

```ts
// src/lib/entry-sign.test.ts  (adicionar imports e blocos)
import { categoryAfterSignChange, signForType } from './entry-sign'

describe('signForType', () => {
  it('mensal e avulso são receita', () => {
    expect(signForType('mensal')).toBe('receita')
    expect(signForType('avulso')).toBe('receita')
  })
  it('quadra e goleiro são despesa', () => {
    expect(signForType('quadra')).toBe('despesa')
    expect(signForType('goleiro')).toBe('despesa')
  })
  it('evento, camisa e outro aceitam qualquer sinal (null)', () => {
    expect(signForType('evento')).toBeNull()
    expect(signForType('camisa')).toBeNull()
    expect(signForType('outro')).toBeNull()
  })
})

describe('categoryAfterSignChange', () => {
  it('vira para outro quando o novo sinal é incompatível com a categoria', () => {
    expect(categoryAfterSignChange('mensal', 'despesa')).toBe('outro')
    expect(categoryAfterSignChange('quadra', 'receita')).toBe('outro')
  })
  it('mantém a categoria quando o sinal é compatível', () => {
    expect(categoryAfterSignChange('mensal', 'receita')).toBe('mensal')
    expect(categoryAfterSignChange('quadra', 'despesa')).toBe('quadra')
  })
  it('mantém categorias flexíveis em qualquer sinal', () => {
    expect(categoryAfterSignChange('evento', 'despesa')).toBe('evento')
    expect(categoryAfterSignChange('outro', 'receita')).toBe('outro')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/entry-sign.test.ts`
Expected: FAIL (signForType/categoryAfterSignChange não exportados).

- [ ] **Step 3: Write minimal implementation** (anexar ao fim de `src/lib/entry-sign.ts`)

```ts
export type Sign = 'despesa' | 'receita'

/** Sinal obrigatório de uma categoria, ou null se aceita qualquer sinal. */
export function signForType(type: string): Sign | null {
  if (type === 'mensal' || type === 'avulso') return 'receita'
  if (type === 'quadra' || type === 'goleiro') return 'despesa'
  return null
}

/** Ao virar o toggle: mantém a categoria se compatível; senão cai em 'outro'. */
export function categoryAfterSignChange(type: string, sign: Sign): string {
  const req = signForType(type)
  return req && req !== sign ? 'outro' : type
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/entry-sign.test.ts`
Expected: PASS (testes antigos + novos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/entry-sign.ts src/lib/entry-sign.test.ts
git commit -m "feat: helpers signForType e categoryAfterSignChange"
```

---

## Task 3: Coluna `game_date` em `entries`

**Files:**
- Modify: `src/db/schema.ts:41-51` (tabela `entries`)

- [ ] **Step 1: Adicionar a coluna ao schema**

Em `src/db/schema.ts`, dentro de `export const entries = pgTable('entries', { ... })`, adicionar a coluna após `description`:

```ts
  description: text('description'),
  gameDate: date('game_date'), // terça do jogo (opcional); null = sem jogo específico
  createdAt: timestamp('created_at').notNull().defaultNow(),
```

(`date` já está importado em `src/db/schema.ts:2`.)

- [ ] **Step 2: Aplicar no banco local**

Run: `npx drizzle-kit push`
Expected: prompt/diff adicionando a coluna `game_date` em `entries`; confirmar. Saída termina sem erro.

- [ ] **Step 3: Verificar a coluna**

Run: `npx tsx -e "import 'dotenv/config'; import { sql } from 'drizzle-orm'; import { db } from './src/db/client'; const r = await db.execute(sql\`SELECT column_name FROM information_schema.columns WHERE table_name='entries' AND column_name='game_date'\`); console.log(r.rows); process.exit(0)"`
Expected: `[ { column_name: 'game_date' } ]`

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: coluna game_date (nullable) em entries"
```

> **Produção (manual, no Postgres do Coolify, junto do deploy):** `ALTER TABLE entries ADD COLUMN game_date date;`

---

## Task 4: Actions — `gameDate` em `createEntry` e retorno do player em `createPlayer`

**Files:**
- Modify: `src/app/admin/actions.ts:20-63` (entrySchema + createEntry), `:79-91` (createPlayer)

- [ ] **Step 1: Adicionar `gameDate` ao `entrySchema`**

Em `src/app/admin/actions.ts`, no `entrySchema`, adicionar antes de `confirmed`:

```ts
  description: z.string().trim().max(200).optional(),
  gameDate: z.string().optional(), // 'YYYY-MM-DD' ou '' (sem jogo)
  confirmed: z.literal('true').transform(() => true).optional(),
```

- [ ] **Step 2: Gravar `gameDate` no insert do `createEntry`**

Em `createEntry`, alterar o `db.insert(entries).values({...})`:

```ts
  await db.insert(entries).values({
    year: d.year, month: d.month, type: d.type, amountCents,
    playerId: d.playerId ?? null, eventId: d.eventId ?? null,
    description: d.description || null,
    gameDate: d.gameDate || null,
  })
```

- [ ] **Step 3: Fazer `createPlayer` retornar o jogador criado**

Adicionar o tipo (perto de `ActionResult`, linha ~14):

```ts
export type CreatePlayerResult =
  | { ok: true; player: { id: number; name: string } }
  | { ok: false; error: string }
```

Substituir a função `createPlayer` inteira por:

```ts
export async function createPlayer(formData: FormData): Promise<CreatePlayerResult> {
  await requireAdmin()
  const parsed = playerSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: 'Nome inválido' }
  const rows = await db
    .insert(players)
    .values({ name: parsed.data.name })
    .onConflictDoNothing()
    .returning({ id: players.id })
  if (rows.length === 0) return { ok: false, error: 'Jogador já existe' }
  revalidateAll()
  return { ok: true, player: { id: rows[0].id, name: parsed.data.name } }
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros novos (o consumo de `createPlayer` em `player-form.tsx` segue válido — só usa `r.ok`/`r.error`).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/actions.ts
git commit -m "feat: createEntry grava gameDate; createPlayer retorna o jogador"
```

---

## Task 5: `PlayerCombobox` — adicionar jogador inline

**Files:**
- Modify: `src/components/player-combobox.tsx`

- [ ] **Step 1: Adicionar a prop `onCreate` à assinatura**

Em `PlayerCombobox`, adicionar `onCreate` aos props:

```tsx
export function PlayerCombobox({
  players,
  value,
  onChange,
  onCreate,
  placeholder = 'Buscar jogador…',
}: {
  players: PlayerOption[]
  value: number | null
  onChange: (id: number | null) => void
  onCreate?: (name: string) => Promise<PlayerOption | null>
  placeholder?: string
}) {
```

- [ ] **Step 2: Substituir o bloco "nenhum jogador encontrado" pelo botão de criar**

Trocar o bloco atual (linhas ~126-130, o `div` "Nenhum jogador encontrado.") por:

```tsx
      {open && query.trim() && filtered.length === 0 && (
        <div
          className="absolute z-20 mt-1.5 w-full rounded-xl border border-line bg-card p-1 shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
          onMouseDown={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current)
          }}
        >
          {onCreate ? (
            <button
              type="button"
              onClick={async () => {
                const created = await onCreate(query.trim())
                if (created) choose(created)
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm font-bold text-volt transition hover:text-ink"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-volt/40 bg-pitch text-base leading-none text-volt">
                +
              </span>
              Adicionar “{query.trim()}”
            </button>
          ) : (
            <div className="px-3 py-2.5 text-sm text-moss">Nenhum jogador encontrado.</div>
          )}
        </div>
      )}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros (prop opcional; uso atual sem `onCreate` segue válido).

- [ ] **Step 4: Commit**

```bash
git add src/components/player-combobox.tsx
git commit -m "feat: PlayerCombobox com adicionar jogador inline (onCreate)"
```

---

## Task 6: `EntryForm` — toggle de sinal, valor positivo, pickType não-destrutivo, campo Jogo, onCreate

**Files:**
- Modify: `src/components/entry-form.tsx` (reescrita do componente)

- [ ] **Step 1: Substituir o conteúdo de `src/components/entry-form.tsx` por:**

```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { createEntry, createPlayer, type ActionResult } from '@/app/admin/actions'
import { PlayerCombobox, type PlayerOption } from '@/components/player-combobox'
import { categoryAfterSignChange, signForType, type Sign } from '@/lib/entry-sign'
import { guessEntryType, type GuessConfig } from '@/lib/guess-type'
import { parseToCents } from '@/lib/money'

const TYPES = [
  ['mensal', 'Mensal'], ['avulso', 'Avulso'], ['quadra', 'Quadra'], ['goleiro', 'Goleiro'],
  ['evento', 'Evento'], ['camisa', 'Camisa'], ['outro', 'Outro'],
] as const

export interface FormRefs {
  players: { id: number; name: string }[]
  events: { id: number; name: string }[]
  year: number
  month: number
  defaultFee: string // ex: "75,00" — pré-preenche no tipo mensal (só se vazio)
  defaultAvulso: string
  guessConfig: GuessConfig
  gameOptions: { value: string; label: string }[]
  defaultGame: string // value 'YYYY-MM-DD' da terça default
}

export function EntryForm({ refs }: { refs: FormRefs }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [sign, setSign] = useState<Sign>('receita')
  const [type, setType] = useState<string>('mensal')
  const [amount, setAmount] = useState(refs.defaultFee)
  const [playerId, setPlayerId] = useState<number | null>(null)
  const [gameDate, setGameDate] = useState(refs.defaultGame)
  const [players, setPlayers] = useState<PlayerOption[]>(refs.players)
  const [autoType, setAutoType] = useState(false) // tipo veio do valor digitado
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err' | 'confirm'; text: string } | null>(null)
  const [pending, start] = useTransition()

  // valor com sinal (despesa = negativo) p/ detecção e envio
  function signedCents(magnitude: string, s: Sign): number | null {
    const cents = parseToCents(magnitude)
    if (cents === null) return null
    return s === 'despesa' ? -Math.abs(cents) : Math.abs(cents)
  }

  function onAmountChange(v: string) {
    const clean = v.replace(/-/g, '') // campo é só magnitude positiva
    setAmount(clean)
    const cents = signedCents(clean, sign)
    if (cents !== null) {
      const guess = guessEntryType(cents, refs.guessConfig)
      if (guess) {
        setType(guess)
        setAutoType(true)
      }
    }
  }

  function pickSign(s: Sign) {
    setSign(s)
    const cents = signedCents(amount, s)
    if (cents !== null) {
      // valor presente: redetecta categoria com o novo sinal (nunca incompatível)
      const guess = guessEntryType(cents, refs.guessConfig)
      setType(guess ?? categoryAfterSignChange(type, s))
      setAutoType(!!guess)
    } else {
      setType(categoryAfterSignChange(type, s))
    }
  }

  function pickType(t: string) {
    setType(t)
    setAutoType(false)
    const req = signForType(t)
    if (req) setSign(req)
    // sugere a taxa só quando o valor está vazio (nunca sobrescreve)
    if (amount === '') {
      if (t === 'mensal') setAmount(refs.defaultFee)
      else if (t === 'avulso') setAmount(refs.defaultAvulso)
    }
  }

  function reset() {
    formRef.current?.reset()
    setSign('receita')
    setType('mensal')
    setAmount(refs.defaultFee)
    setPlayerId(null)
    setGameDate(refs.defaultGame)
    setAutoType(false)
  }

  async function onCreatePlayer(name: string): Promise<PlayerOption | null> {
    const fd = new FormData()
    fd.set('name', name)
    const r = await createPlayer(fd)
    if (r.ok) {
      const opt = { id: r.player.id, name: r.player.name }
      setPlayers((prev) => [...prev, opt])
      return opt
    }
    // conflito (acento/maiúscula): seleciona o existente
    return players.find((p) => p.name.toLowerCase() === name.toLowerCase()) ?? null
  }

  function submit(formData: FormData, confirmed = false) {
    formData.set('amount', sign === 'despesa' ? `-${amount}` : amount)
    if (confirmed) formData.set('confirmed', 'true')
    start(async () => {
      const r: ActionResult = await createEntry(formData)
      if (r.ok) {
        setMsg({ kind: 'ok', text: 'Lançamento salvo ✓' })
        reset()
      } else if (r.needsConfirm) {
        setMsg({ kind: 'confirm', text: r.error })
      } else {
        setMsg({ kind: 'err', text: r.error })
      }
    })
  }

  return (
    <form ref={formRef} action={(fd) => submit(fd)} className="card flex flex-col gap-3.5 p-4">
      <h2 className="label">Novo lançamento · {String(refs.month).padStart(2, '0')}/{refs.year}</h2>
      <input type="hidden" name="year" value={refs.year} />
      <input type="hidden" name="month" value={refs.month} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="playerId" value={playerId ?? ''} />
      <input type="hidden" name="gameDate" value={gameDate} />

      {/* Despesa / Receita — define o sinal (valor digitado é sempre positivo) */}
      <div className="grid grid-cols-2 gap-1.5">
        {(['despesa', 'receita'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => pickSign(s)}
            className={`rounded-xl border px-3 py-2 text-sm font-bold uppercase tracking-wide transition ${
              sign === s
                ? s === 'despesa'
                  ? 'border-clay bg-clay text-pitch'
                  : 'border-volt bg-volt text-pitch'
                : 'border-line bg-transparent text-moss hover:text-ink'
            }`}
          >
            {s === 'despesa' ? 'Despesa' : 'Receita'}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="label">Valor</span>
        <input
          name="amount" value={amount} onChange={(e) => onAmountChange(e.target.value)} required
          inputMode="decimal" placeholder="75,00"
          className="input mt-1.5 font-display tracking-wide"
        />
      </label>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label">Categoria</span>
          {autoType && <span className="text-[10px] font-bold text-volt">detectado pelo valor</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => pickType(val)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                type === val
                  ? 'border-volt bg-volt text-pitch shadow-[0_0_12px_rgba(198,245,66,0.3)]'
                  : 'border-line bg-transparent text-moss hover:border-moss/60 hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="label">Jogador (opcional p/ quadra e goleiro)</span>
        <div className="mt-1.5">
          <PlayerCombobox players={players} value={playerId} onChange={setPlayerId} onCreate={onCreatePlayer} />
        </div>
      </label>

      <label className="block">
        <span className="label">Jogo (terça)</span>
        <select name="gameDateSelect" value={gameDate} onChange={(e) => setGameDate(e.target.value)} className="input mt-1.5">
          <option value="">— (sem jogo)</option>
          {refs.gameOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      {type === 'evento' && (
        <label className="block">
          <span className="label">Evento</span>
          <select name="eventId" className="input mt-1.5">
            <option value="">—</option>
            {refs.events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        </label>
      )}

      <label className="block">
        <span className="label">Descrição (opcional)</span>
        <input name="description" className="input mt-1.5" />
      </label>

      {msg && (
        <p className={`text-xs font-bold ${msg.kind === 'ok' ? 'text-volt' : 'text-clay'}`}>
          {msg.text}
          {msg.kind === 'confirm' && (
            <button
              type="button"
              onClick={() => formRef.current && submit(new FormData(formRef.current), true)}
              className="ml-2 rounded-lg bg-clay px-2.5 py-1 font-extrabold text-pitch"
            >
              Confirmar
            </button>
          )}
        </p>
      )}

      <button disabled={pending} className="btn-volt">
        Salvar lançamento
      </button>
    </form>
  )
}
```

> Nota: o `gameDate` é enviado pelo `<input type="hidden" name="gameDate">` (controlado pelo estado). O `<select name="gameDateSelect">` é só UI e não é lido pela action (evita campo duplicado no FormData).

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/components/entry-form.tsx
git commit -m "feat: EntryForm com toggle despesa/receita, valor positivo, categoria nao-destrutiva, campo Jogo e add jogador inline"
```

---

## Task 7: Exibir `gameDate` na lista e alimentar `EntryForm` no `AdminPage`

**Files:**
- Modify: `src/components/entry-list.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: `EntryRow` ganha `gameDate` e a lista exibe a data**

Em `src/components/entry-list.tsx`, alterar a interface e o render:

```tsx
export interface EntryRow {
  id: number
  label: string
  type: string
  amountCents: number
  gameDate?: string | null // 'YYYY-MM-DD'
}
```

Adicionar o helper (topo do arquivo, após os imports):

```tsx
function ddmm(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}
```

No `<li>`, dentro do primeiro `<span>` (o que tem label + badge de tipo), adicionar o badge de jogo após o badge de tipo:

```tsx
          <span className="shrink-0 rounded-md border border-line bg-pitch px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-moss">
            {r.type}
          </span>
          {r.gameDate && (
            <span className="shrink-0 rounded-md border border-line/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-moss/80">
              {ddmm(r.gameDate)}
            </span>
          )}
```

- [ ] **Step 2: `AdminPage` calcula opções/default de jogo e passa `gameDate` nas rows**

Em `src/app/admin/page.tsx`:

Adicionar import (junto dos outros de `@/lib`):

```tsx
import { defaultGameValue, tuesdayOptions } from '@/lib/game-options'
```

Dentro de `AdminPage`, após `const { year, month } = currentYearMonth()`, calcular o "hoje" em SP e as opções:

```tsx
  const spYmd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  const [spY, spM, spD] = spYmd.split('-').map(Number)
  const todayDay = spY === year && spM === month ? spD : null
  const gameOptions = tuesdayOptions(year, month)
  const defaultGame = defaultGameValue(year, month, todayDay)
```

Passar os novos campos no `refs` do `<EntryForm>` (adicionar às props já existentes):

```tsx
            refs={{
              players: allPlayers.map((p) => ({ id: p.id, name: p.name })),
              events: eventsList.map((ev) => ({ id: ev.id, name: ev.name })),
              year, month,
              defaultFee: centsToInput(fee),
              defaultAvulso: centsToInput(yearCfg?.avulsoFeeCents ?? null),
              guessConfig,
              gameOptions,
              defaultGame,
            }}
```

Incluir `gameDate` nas rows (no `.map` que monta `rows`):

```tsx
  const rows: EntryRow[] = monthEntries.map((e) => ({
    id: e.id,
    label: e.playerId ? (nameById.get(e.playerId) ?? '?') : (e.description ?? e.type),
    type: e.type,
    amountCents: e.amountCents,
    gameDate: e.gameDate,
  }))
```

- [ ] **Step 3: Verificar tipos e build**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/entry-list.tsx src/app/admin/page.tsx
git commit -m "feat: exibe data do jogo na lista e alimenta EntryForm com opcoes de terca"
```

---

## Task 8: Verificação final

- [ ] **Step 1: Suite de testes completa**

Run: `npm test`
Expected: todos os testes passam (inclui os novos de game-options e entry-sign).

- [ ] **Step 2: Build de produção**

Run: `npm run build`
Expected: `Compiled successfully`, TypeScript OK, rotas geradas sem erro.

- [ ] **Step 3: Verificação manual (dev)**

Run: `npm run dev` e em `/admin` (logado), conferir:
- Toggle Despesa/Receita muda o sinal; valor permanece positivo no campo.
- Digitar um valor detecta a categoria; trocar o chip de categoria **não** apaga o valor.
- Selecionar Despesa numa categoria de receita (ex.: mensal) → categoria vira "outro".
- Campo "Jogo" lista as terças do mês, default na terça correta; salvar e ver a data na lista.
- No combobox, digitar um nome novo → "+ Adicionar «…»" cria e seleciona.

- [ ] **Step 4: (não commitar nada novo aqui)** — fim do plano.

---

## Self-Review (preenchido pelo autor do plano)

- **Cobertura da spec:** A→Tasks 2,6; B→Task 6 (pickType); C→Tasks 1,3,4,6,7; D→Tasks 4,5,6. ✅
- **Sem placeholders:** todo passo tem código/comando concreto. ✅
- **Consistência de tipos:** `Sign`, `signForType`, `categoryAfterSignChange` (Task 2) usados igual na Task 6; `CreatePlayerResult.player` (Task 4) consumido em `onCreatePlayer` (Task 6); `PlayerOption` exportado pelo combobox; `gameDate`/`gameOptions`/`defaultGame` casam entre Tasks 6 e 7. ✅

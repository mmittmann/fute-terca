# Melhorias no formulário de lançamento

**Data:** 2026-06-17
**Status:** aprovado (design)
**Componente central:** `src/components/entry-form.tsx`

## Contexto e problema

O formulário "Novo lançamento" (`EntryForm`) tem 4 problemas/lacunas de experiência:

1. **Categoria sobrescreve o valor.** Ao clicar num chip de categoria, `pickType` reescreve o campo de valor com a taxa padrão — apagando o que o admin digitou.
2. **Mobile sem sinal de menos.** O campo de valor usa teclado decimal, que no celular não tem o "−". Resultado: só dá pra lançar valor positivo (receita); despesas são impossíveis no mobile.
3. **Não dá pra saber de qual jogo (terça) foi o lançamento.** Hoje o lançamento guarda só `ano+mês`.
4. **Adicionar jogador exige sair do fluxo.** O combobox só busca jogadores existentes; cadastrar um novo obriga a ir até `/admin/jogadores` e voltar.

Regras de sinal existentes (`src/lib/entry-sign.ts`), que o design preserva:
- `mensal`, `avulso` → receita (valor **positivo**)
- `quadra`, `goleiro` → despesa (valor **negativo**)
- `evento`, `camisa`, `outro` → qualquer sinal

## A. Toggle Despesa/Receita + valor sempre positivo

**UI:** toggle de duas opções (`Despesa` | `Receita`) no topo do formulário. O campo de valor passa a aceitar/exibir **apenas magnitude positiva**.

**Estado novo no `EntryForm`:** `sign: 'despesa' | 'receita'` (default `'receita'`).

**Composição do valor enviado:** no submit, `amountCents = (sign === 'despesa' ? -1 : 1) * parseToCents(amount)`. O formulário transforma o `amount` (positivo) em string com sinal antes de chamar a action, mantendo `createEntry` praticamente inalterado (continua fazendo `parseToCents`).

**Detecção de categoria (`guessEntryType`):** passa a rodar sobre o valor **já com o sinal do toggle**. Isso desambigua valores que existem nos dois lados (ex.: 25,00 receita → `avulso`; 45,00 despesa → `goleiro`). Continua sendo palpite não-destrutivo (mostra o hint "detectado pelo valor"). Reexecuta quando o valor **ou** o toggle muda.

**Regra de consistência sinal × categoria** (garante que `signError` nunca dispare e evita estado contraditório):
- Selecionar `mensal`/`avulso` → força `sign = 'receita'`.
- Selecionar `quadra`/`goleiro` → força `sign = 'despesa'`.
- Selecionar `evento`/`camisa`/`outro` → mantém o `sign` atual.
- Virar o toggle para um sinal **incompatível** com a categoria atual (ex.: estava em `mensal` e clicou `Despesa`) → a categoria volta para **`outro`** (o "gasto livre").

**Default ao abrir:** `sign = 'receita'`, `type = 'mensal'`, valor pré-preenchido com a taxa mensal (ver item B).

**Defesa em profundidade:** `signError(type, amountCents)` permanece no servidor como guarda; o cliente já garante coerência.

## B. Categoria nunca sobrescreve o valor

`pickType` **deixa de mexer no valor**. A taxa sugerida (`defaultFee` para `mensal`, `defaultAvulso` para `avulso`) só é preenchida **quando o campo de valor está vazio**. Trocar de chip com um valor já digitado nunca o apaga.

## C. Campo "Jogo" (de qual terça) — `gameDate`

**Schema:** adicionar coluna `gameDate: date('game_date')` **nullable** em `entries` (`src/db/schema.ts`). Lançamentos existentes ficam com `null`.

**Migração:**
- Local: `npx drizzle-kit push`.
- Produção: `ALTER TABLE entries ADD COLUMN game_date date;` (nullable → seguro e instantâneo, executado no Postgres interno do Coolify).

**UI:** `<select>` "Jogo" com as terças do mês (`tuesdaysInMonth(year, month)` formatadas `dd/mm`) + opção `— (sem jogo)`. Valor enviado: data completa `YYYY-MM-DD` ou vazio.

**Default:** a terça mais próxima de hoje dentro do mês do formulário — a próxima terça `>= hoje` se cair no mês; senão a última terça do mês. Helper puro novo (ex.: `lib/game-options.ts`) com teste.

**Action:** `createEntry` lê `gameDate` (opcional) e grava na coluna.

**Lista (`EntryList`):** novo campo opcional `gameDate` em `EntryRow`; quando presente, exibido como badge discreto (`dd/mm`) ao lado do tipo. A query `getMonthEntries` já faz `select()` (a coluna entra automaticamente); o `AdminPage` passa `gameDate` para as `rows`.

## D. Adicionar jogador inline no combobox

**`PlayerCombobox`:** ganha prop opcional `onCreate?: (name: string) => Promise<PlayerOption | null>`. No estado "nenhum jogador encontrado", em vez do texto, renderiza um botão **"+ Adicionar «{query}»"**. Ao clicar: chama `onCreate(query)`, e se retornar um jogador, seleciona-o (`choose`).

**`EntryForm`:** passa a manter a lista de jogadores em estado (`useState(refs.players)`), implementa `onCreate`:
- chama a action de criação;
- em sucesso, faz append do novo jogador no estado e retorna a `PlayerOption`;
- se já existir (conflito por acento/maiúscula), localiza o existente na lista (case-insensitive) e o retorna em vez de erro.

**Action `createPlayer`:** passa a retornar o jogador criado:
`{ ok: true; player: { id: number; name: string } } | { ok: false; error: string }`.
O `PlayerForm` (página `/admin/jogadores`) continua funcionando — ignora `player`.

## Testes

- `lib/game-options.ts` (terças do mês como opções + default): teste unitário no padrão `lib/*.test.ts`.
- Lógica de consistência sinal × categoria: extrair função pura testável (ex.: `lib/entry-sign.ts` ganha um helper `reconcileSign(type, sign)` / `categoryForSign`) e testar.
- `signError` já tem teste; manter.
- UI (componentes) e DB não têm teste hoje — manter o padrão (sem novos testes de UI).

## Fora de escopo (YAGNI)

- Estatísticas/relatórios por jogo.
- Editar `gameDate` de lançamentos já existentes.
- Vincular `mensal` a uma terça específica (mensal cobre o mês).
- Tornar `gameDate` obrigatório.

## Arquivos afetados

- `src/db/schema.ts` — coluna `game_date`.
- `src/app/admin/actions.ts` — `createEntry` (lê `gameDate`), `createPlayer` (retorna `player`).
- `src/components/entry-form.tsx` — toggle de sinal, valor positivo, `pickType` não-destrutivo, campo Jogo, jogadores em estado + `onCreate`.
- `src/components/player-combobox.tsx` — `onCreate` + botão "+ Adicionar".
- `src/components/entry-list.tsx` — exibir `gameDate`.
- `src/app/admin/page.tsx` — passar `gameDate` nas rows.
- `src/lib/game-options.ts` (novo) + teste.
- `src/lib/entry-sign.ts` — helper de consistência + teste.

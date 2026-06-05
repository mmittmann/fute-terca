# Controle Futebol — Design Doc

**Data:** 2026-06-05
**Status:** Aprovado em brainstorming, aguardando revisão final

## Objetivo

Substituir a planilha Google Sheets de controle financeiro da pelada por um web app. A planilha hoje controla: mensalidades e avulsos (receitas), quadra e goleiro (despesas), dashboard de quem pagou no mês, eventos (churrascos) e pedidos de camisas.

## Usuários e acesso

- **Admin (Murilo)**: único usuário que escreve. Login com senha única (cookie de sessão assinado). Gerencia lançamentos, jogadores, preços, eventos e camisas.
- **Jogadores (~20-45 pessoas)**: acesso por link compartilhado no grupo de WhatsApp, **sem login**. Visão somente leitura de tudo: quem pagou, quem deve, saldo do caixa, eventos, camisas e histórico.

## Plataforma

Web app **mobile-first**, instalável como PWA (manifest + ícone; sem service worker offline na v1). Um único deploy serve as rotas públicas e a área admin.

## Stack

| Camada | Escolha |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS (componentes próprios — shadcn/ui só se surgir necessidade), gráficos com Recharts |
| Banco | Postgres (Neon via Vercel Marketplace) |
| ORM | Drizzle |
| Escritas | Server Actions com validação Zod |
| Auth | Senha de admin única → cookie de sessão assinado (sem provider externo) |
| Deploy | Vercel (free tier) |

Decisões descartadas: Supabase full (auth/RLS desnecessários — um só escritor) e Google Sheets como backend (API lenta, modelagem frágil).

## Modelo de dados

A planilha é essencialmente um livro-caixa (nome, valor, mês, tipo). O modelo central reflete isso:

### Tabelas

**`players`** — jogadores
- `id`, `name` (canônico), `aliases text[]` (variações de grafia para importação), `is_monthly_active boolean`

**`year_settings`** — preços por ano (reajuste anual = nova linha)
- `year`, `avulso_fee`, `court_fee_per_game`, `goalkeeper_fee_per_game`

**`monthly_fee_table`** — mensalidade por nº de jogos
- `year`, `games_count` (3/4/5), `fee` (ex: 2026 → 4 jogos = R$ 75, 5 jogos = R$ 85)

**`months`** — configuração do mês
- `year`, `month`, `games_count`

**`entries`** — livro-caixa central (todas as movimentações de todos os módulos)
- `id`, `year`, `month`, `player_id` (nullable — quadra/goleiro não têm jogador), `type` (`mensal | avulso | quadra | goleiro | evento | camisa | outro`), `amount` (positivo = receita, negativo = despesa), `event_id` (nullable, FK `events`), `description`, `created_at`

**`events`** — eventos/churrascos
- `id`, `name`, `date`

**`shirts`** — pedidos de camisa
- `id`, `player_id`, `size` (P/M/G/GG), `value`, `note` (ex: "as duas"), `paid_entry_id` (nullable → FK `entries` quando pago)

**`app_settings`** — configurações gerais (chave-valor)
- `key`, `value` — ex: `group_name` ("Futebol de Quinta"), `pix_key` (usada na mensagem de cobrança)

### Regras de negócio

- **Valor do mês**: `months.games_count` + `monthly_fee_table[year]` → mensalidade esperada; `games_count × court_fee_per_game` → custo previsto da quadra.
- **Pendências**: mensalistas com `is_monthly_active = true` **sem** entry `mensal` no mês = devedores (alimenta dashboard e mensagem de cobrança).
- **Saldo do caixa**: soma de todos os `entries` (todos os módulos, como na planilha).
- **Saldo por evento**: soma dos `entries` com o `event_id`.
- **Camisas**: total arrecadado (entries `camisa` positivos) × custo da compra (entry `camisa` negativo).

## Telas

Navegação inferior: **Mensal | Eventos | Camisas | Histórico** (+ Admin para o gestor).

### `/` — Dashboard público (layout "resumo em cards", escolhido em mockup)
- Header com nome do grupo e mês corrente
- Cards: **Caixa** (saldo total), **Pagos** (11/14), **Jogos** do mês
- Barra de progresso da arrecadação do mês (R$ X de R$ Y)
- Lista nominal com filtros em pílulas: Todos | Pendentes | Avulsos
- Últimos lançamentos

### `/eventos` — público
- Lista de eventos com saldo de cada um; detalhe mostra gastos e contribuições.

### `/camisas` — público
- Pedidos: jogador, tamanho, pago/pendente; total arrecadado × custo da compra.

### `/historico` — público
- Evolução do caixa mês a mês, receita × despesa, comparativo ano a ano (2024–2026).

### `/admin/*` — protegido por senha
- **Lançamentos**: formulário clássico (escolhido em mockup) — jogador, tipo (chips: Mensal/Avulso/Quadra/Goleiro/Evento/Camisa/Outro), valor (pré-preenchido pela regra do mês quando aplicável), mês, descrição. Lista de lançamentos do mês com edição/exclusão.
- **Cobrança**: botão "Copiar cobrança" gera texto pronto com pendentes do mês e valores (ex: "Fala pessoal! Mensalidade de junho (R$ 75): faltam Tales, Tio Valdo e Erick. PIX: ...") e copia para a área de transferência.
- **Jogadores**: cadastro, ativar/desativar mensalista.
- **Configurações**: tabela de preços por ano (reajuste), jogos de cada mês, criação de eventos, pedidos de camisa, nome do grupo e chave PIX (usados no header e na mensagem de cobrança).

## Importação do histórico

Script único `scripts/import.ts`:
1. Lê o xlsx exportado da planilha (abas 2024, 2025, 2026 → `entries`; Eventos → `events` + `entries`; Camisas → `shirts` + `entries`; Dictionary → referência para tipos).
2. **Normaliza nomes** via tabela de aliases (Samuka/Samuca, Tio Valdo/Tio Waldo, Brandao/Brandão → um jogador canônico).
3. Gera **relatório de conferência** antes de gravar: mapeamento de nomes, linhas sem valor, tipos desconhecidos — admin aprova e o script grava.
4. **Validação**: totais por mês comparados com a planilha original.

## Tratamento de erros

- Server Actions validam entrada com Zod; mensagens de erro claras no formulário.
- Lançamento duplicado de mensalidade (mesmo jogador, mesmo mês, tipo mensal) → aviso com opção de confirmar mesmo assim.
- Rotas públicas são somente leitura — sem estado mutável.

## Testes

- **Unitários**: regras de negócio (cálculo de mensalidade por jogos, pendências, saldos, geração da mensagem de cobrança) e normalizador de nomes da importação.
- **Smoke tests**: renderização das páginas principais com dados de exemplo.

## Fora de escopo (v2+)

- Login individual de jogadores, confirmação de presença, envio de comprovante PIX
- PIX copia-e-cola no app
- Notificações push
- Service worker offline

## Critérios de sucesso

1. Murilo abandona a planilha: todo o fluxo mensal (abrir mês, lançar pagamentos, cobrar pendentes) acontece no app.
2. Jogadores consultam o link sem pedir "quem falta pagar?" no grupo.
3. Histórico 2024–2026 importado com totais batendo com a planilha.
4. Custo de operação R$ 0/mês.

# Controle Futebol

Controle financeiro da pelada — substitui a planilha do Google Sheets.

## Rodar local

1. Suba o banco local (Postgres 17 na porta 5435):
   ```bash
   docker compose up -d
   ```

2. Crie `.env.local` com as variáveis:
   ```
   DATABASE_URL=postgresql://futebol:futebol@localhost:5435/futebol
   ADMIN_PASSWORD=<senha-do-admin>
   AUTH_SECRET=<hex-32-bytes: openssl rand -hex 32>
   ```

3. Instale dependências, aplique o schema e suba o servidor:
   ```bash
   npm install
   npx drizzle-kit push
   npm run dev
   ```

## Importar histórico da planilha

```bash
npx tsx scripts/import.ts          # dry-run — revise aliases e totais
npx tsx scripts/import.ts --write  # grava no banco
```

## Testes

```bash
npm test
```

## Deploy (Coolify)

O app roda em container via `Dockerfile` (Next.js standalone). No Coolify:

1. **Crie o recurso Postgres** no Coolify e copie a connection string interna
   (algo como `postgres://usuario:senha@<nome-do-servico>:5432/<db>`).

2. **Crie a aplicação** apontando para o repositório `git@github.com:mmittmann/fute-terca.git`,
   branch `master`, **Build Pack = Dockerfile**. A porta exposta é a **3000**.

3. **Variáveis de ambiente** da aplicação:
   ```
   DATABASE_URL=postgres://...        # string interna do Postgres do Coolify
   ADMIN_PASSWORD=<senha-do-admin>
   AUTH_SECRET=<hex-32-bytes: openssl rand -hex 32>
   ```

4. **Faça o deploy** (build do Dockerfile). O container sobe ouvindo em `0.0.0.0:3000`.

5. **Banco — schema + histórico**: restaure o dump local (`db-dump.sql`, gerado por
   `docker exec futebol_postgres pg_dump -U futebol -d futebol --no-owner --no-privileges --clean --if-exists > db-dump.sql`)
   no Postgres de produção. O dump já inclui as tabelas (CREATE TABLE) e os dados:
   ```bash
   # via psql apontando para o Postgres do Coolify (porta exposta ou túnel):
   psql "<DATABASE_URL_de_producao>" < db-dump.sql
   ```
   Alternativa (sem dados, só schema): `DATABASE_URL=... npx drizzle-kit push`.

   Para futuras mudanças de schema, rode `DATABASE_URL=<prod> npx drizzle-kit push`.

> Nota: o lockfile é gerado no Windows; o `Dockerfile` usa `npm install` (e não `npm ci`)
> de propósito, para resolver os binários nativos de Linux do Tailwind v4 e do esbuild.

## Spec

`docs/superpowers/specs/2026-06-05-controle-futebol-design.md`

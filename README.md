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

## Deploy

Em produção pode-se usar Vercel + Postgres gerenciado (ex: Neon via Vercel Marketplace).
Basta configurar as mesmas 3 variáveis de ambiente (`DATABASE_URL`, `ADMIN_PASSWORD`, `AUTH_SECRET`) no painel do projeto Vercel e fazer `vercel deploy --prod`.

## Spec

`docs/superpowers/specs/2026-06-05-controle-futebol-design.md`

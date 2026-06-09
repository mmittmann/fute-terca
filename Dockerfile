# syntax=docker/dockerfile:1

# ---- base ----
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ---- deps ----
# Usamos `npm install` (não `npm ci`) porque o lockfile é gerado no Windows e
# não inclui os binários nativos de Linux do Tailwind v4 (oxide/lightningcss) e
# do esbuild — `npm install` resolve as deps opcionais corretas do Alpine.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund

# ---- builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next standalone: server.js + node_modules mínimos
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]

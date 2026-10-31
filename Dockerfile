# syntax=docker/dockerfile:1

# ---- deps: instala dependências e gera o Prisma Client -------------------
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# ---- builder: compila o Next.js ------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runner: imagem final de produção ------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/jsconfig.json ./jsconfig.json
COPY --from=builder /app/next.config.js ./next.config.js
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]

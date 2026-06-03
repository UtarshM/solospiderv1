FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./apps/web-next/.next/static
COPY --from=builder /app/public ./apps/web-next/public

EXPOSE 3000
CMD ["node", "apps/web-next/server.js"]

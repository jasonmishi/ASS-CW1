FROM node:20-slim AS base

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS api

COPY api/package*.json ./api/
WORKDIR /app/api
RUN npm ci

WORKDIR /app
COPY api ./api
RUN cd /app/api && npx prisma generate --schema ./prisma/schema.prisma
RUN chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3000

USER node

EXPOSE 3000

WORKDIR /app/api
CMD ["node", "app.js"]

FROM base AS web

COPY web/package*.json ./web/
WORKDIR /app/web
RUN npm ci

WORKDIR /app
COPY web ./web
RUN chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3000

USER node

EXPOSE 3000

WORKDIR /app/web
CMD ["node", "app.js"]

FROM base AS worker

COPY api/package*.json ./api/
WORKDIR /app/api
RUN npm ci

WORKDIR /app
COPY api ./api
RUN cd /app/api && npx prisma generate --schema ./prisma/schema.prisma
RUN chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3000

USER node

WORKDIR /app/api
CMD ["node", "workers/scheduler.js"]

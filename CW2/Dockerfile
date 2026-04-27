FROM node:20-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY app.js ./
COPY controllers ./controllers
COPY docs/swagger.yaml ./docs/swagger.yaml
COPY lib ./lib
COPY middleware ./middleware
COPY models ./models
COPY public ./public
COPY routes ./routes
COPY schemas ./schemas
COPY services ./services
COPY utils ./utils
COPY views ./views
COPY workers ./workers

RUN chown -R node:node /app

ENV NODE_ENV=production
ENV PORT=3000

USER node

EXPOSE 3000

CMD ["node", "app.js"]

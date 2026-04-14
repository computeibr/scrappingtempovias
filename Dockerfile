# ─── Stage 1: Build do Frontend ───────────────────────────────────────────────
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

ARG VITE_GOOGLE_MAPS_KEY
ENV VITE_GOOGLE_MAPS_KEY=$VITE_GOOGLE_MAPS_KEY

RUN npm run build


# ─── Stage 2: Aplicação em produção (com Chromium para Puppeteer) ─────────────
FROM node:18-alpine AS production

WORKDIR /app

# Chromium e dependências necessárias para o Puppeteer no Alpine
RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont

# Diz ao Puppeteer para usar o Chromium do sistema (não baixar o próprio)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 3001

CMD ["node", "app.js"]

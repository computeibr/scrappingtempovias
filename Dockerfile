# ─── Stage 1: Build do Frontend ───────────────────────────────────────────────
FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./

ARG VITE_GOOGLE_MAPS_KEY
ENV VITE_GOOGLE_MAPS_KEY=$VITE_GOOGLE_MAPS_KEY

RUN npm run build


# ─── Stage 2: Aplicação em produção (web only — sem Chromium/Puppeteer) ───────
FROM node:18-alpine AS production

WORKDIR /app

# Instala apenas dependências de produção (puppeteer não baixa Chromium — ETL desativado)
COPY package*.json ./
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm install --omit=dev

# Copia o código do backend
COPY . .

# Copia o build do frontend gerado no stage anterior
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

EXPOSE 3001

CMD ["node", "app.js"]

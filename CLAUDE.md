# Tempovias — Contexto do Projeto

## O que é
Plataforma full-stack para monitoramento automático do tempo de viagem em rotas urbanas do Rio de Janeiro (CETRIO / Prefeitura Rio). O backend coleta dados do Google Maps a cada 5 minutos via Puppeteer; o frontend React exibe dashboards com mapa, gráficos e filtros históricos.

## Stack
- **Backend:** Node.js + Express + Sequelize + node-cron + Puppeteer
- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts + @react-google-maps/api
- **Banco:** **PostgreSQL** (migração do SQL Server concluída — `models/db.js` já usa dialect `postgres`)
- **Processo:** **Docker + EasyPanel** (produção) | PM2/nodemon (desenvolvimento local)
- **Auth:** JWT (bcryptjs + jsonwebtoken), middleware `eAdmin` em `middlewares/auth.js`
- **Datas/Fuso:** `luxon` (principal — dashboard e filtros) + `moment` (legado em alguns helpers)

## Estrutura de pastas
```
/                       ← backend Express (porta 3001)
├── app.js              ← entry point, serve frontend/dist em produção
├── Dockerfile          ← multi-stage: node:18-alpine build + Chromium para Puppeteer
├── docker-compose.yml  ← serviços: postgres:15-alpine + app (depends_on healthy)
├── init.sql            ← cria tabelas e índice na primeira inicialização do Postgres
├── controller/
│   ├── etl.js          ← scraping + cron job a cada 5 min (roda imediatamente no start)
│   ├── auth.js         ← POST /api/auth/login + /criar-usuario
│   ├── dashboard.js    ← GET /api/dashboard/resumo|rotas|historico/:id|snapshot|ultimas/:id
│   └── rotasvia.js     ← GET /rota/rotasvia e /api/rotas (legado, usado pelo scraper)
├── models/
│   ├── db.js           ← Sequelize com dialect postgres; suporte a DB_SSL via env
│   ├── User.js         ← tabela users
│   ├── rotasvia.js     ← tabela tv_tempo_via (id, name, url, geometry)
│   └── tempovias.js    ← tabela tempovias (id, viaId FK, nomedarota, tempo, km, leitura, urlfoto)
├── middlewares/
│   ├── auth.js         ← verifica JWT, popula req.userId e req.locals.role
│   └── acl.js          ← controle por perfilId (99 = admin)
└── frontend/           ← React + Vite (porta 3000 no dev)
    ├── src/
    │   ├── pages/Login.jsx
    │   ├── pages/Dashboard.jsx
    │   ├── components/Navbar.jsx
    │   ├── components/Sidebar.jsx      ← lista de rotas com toggle
    │   ├── components/RouteMap.jsx     ← Google Maps + DirectionsService
    │   ├── components/TimeChart.jsx    ← Recharts média/hora + banda min-max
    │   ├── components/StatsCards.jsx
    │   ├── components/FilterPanel.jsx  ← datepicker + dias da semana
    │   ├── contexts/AuthContext.jsx    ← JWT no localStorage (tv_token, tv_user)
    │   ├── services/api.js             ← axios com interceptors JWT
    │   └── utils/mapUtils.js           ← parser de URLs do Google Maps
    └── .env.example    ← VITE_GOOGLE_MAPS_KEY
```

## Banco de dados — tabelas
| Tabela | Descrição |
|---|---|
| `tv_tempo_via` | Rotas cadastradas: id, name, url, geometry (traçado da rota), createdAt, updatedAt |
| `tempovias` | Histórico: id, viaId (FK), nomedarota, tempo, km, leitura (timestamp), urlfoto, createdAt, updatedAt |
| `users` | Usuários: id, name, email, password (bcrypt), perfilId (1=user, 99=admin), createdAt, updatedAt |

> Todos os `.sync()` estão **comentados** — o Sequelize não cria/altera tabelas automaticamente.
> O schema é criado pelo `init.sql` na primeira vez que o container do PostgreSQL sobe.

## Endpoints da API
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/login` | — | Autenticação, retorna JWT |
| POST | `/api/auth/criar-usuario` | — | Cria novo usuário |
| GET | `/api/dashboard/resumo` | JWT | Contadores gerais (totalRotas, totalLeituras, hoje, semana) |
| GET | `/api/dashboard/rotas` | JWT | Lista todas as rotas cadastradas |
| GET | `/api/dashboard/historico/:id` | JWT | Médias por hora + evolução diária com filtros |
| GET | `/api/dashboard/snapshot` | JWT | Última leitura de cada rota (para popup no mapa) |
| GET | `/api/dashboard/ultimas/:id` | JWT | Últimas leituras com paginação |
| GET | `/rota/rotasvia` ou `/api/rotas` | — | Legado — lista de rotas usada pelo scraper |

**Parâmetros de `/historico/:id`:**
- `dataInicio` / `dataFim` — `YYYY-MM-DD` (padrão: últimos 30 dias)
- `diasSemana` — `0,1,2,3,4,5,6` (Dom=0, Sab=6)
- Retorna: `mediasPorHora`, `evolucaoDiaria`, `totalRegistros`

**Parâmetros de `/ultimas/:id`:**
- `page` — número da página (padrão: 1)
- `limite` — registros por página (padrão: 20, máx: 100)
- `dataInicio` / `dataFim` — filtro de período (ISO 8601)

## Variáveis de ambiente
**`.env` (raiz — backend):**
```
PORT=3001
SECRET=string_jwt
DB=nome_banco
DB_USER=usuario
DB_PASS=senha
DB_HOST=host
DB_PORT=5432
DB_SSL=false
```
**`frontend/.env`:**
```
VITE_GOOGLE_MAPS_KEY=chave_google_maps
```

## Identidade visual
Cores extraídas do `identidadevisual2022.pdf` (Manual de Marca Prefeitura Rio):
- Azul marinho primário: `#004A80` / dark: `#13335A`
- Azul celeste (accent): `#00C0F3`
- Laranja: `#E95F3E` | Vermelho: `#E51B23` | Amarelo: `#F9C600` | Verde: `#34973B`
- Fundo: `#F0F0F0` | Texto: `#1D1D1B`

## Decisões arquiteturais tomadas
- Frontend e backend no **mesmo repositório** (monorepo)
- Em produção: Express serve o build do Vite em `frontend/dist`
- Em desenvolvimento: Vite (3000) com proxy para Express (3001)
- Rotas legadas (`/rota/rotasvia`) mantidas — o scraper interno depende delas
- JWT armazenado em localStorage com chaves `tv_token` e `tv_user`
- CORS configurado como `*` (aberto) — restringir em produção se necessário
- etl.js executa `agendamentoDefinido()` imediatamente ao iniciar (além do cron a cada 5min)
- Flag `isRunning` impede execuções paralelas do cron

## Docker
O `Dockerfile` usa **multi-stage build**:
- **Stage 1** (`node:18-alpine`): instala deps do frontend e faz `npm run build`
- **Stage 2** (`node:18-alpine` + Chromium via `apk`): instala deps de produção do backend e copia o build do frontend

Variáveis de build do Docker:
- `VITE_GOOGLE_MAPS_KEY` passada via `ARG` para o Stage 1 (injetada no build do Vite)

Configuração Puppeteer no Docker:
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`

---

## PRÓXIMOS PASSOS (em andamento)

### Deploy via Docker + EasyPanel
1. [x] Atualizar `models/db.js` — dialect `postgres`, suporte a `DB_SSL` via env
2. [x] Criar `Dockerfile` — multi-stage: stage 1 build frontend Vite, stage 2 Node prod com Chromium (Puppeteer)
3. [x] Criar `docker-compose.yml` — serviços `postgres` (healthcheck) + `app` (depends_on healthy)
4. [x] Criar `init.sql` — cria as 3 tabelas + índice; executado automaticamente na primeira inicialização
5. [x] Criar `.dockerignore`
6. [x] Criar `.env.example` na raiz com variáveis do PostgreSQL
7. [ ] Fazer `git push` e configurar no EasyPanel da VPS
8. [ ] Criar primeiro usuário admin via API após deploy
9. [ ] (Futuro) Migrar dados do SQL Server para PostgreSQL

> O usuário não tem Docker localmente — todo ambiente roda na VPS via EasyPanel.
> EasyPanel lê o `docker-compose.yml` do repositório Git.

## Variáveis a configurar no EasyPanel
```
PORT=3001
SECRET=<string aleatória forte>
DB=tempovias
DB_USER=tempovias_user
DB_PASS=<senha forte>
DB_HOST=postgres
DB_PORT=5432
DB_SSL=false
VITE_GOOGLE_MAPS_KEY=<chave Google Maps API>
```

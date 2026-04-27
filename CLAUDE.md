# Tempovias — Contexto do Projeto

## O que é
Plataforma full-stack para monitoramento automático do tempo de viagem em rotas urbanas do Rio de Janeiro (CETRIO / Prefeitura Rio). O backend coleta dados do Google Maps a cada 5 minutos via Puppeteer; o frontend React exibe dashboards com mapa, gráficos e filtros históricos.

## Stack
- **Backend:** Node.js + Express + Sequelize + node-cron + Puppeteer
- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts + @react-google-maps/api
- **Banco:** **PostgreSQL** (`models/db.js` usa dialect `postgres`)
- **Processo:** **Docker + EasyPanel** (produção) | PM2/nodemon (desenvolvimento local)
- **Auth:** JWT (bcryptjs + jsonwebtoken); dois middlewares: `eAdmin` (qualquer logado) e `soAdmin` (perfilId=99) em `middlewares/auth.js`
- **Datas/Fuso:** `luxon` (principal — dashboard e filtros) + `moment` (legado em alguns helpers)

## Estrutura de pastas
```
/                       ← backend Express (porta 3001)
├── app.js              ← entry point; ETL carregado condicionalmente via ETL_ENABLED=true
├── Dockerfile          ← multi-stage: node:18-alpine build + Chromium para Puppeteer
├── docker-compose.yml  ← serviços: postgres:15-alpine + app (depends_on healthy)
├── init.sql            ← cria tabelas e índice na primeira inicialização do Postgres
├── controller/
│   ├── etl.js          ← scraping paralelo com worker pool; cron a cada 5 min + execução imediata
│   ├── auth.js         ← login, criar-usuario, CRUD de usuários (GET/PUT/DELETE /api/auth/usuarios)
│   ├── dashboard.js    ← GET /api/dashboard/resumo|rotas|historico/:id|snapshot|ultimas/:id
│   └── rotasvia.js     ← CRUD de rotas (GET livre; POST=logado; PUT/DELETE=soAdmin)
├── models/
│   ├── db.js           ← Sequelize dialect postgres; suporte a DB_SSL via env
│   ├── User.js         ← tabela users
│   ├── rotasvia.js     ← tabela tv_tempo_via (id, name, url, geometry)
│   └── tempovias.js    ← tabela tempovias (id, viaId FK, nomedarota, tempo, km, leitura, urlfoto)
├── middlewares/
│   ├── auth.js         ← eAdmin (JWT válido, qualquer perfil) + soAdmin (JWT + perfilId=99)
│   └── acl.js          ← helper por lista de perfilIds (menos usado)
└── frontend/           ← React + Vite (porta 3000 no dev)
    ├── src/
    │   ├── pages/Login.jsx
    │   ├── pages/Dashboard.jsx
    │   ├── pages/Admin.jsx         ← CRUD de rotas (criar/listar para User 2+; editar/remover só Admin)
    │   ├── pages/Usuarios.jsx      ← CRUD de usuários (só Admin 99)
    │   ├── pages/Monitor/
    │   ├── pages/Feriados/
    │   ├── pages/Metodologia/
    │   ├── components/AppShell.jsx ← shell principal: sidebar com nav por perfil + header mobile
    │   ├── components/RouteMap.jsx ← Google Maps + DirectionsService
    │   ├── components/TimeChart.jsx
    │   ├── components/StatsCards.jsx
    │   ├── components/FilterPanel.jsx
    │   ├── contexts/AuthContext.jsx ← JWT no localStorage (tv_token, tv_user)
    │   ├── services/api.js          ← axios com interceptors JWT
    │   └── utils/mapUtils.js        ← parser de URLs do Google Maps
    └── .env.example    ← VITE_GOOGLE_MAPS_KEY
```

## Banco de dados — tabelas
| Tabela | Descrição |
|---|---|
| `tv_tempo_via` | Rotas cadastradas: id, name, url, geometry (traçado da rota), createdAt, updatedAt |
| `tempovias` | Histórico: id, viaId (FK), nomedarota, tempo, km, leitura (timestamp), urlfoto, createdAt, updatedAt |
| `users` | Usuários: id, name, email, password (bcrypt), perfilId (1=View, 2=User, 99=Admin), createdAt, updatedAt |

> Todos os `.sync()` estão **comentados** — o Sequelize não cria/altera tabelas automaticamente.
> O schema é criado pelo `init.sql` na primeira vez que o container do PostgreSQL sobe.

## Controle de acesso (ACL)
| perfilId | Nome | Acesso |
|----------|------|--------|
| 1 | View | Dashboard apenas (somente leitura) |
| 2 | User | Dashboard + Gerenciar Rotas (criar e visualizar; sem editar/remover) |
| 99 | Admin | Acesso total: dashboard, CRUD completo de rotas e CRUD de usuários |

- Sidebar (`AppShell.jsx`) exibe itens de acordo com o perfil
- `Admin.jsx` redireciona para `/` se `perfilId < 2`
- `Usuarios.jsx` redireciona para `/` se `perfilId !== 99`
- Backend: `PUT /rotasvia/:id` e `DELETE /rotasvia/:id` exigem `soAdmin`

## Endpoints da API
| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| POST | `/api/auth/login` | — | Autenticação, retorna JWT |
| POST | `/api/auth/criar-usuario` | soAdmin | Cria novo usuário |
| GET | `/api/auth/usuarios` | soAdmin | Lista todos os usuários |
| PUT | `/api/auth/usuarios/:id` | soAdmin | Edita nome, e-mail, perfil e/ou senha |
| DELETE | `/api/auth/usuarios/:id` | soAdmin | Remove usuário (não pode auto-remover) |
| GET | `/api/dashboard/resumo` | eAdmin | Contadores gerais (totalRotas, totalLeituras, hoje, semana) |
| GET | `/api/dashboard/rotas` | eAdmin | Lista todas as rotas cadastradas |
| GET | `/api/dashboard/historico/:id` | eAdmin | Médias por hora + evolução diária com filtros |
| GET | `/api/dashboard/snapshot` | eAdmin | Última leitura de cada rota (para popup no mapa) |
| GET | `/api/dashboard/ultimas/:id` | eAdmin | Últimas leituras com paginação |
| GET | `/api/rotas/rotasvia` ou `/rota/rotasvia` | — | Legado — lista de rotas usada pelo scraper |
| POST | `/api/rotas/rotasvia` | eAdmin | Cadastra nova rota |
| PUT | `/api/rotas/rotasvia/:id` | soAdmin | Edita rota (nome, URL, geometry) |
| DELETE | `/api/rotas/rotasvia/:id` | soAdmin | Remove rota |

**Parâmetros de `/historico/:id`:**
- `dataInicio` / `dataFim` — `YYYY-MM-DD` (padrão: últimos 30 dias)
- `diasSemana` — `0,1,2,3,4,5,6` (Dom=0, Sab=6)
- Retorna: `mediasPorHora`, `evolucaoDiaria`, `totalRegistros`

**Parâmetros de `/ultimas/:id`:**
- `page` — número da página (padrão: 1)
- `limite` — registros por página (padrão: 20, máx: 100)
- `dataInicio` / `dataFim` — filtro de período (ISO 8601)

## ETL — scraping paralelo (`controller/etl.js`)
- **Worker pool dinâmico**: até `CONCURRENCY` abas abertas simultaneamente; fila compartilhada com `Array.shift()` (seguro no event loop single-thread do Node)
- **Execução imediata + cron**: roda ao iniciar e depois a cada 5 min; a chamada imediata usa o mesmo `isRunning = true` que o cron para evitar sobreposição
- **Retry**: 2 tentativas por rota com backoff de 2s; erro descritivo se elemento XPath não for encontrado
- **Dedup de segurança**: antes de cada insert, verifica se já existe leitura para o mesmo `viaId` nos últimos 3 min — barreira contra regressões no `isRunning`
- **Alerta por e-mail**: após 3 falhas consecutivas envia e-mail via Nodemailer (Gmail)
- **FAST_MODE**: `ETL_FAST_MODE=true` usa `domcontentloaded` + espera fixa de 3s em vez de `networkidle2`; mais rápido, monitore qualidade dos dados

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
ETL_ENABLED=true           # false desativa o scraping completamente
ETL_CONCURRENCY=8          # abas paralelas (8 para 2vCPU/8GB; 15 para 4vCPU/16GB)
ETL_TAB_DELAY=2000         # delay em ms entre abertura de cada aba (evita pico de CPU)
ETL_FAST_MODE=false        # true = domcontentloaded+3s; false = networkidle2 (padrão)
ALERT_EMAIL=               # Gmail remetente para alertas de falha
ALERT_EMAIL_PASS=          # App password do Gmail
ALERT_EMAIL_TO=            # Destinatário do alerta (padrão: mesmo que ALERT_EMAIL)
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
- `AppShell.jsx` é o shell principal com sidebar + header mobile; `Navbar.jsx` e `Sidebar.jsx` são legados não utilizados nas páginas atuais
- ETL só é carregado se `ETL_ENABLED=true` (prevenção de scraping em ambiente de dev sem Docker)
- `isRunning` protege contra sobreposição de ciclos no cron **e** na chamada imediata de startup

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

## PRÓXIMOS PASSOS

### Deploy via Docker + EasyPanel
1. [x] Atualizar `models/db.js` — dialect `postgres`, suporte a `DB_SSL` via env
2. [x] Criar `Dockerfile` — multi-stage: stage 1 build frontend Vite, stage 2 Node prod com Chromium (Puppeteer)
3. [x] Criar `docker-compose.yml` — serviços `postgres` (healthcheck) + `app` (depends_on healthy)
4. [x] Criar `init.sql` — cria as 3 tabelas + índice; executado automaticamente na primeira inicialização
5. [x] Criar `.dockerignore`
6. [x] Criar `.env.example` na raiz com variáveis do PostgreSQL
7. [x] Deploy no EasyPanel da VPS (em produção — scraping ativo)
8. [ ] Migrar dados históricos do SQL Server para PostgreSQL (futuro)

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
ETL_ENABLED=true
ETL_CONCURRENCY=8
ETL_TAB_DELAY=2000
ETL_FAST_MODE=false
VITE_GOOGLE_MAPS_KEY=<chave Google Maps API>
ALERT_EMAIL=<gmail>
ALERT_EMAIL_PASS=<app password>
ALERT_EMAIL_TO=<destinatário>
```

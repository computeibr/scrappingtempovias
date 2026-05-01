# Tempovias — Contexto do Projeto

## O que é
Plataforma full-stack para monitoramento automático do tempo de viagem em rotas urbanas do Rio de Janeiro (CETRIO / Prefeitura Rio). O backend coleta dados do Google Maps a cada 5 minutos via Puppeteer; o frontend React exibe dashboards com mapa, gráficos e filtros históricos.

## Stack
- **Backend:** Node.js + Express + Sequelize + node-cron + Puppeteer
- **Frontend:** React 18 + Vite + Tailwind CSS + Recharts + @react-google-maps/api
- **Banco:** **PostgreSQL** (`models/db.js` usa dialect `postgres`)
- **Processo:** **Docker + EasyPanel** (produção) | nodemon (desenvolvimento local)
- **Auth:** JWT (bcryptjs + jsonwebtoken); dois middlewares: `eAdmin` (qualquer logado) e `soAdmin` (perfilId=99) em `middlewares/auth.js`
- **Datas/Fuso:** `luxon` (principal — dashboard e filtros) + `moment` (legado em alguns helpers)

## Infraestrutura de produção
- **VPS:** 8 cores CPU, 32 GB RAM
- **Deploy:** Docker + EasyPanel (lê o `docker-compose.yml` do repositório Git)
- **O usuário não tem Docker localmente** — todo ambiente roda na VPS via EasyPanel
- `ecosystem.config.js` existe no repositório mas **não está sendo usado** — produção roda só via Docker
- Em produção: `ETL_FAST_MODE=true` e `ETL_CONCURRENCY=20` (confirmado nos logs)
- CPU fica em ~60% durante o ciclo ETL (25s a cada 5 min) — considerado aceitável

## Estrutura de pastas
```
/                       ← backend Express (porta 3001)
├── app.js              ← entry point; ETL carregado condicionalmente via ETL_ENABLED=true
├── Dockerfile          ← multi-stage: node:18-alpine build + Chromium para Puppeteer
├── docker-compose.yml  ← serviço único: app (postgres gerenciado pelo EasyPanel separadamente)
├── ecosystem.config.js ← PM2 config legado — NÃO usar em produção (usa Docker)
├── init.sql            ← cria tabelas, colunas novas e índice; safe para re-execução (IF NOT EXISTS)
├── controller/
│   ├── etl.js          ← scraping paralelo com worker pool; cron a cada 5 min + execução imediata
│   ├── auth.js         ← login, criar-usuario, CRUD de usuários (GET/PUT/DELETE /api/auth/usuarios)
│   ├── dashboard.js    ← GET /api/dashboard/resumo|rotas|historico/:id|snapshot|ultimas/:id
│   └── rotasvia.js     ← CRUD de rotas + autoria + compartilhamento + rotas órfãs
├── models/
│   ├── db.js           ← Sequelize dialect postgres; suporte a DB_SSL via env
│   ├── User.js         ← tabela users
│   ├── rotasvia.js     ← tabela tv_tempo_via (id, name, url, geometry, categoria, creatorId)
│   ├── routeShare.js   ← tabela route_shares (id, routeId, email) — compartilhamento view-only
│   └── tempovias.js    ← tabela tempovias (id, viaId FK, nomedarota, tempo, km, leitura, urlfoto)
├── middlewares/
│   ├── auth.js         ← eAdmin + soAdmin; ambos expõem req.userId E req.userRole
│   └── acl.js          ← helper por lista de perfilIds (menos usado)
└── frontend/           ← React + Vite (porta 3000 no dev)
    ├── src/
    │   ├── pages/Login.jsx
    │   ├── pages/Dashboard.jsx
    │   ├── pages/Admin.jsx         ← CRUD de rotas + categoria + filtro + compartilhamento inline
    │   ├── pages/Ajustes.jsx       ← Admin only: assume autoria de rotas órfãs (creatorId IS NULL)
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
| `tv_tempo_via` | Rotas: id, name, url, geometry, **categoria**, **creatorId** (FK→users), createdAt, updatedAt |
| `route_shares` | Compartilhamentos: id, routeId (FK→tv_tempo_via), email, createdAt, updatedAt; UNIQUE(routeId,email) |
| `tempovias` | Histórico: id, viaId (FK), nomedarota, tempo, km, leitura (timestamp), urlfoto, createdAt, updatedAt |
| `users` | Usuários: id, name, email, password (bcrypt), perfilId (1=View, 2=User, 99=Admin), createdAt, updatedAt |

> Todos os `.sync()` estão **comentados** — o Sequelize não cria/altera tabelas automaticamente.
> O schema é criado pelo `init.sql`. Novas colunas usam `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — seguro rodar em banco já existente.
> **Em produção:** executar manualmente os `ALTER TABLE` e `CREATE TABLE route_shares` do `init.sql` pois o init só roda automaticamente no primeiro boot do container.

## Controle de acesso (ACL)
| perfilId | Nome | Acesso |
|----------|------|--------|
| 1 | View | Dashboard apenas (somente leitura) |
| 2 | User | Dashboard + Gerenciar Rotas (criar e visualizar as suas; editar/remover as suas) |
| 99 | Admin | Acesso total: dashboard, CRUD de todas as rotas, usuários, Ajustes |

- Sidebar (`AppShell.jsx`) exibe itens de acordo com o perfil
- `Admin.jsx` redireciona para `/` se `perfilId < 2`
- `Usuarios.jsx` e `Ajustes.jsx` redirecionam para `/` se `perfilId !== 99`
- Backend: editar/remover rota exige ser o criador da rota **ou** Admin (não mais `soAdmin` exclusivo)

## Módulo de Rotas — regras de negócio
### Autoria
- Toda rota criada vincula `creatorId = req.userId` automaticamente
- Rotas antigas sem `creatorId` são chamadas de **"legadas"** ou **"órfãs"** — visíveis a todos até serem reivindicadas

### Visibilidade (`GET /api/rotas/rotasvia/minhas`)
- **Admin**: vê todas as rotas
- **User/View**: vê rotas onde `creatorId = userId` OU `creatorId IS NULL` (legadas) OU email do usuário está em `route_shares`

### Permissão de escrita
- Função `temPermissaoEscrita(routeId, userId, userRole)`: retorna `true` se Admin ou se o usuário é o `creatorId`
- Compartilhamento é **somente leitura** — usuário compartilhado não pode editar/remover

### Compartilhamento
- Criador ou Admin adicionam e-mails via `POST /api/rotas/rotasvia/:id/compartilhar`
- Painel inline no `Admin.jsx` lista e-mails compartilhados com botão "remover"
- Rota compartilhada exibe badge "compartilhado" no frontend

### Rotas órfãs (página Ajustes)
- `GET /api/rotas/rotasvia/orfas` — lista rotas com `creatorId IS NULL`
- `POST /api/rotas/rotasvia/orfas/assumir` — Admin passa array de `routeIds` (ou vazio para assumir todas)
- Frontend `/ajustes`: lista com checkboxes, "Assumir selecionadas", "Assumir todas", "Assumir" individual

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
| GET | `/api/rotas/rotasvia` ou `/rota/rotasvia` | — | **Público / ETL** — todas as rotas sem filtro |
| GET | `/api/rotas/rotasvia/minhas` | eAdmin | Rotas visíveis ao usuário (suas + legadas + compartilhadas) |
| GET | `/api/rotas/rotasvia/orfas` | soAdmin | Rotas com `creatorId IS NULL` |
| POST | `/api/rotas/rotasvia` | eAdmin | Cria rota; vincula `creatorId` automaticamente |
| PUT | `/api/rotas/rotasvia/:id` | eAdmin | Edita rota (criador ou admin) |
| DELETE | `/api/rotas/rotasvia/:id` | eAdmin | Remove rota (criador ou admin) |
| POST | `/api/rotas/rotasvia/:id/compartilhar` | eAdmin | Adiciona e-mail ao compartilhamento (criador ou admin) |
| DELETE | `/api/rotas/rotasvia/:id/compartilhar/:email` | eAdmin | Remove e-mail do compartilhamento (criador ou admin) |
| POST | `/api/rotas/rotasvia/orfas/assumir` | soAdmin | Atribui `creatorId` a rotas órfãs (array de IDs ou vazio = todas) |

**Parâmetros de `/historico/:id`:**
- `dataInicio` / `dataFim` — `YYYY-MM-DD` (padrão: últimos 30 dias)
- `diasSemana` — `0,1,2,3,4,5,6` (Dom=0, Sab=6)
- Retorna: `mediasPorHora`, `evolucaoDiaria`, `totalRegistros`

**Parâmetros de `/ultimas/:id`:**
- `page` — número da página (padrão: 1)
- `limite` — registros por página (padrão: 20, máx: 100)
- `dataInicio` / `dataFim` — filtro de período (ISO 8601)

## ETL — scraping paralelo (`controller/etl.js`)

### Arquitetura atual
- **Worker pool dinâmico**: até `CONCURRENCY` abas abertas simultaneamente; fila compartilhada com `Array.shift()` (seguro no event loop single-thread do Node)
- **Execução imediata + cron**: roda ao iniciar e depois a cada 5 min (`*/5 * * * *`, timezone America/Sao_Paulo); a chamada imediata usa o mesmo guard `isRunning = true` que o cron
- **Retry**: 2 tentativas por rota com backoff de 2s; erro descritivo se elemento XPath não for encontrado
- **FAST_MODE** (`ETL_FAST_MODE=true`): usa `domcontentloaded` + espera fixa de 3s em vez de `networkidle2` — **ativo em produção**
- **Request interception**: cada aba bloqueia `image`, `font`, `stylesheet`, `media` — o Maps só precisa de JS/XHR para calcular tempo/km; reduz CPU significativamente
- **Alerta por e-mail**: após 3 falhas consecutivas envia e-mail via Nodemailer (Gmail)

### Proteções contra duplicatas (duas camadas)
**Problema identificado:** EasyPanel pode subir múltiplos containers (replicas > 1) ou sobrepor container antigo com novo durante redeploy, causando dois processos ETL escrevendo no mesmo banco.

1. **Advisory lock PostgreSQL** (`pg_try_advisory_lock(737465)`): adquirido no início de cada ciclo ETL; se outro processo/container já tem a trava, o ciclo é ignorado imediatamente sem nem abrir o Puppeteer. O lock é liberado no `finally` e o PostgreSQL libera automaticamente se o processo morrer.

2. **Dedup de 3 minutos**: antes de cada `TempoVias.create()`, verifica se já existe leitura para o mesmo `viaId` nos últimos 3 min. Barreira secundária para containers com crons ligeiramente defasados.

### Seletores XPath de distância
O campo `km` armazena tanto distâncias em km (`"7,4 km"`) quanto em metros (`"250 m"`) — rotas curtas como Av. Delfim Moreira, Av. Vieira Souto, Av. Atlântica exibem metros no Maps. O `waitForXPath` e o `$x` aceitam ambos os formatos:
```
contains(text(),' km') or (contains(text(),' m') and not(contains(text(),'min')))
```
A exclusão de `min` evita capturar o elemento de tempo (`"5 min"`) como distância.

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
ETL_CONCURRENCY=20         # abas paralelas — produção usa 20 (8 cores/32GB)
ETL_TAB_DELAY=2000         # delay em ms entre abertura de cada aba (evita pico de CPU)
ETL_FAST_MODE=true         # true = domcontentloaded+3s (padrão produção); false = networkidle2
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
- Rotas legadas (`/rota/rotasvia`) mantidas — o scraper interno depende delas e não tem autenticação
- JWT armazenado em localStorage com chaves `tv_token` e `tv_user`; payload contém `id` e `role` (= perfilId)
- CORS configurado como `*` (aberto) — restringir em produção se necessário
- `AppShell.jsx` é o shell principal com sidebar + header mobile; `Navbar.jsx` e `Sidebar.jsx` são legados não utilizados
- ETL só é carregado se `ETL_ENABLED=true` (prevenção de scraping em ambiente de dev)
- Advisory lock (`pg_try_advisory_lock`) escolhido em vez de variável em memória (`isRunning`) para funcionar entre múltiplos containers — `isRunning` continua existindo como guarda intra-processo
- Request interception ativado para reduzir CPU: bloqueia tiles de mapa, fontes e CSS sem afetar o cálculo de tempo/km pelo Maps JS
- `categoria` de rota é campo `VARCHAR(100)` livre na própria tabela (sem tabela separada) — input com `<datalist>` no frontend sugere categorias existentes
- Compartilhamento por e-mail (não por user_id) para permitir compartilhar com pessoas sem conta
- `GET /rotasvia` permanece público (ETL); `GET /rotasvia/minhas` é o endpoint autenticado do frontend
- Botão Cadastrar em `Admin.jsx` só habilita quando name + url + categoria estão todos preenchidos

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

## PRÓXIMOS PASSOS / BACKLOG

### Deploy via Docker + EasyPanel
1. [x] Atualizar `models/db.js` — dialect `postgres`, suporte a `DB_SSL` via env
2. [x] Criar `Dockerfile` — multi-stage: stage 1 build frontend Vite, stage 2 Node prod com Chromium (Puppeteer)
3. [x] Criar `docker-compose.yml` — serviço app
4. [x] Criar `init.sql` — cria as 3 tabelas + índice; executado automaticamente na primeira inicialização
5. [x] Criar `.dockerignore`
6. [x] Criar `.env.example` na raiz com variáveis do PostgreSQL
7. [x] Deploy no EasyPanel da VPS (em produção — scraping ativo)
8. [ ] Migrar dados históricos do SQL Server para PostgreSQL (futuro)

### ETL — melhorias aplicadas
1. [x] Worker pool dinâmico com `fila.shift()` (substituiu lotes fixos)
2. [x] FAST_MODE (`domcontentloaded` + 3s)
3. [x] TAB_OPEN_DELAY escalonado para evitar pico de CPU
4. [x] Advisory lock PostgreSQL — anti-duplicata entre containers
5. [x] Dedup de 3 minutos — segunda barreira anti-duplicata
6. [x] Request interception — bloqueia image/font/stylesheet/media para reduzir CPU
7. [x] Suporte a distâncias em metros (rotas < 1 km como Av. Delfim Moreira, Av. Vieira Souto)

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
ETL_CONCURRENCY=20
ETL_TAB_DELAY=2000
ETL_FAST_MODE=true
VITE_GOOGLE_MAPS_KEY=<chave Google Maps API>
ALERT_EMAIL=<gmail>
ALERT_EMAIL_PASS=<app password>
ALERT_EMAIL_TO=<destinatário>
```

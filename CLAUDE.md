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
│   ├── dashboard.js    ← endpoints filtrados por visibilidade do usuário (usa rotasVisiveis helper)
│   ├── monitor.js      ← GET /api/monitor filtrado por visibilidade; retorna campo `categoria`
│   ├── health.js       ← GET / (público), GET /detalhes (soAdmin), POST /test-email (soAdmin)
│   └── rotasvia.js     ← CRUD de rotas + autoria + compartilhamento + rotas órfãs
├── utils/
│   ├── rotasVisiveis.js  ← helper compartilhado: Admin→todas; outros→suas+legadas+compartilhadas
│   └── monitorSistema.js ← loop setInterval 60s: alerta por e-mail se CPU da VPS > threshold
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
    │   ├── pages/Dashboard.jsx      ← sem mapa (custo API); linha ref. histórica no gráfico; master-detail mobile
    │   ├── pages/Mapa.jsx           ← mapa Google Maps + modal com gráfico ao clicar (todos os usuários)
    │   ├── pages/Perfil.jsx         ← todos os usuários: editar nome, e-mail, senha e avatar (sem alterar perfilId)
    │   ├── pages/Admin.jsx         ← CRUD de rotas + preview mapa (fitBounds) + validação visual de campos + compartilhamento inline
    │   ├── pages/Ajustes.jsx       ← Admin only: assume autoria de rotas órfãs (creatorId IS NULL)
    │   ├── pages/Saude.jsx         ← Admin only: status, ETL, e-mail+teste, CPU/RAM ao vivo (1s); badge origem ETL
    │   ├── pages/Usuarios.jsx      ← CRUD de usuários (só Admin 99)
    │   ├── pages/Monitor/          ← filtros: status + limiar variação (>5/25/50/75%); grid tela inteira; RouteCard header/main/footer
    │   ├── pages/Feriados/
    │   ├── pages/Metodologia/      ← acordeão "Rotas, Permissões e Compartilhamento" adicionado
    │   ├── components/AppShell.jsx ← h-dvh, bottom tab bar scrollável (todos itens), colapso sidebar desktop, avatar → /perfil
    │   ├── components/RouteMap.jsx ← Google Maps + DirectionsService
    │   ├── components/TimeChart.jsx ← linha azul (média período) + linha celeste tracejada (ref. 3 sem. mesmo dia)
    │   ├── components/StatsCards.jsx ← card hora atual vs. referência histórica com variação %
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
| `users` | Usuários: id, name, email, password (bcrypt), perfilId (1=View, 2=User, 99=Admin), **avatarUrl** (VARCHAR 500, nullable), createdAt, updatedAt |
| `etl_heartbeat` | Failover ETL: id=1 (única linha), last_run (TIMESTAMPTZ), source ('local' ou 'vps') |

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
- `Usuarios.jsx`, `Ajustes.jsx` e `Saude.jsx` redirecionam para `/` se `perfilId !== 99`
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
| GET | `/api/dashboard/resumo` | eAdmin | Contadores filtrados por visibilidade do usuário |
| GET | `/api/dashboard/rotas` | eAdmin | Rotas visíveis ao usuário (suas + legadas + compartilhadas) |
| GET | `/api/dashboard/historico/:id` | eAdmin | Médias por hora + evolução diária com filtros |
| GET | `/api/dashboard/snapshot` | eAdmin | Última leitura das rotas visíveis ao usuário (mapa) |
| GET | `/api/dashboard/ultimas/:id` | eAdmin | Últimas leituras com paginação |
| GET | `/api/monitor` | eAdmin | Rotas visíveis ao usuário com variação e média histórica; inclui campo `categoria` |
| GET | `/api/health` | — | Status público: ok, última leitura, ETL ativo, email configurado |
| GET | `/api/health/live` | soAdmin | **Sem banco** — loadavg, CPU% processo, memória; polled a cada 1s no frontend |
| GET | `/api/health/detalhes` | soAdmin | Métricas completas com DB: ETL config, email, memória+heapLimite, uptime |
| POST | `/api/health/test-email` | soAdmin | Envia e-mail de teste imediatamente (independe de falhas) |
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
- **Request interception**: cada aba bloqueia `image`, `font`, `stylesheet`, `media`, `other` — o Maps só precisa de JS/XHR para calcular tempo/km
- **Browser persistente** (`obterBrowser()`): o processo Chromium é reutilizado entre ciclos — eliminado o custo de launch/close a cada 5 min. Reciclado automaticamente após `ETL_BROWSER_RECYCLE` ciclos (padrão 12, ~1h) para prevenir memory leak. Se o browser crashar, `isConnected()` detecta e força recriação no ciclo seguinte.
- **Flags extras do Chrome** (`CHROME_ARGS`): 14 flags adicionais desativam background networking, sync, extensões, métricas, phishing check e outras funcionalidades desnecessárias para scraping
- **TAB_OPEN_DELAY reduzido** para 500ms (era 2000ms) — com request interception bloqueando recursos pesados, cada aba é muito mais leve; ciclo termina mais rápido, menos tempo em CPU elevada
- **Alerta por e-mail**: após 3 falhas consecutivas envia e-mail via Nodemailer (Gmail)
- **Escala para 300 rotas**: com `CONCURRENCY=20`, cada worker processa ~15 rotas sequencialmente; ciclo estimado ≈ 1,75 min — dentro da janela de 5 min

### Proteções contra duplicatas (duas camadas)
**Problema identificado:** EasyPanel pode subir múltiplos containers (replicas > 1) ou sobrepor container antigo com novo durante redeploy, causando dois processos ETL escrevendo no mesmo banco.

1. **Advisory lock PostgreSQL** (`pg_try_advisory_lock(737465)`): adquirido no início de cada ciclo ETL; se outro processo/container já tem a trava, o ciclo é ignorado imediatamente sem nem abrir o Puppeteer. O lock é liberado no `finally` e o PostgreSQL libera automaticamente se o processo morrer.

2. **Dedup de 3 minutos**: antes de cada `TempoVias.create()`, verifica se já existe leitura para o mesmo `viaId` nos últimos 3 min. Barreira secundária para containers com crons ligeiramente defasados.

### Mecanismo de failover (máquina local → VPS)
**Problema:** a máquina local pode cair (queda de energia, reinicialização) e parar de coletar dados.

**Solução — heartbeat + failover condicional:**
- Tabela `etl_heartbeat` no banco (uma linha, id=1): guarda `last_run` (timestamp) e `source` ('local' ou 'vps')
- Após cada ciclo bem-sucedido, **qualquer máquina** atualiza o heartbeat via `atualizarHeartbeat()`
- A VPS tem `ETL_FAILOVER=true` no EasyPanel: antes de cada ciclo, faz um `SELECT` leve nesta tabela
  - Se `last_run < agora - ETL_FAILOVER_MINUTOS` → primária ausente → VPS assume o ETL
  - Se `last_run` é recente → primária ativa → VPS ignora o ciclo (zero Puppeteer, zero CPU)
- Advisory lock ainda protege contra execução simultânea em qualquer cenário de race condition
- Gap máximo antes da VPS assumir: `ETL_FAILOVER_MINUTOS` (padrão 10 min = 2 ciclos perdidos)
- VPS usa `ETL_CONCURRENCY=4` em modo backup para não sobrecarregar
- Log identifica quem rodou: `Ciclo concluído em Xs. [local]` ou `[vps]`

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
ETL_CONCURRENCY=20         # abas paralelas — local usa 8, VPS backup usa 4
ETL_TAB_DELAY=500          # delay em ms entre abertura de cada aba (reduzido de 2000; request interception torna abas leves)
ETL_FAST_MODE=true         # true = domcontentloaded+3s (padrão produção); false = networkidle2
ETL_BROWSER_RECYCLE=12     # ciclos antes de reciclar o browser (default 12 ≈ 1h)
ETL_FAILOVER=false         # false = primária (local, sempre roda); true = backup (VPS, só roda se primária ausente)
ETL_FAILOVER_MINUTOS=10    # minutos sem heartbeat para VPS assumir (default 10 = 2 ciclos perdidos)
ALERT_EMAIL=               # Gmail remetente para alertas de falha
ALERT_EMAIL_PASS=          # App password do Gmail
ALERT_EMAIL_TO=            # Destinatário do alerta (padrão: mesmo que ALERT_EMAIL)
ALERTA_CPU_PORCENTO=80     # threshold de alerta de CPU (default 80%; ETL causa picos de ~70%)
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
- **Validação de formulário em `Admin.jsx`**: botão sempre clicável; ao clicar com campos vazios, ativa `tentouCadastrar/tentouEditar` → borda vermelha + fundo vermelho claro + mensagem por campo + asterisco nos labels obrigatórios. Retorna cedo sem chamar a API se inválido.
- **`PreviewMap` em `Admin.jsx` fora do componente pai**: componentes definidos dentro de outro componente são recriados a cada render (anti-pattern), causando remount do GoogleMap e impedindo `fitBounds` de funcionar. Mover para escopo de módulo resolve. Usar `fitBounds` com padding em vez de `zoom` fixo para adaptar ao traçado de qualquer tamanho de rota. Centro padrão = Rio de Janeiro (`-22.9068, -43.1729`).
- Helper `utils/rotasVisiveis.js` centraliza a lógica de filtro de visibilidade — usado em `dashboard.js` e `monitor.js` para evitar duplicação
- Dashboard e Monitor filtram rotas por visibilidade do usuário (Admin vê tudo; outros veem as suas + legadas + compartilhadas com seu e-mail)
- Filtro de categoria por chips clicáveis: Dashboard (sidebar) e Monitor (barra superior) — chips aparecem automaticamente quando existem categorias cadastradas
- Página Metodologia contém seção acordeão `🔐 Rotas, Permissões e Compartilhamento` explicando as regras de acesso para os usuários finais
- `controller/health.js` usa módulos `os` e `v8` nativos do Node — sem dependências extras. `os.loadavg()` reflete o host da VPS (não só o container); `process.memoryUsage()` é o consumo real do processo Node.js; heap usa `v8.getHeapStatistics().heap_size_limit` como teto real (~4GB), não `heapTotal` (que é o alocado no momento)
- E-mail de alertas (Gmail) exige **App Password** (não senha normal) quando 2FA está ativo na conta. Gerado em: Conta Google → Segurança → Senhas de apps
- `enviarAlertaEmail` loga `warn` quando variáveis não configuradas (antes retornava silenciosamente)
- Página `/saude` usa **dois ciclos de polling distintos**: `GET /api/health/live` a cada 1s (sem banco, só CPU/RAM) e `GET /api/health/detalhes` a cada 30s (com banco). Isso permite capturar picos do ETL sem sobrecarregar o banco.
- `utils/monitorSistema.js` monitora `os.loadavg()[0] / nucleos` a cada 60s. Usa média de 1 minuto do Linux (não instantâneo) — pico de 25s do ETL não dispara alerta; precisa de ~60s de carga sustentada. Threshold padrão: 80% (configurável com `ALERTA_CPU_PORCENTO`). Cooldown de 30min entre alertas. Alerta só na transição normal→alto.
- `process.cpuUsage()` delta entre chamadas expõe CPU% do processo Node.js no endpoint `/live`; cálculo: `(user+system) / elapsed / núcleos × 100`
- Uptime: `formatarUptime` mostra segundos para uptimes < 1 min (ex: `45s`, `1min 30s`)
- **Failover ETL local → VPS**: tabela `etl_heartbeat` (id=1) gravada após cada ciclo bem-sucedido. VPS com `ETL_FAILOVER=true` faz apenas um SELECT leve antes de cada ciclo — zero Puppeteer se primária ativa; assume com `ETL_CONCURRENCY=4` se primária ausente > `ETL_FAILOVER_MINUTOS` (padrão 10min). Advisory lock ainda protege race conditions. Logs identificam a fonte: `[local]` ou `[vps]`.
- **Página Agente** (`/agente`, somente Admin): base de conhecimento do produto visível na interface. **Atualizar `frontend/src/pages/Agente.jsx` sempre que o CLAUDE.md for atualizado com novas decisões de produto, arquitetura ou stack.**
- **Responsividade mobile**: `h-dvh` (fix Safari URL bar); bottom tab bar fixo (`fixed bottom-0 md:hidden`) scrollável horizontalmente com todos os itens do perfil; `env(safe-area-inset-bottom)` para iPhone; `touch-action: manipulation` sem delay 300ms; `overscroll-behavior: none` sem bounce iOS.
- **Sidebar colapso desktop**: toggle chevron no header da sidebar; estado em `localStorage('tv_sidebar')`; modo icon-only (`w-14`) com tooltip; transição `duration-300`.
- **Dashboard master-detail mobile**: quando sem rota selecionada, mobile mostra lista de rotas (busca + chips + items); ao selecionar, mostra análise com botão "← Rotas" para voltar. Desktop mantém sidebar lateral.
- **Admin.jsx UX**: ícones compactos (lápis, share, lixeira) em vez de botões de texto; check de geometria à esquerda do lápis; nome da rota em linha separada acima dos botões; URL da rota removida da lista.
- **Sistema de avatar**: arquivo salvo em `public/upload/avatars/user-{id}-{timestamp}.ext`; servido via `/files/avatars/`; URL relativa armazenada em `users.avatarUrl`; vite proxy `/files` adicionado para dev. Silhueta SVG como fallback quando sem foto.
- **Página `/perfil`** (todos os usuários): editar nome, e-mail, senha + upload de avatar. `perfilId` é read-only para o próprio usuário — somente Admin pode alterar via `/usuarios`. `updateUser` no AuthContext atualiza estado+localStorage sem re-login.
- **`PUT /api/auth/me`**: endpoint para qualquer usuário editar seus próprios dados (sem perfilId). Auth inline via JWT sem depender do middleware eAdmin.
- **Usuarios.jsx**: mostra avatar no list; admin pode fazer upload (`POST /api/auth/usuarios/:id/avatar`) e remover foto (`DELETE /api/auth/usuarios/:id/avatar`) de qualquer usuário.
- **Volume persistente de avatares**: `docker-compose.yml` monta named volume `uploads` em `/app/public/upload` — avatares sobrevivem a qualquer redeploy. `.gitignore` inclui `public/upload/` para não commitar uploads locais.
- **Identidade visual atualizada**: sidebar, header mobile e bottom tab bar usam `#13335A` (azul marinho escuro) em vez de `#004A80`. `tailwind.config.js` com aliases semânticos: `primary` (#13335A), `secondary` (#2C678C), `background` (#ECEDED), `terciary` (#42B9EB). Body usa `#ECEDED` (`brand-gray-mid`). Scrollbar thumb `#13335A`.
- **Fix logout mobile**: bottom tab bar oculta (`hidden`) quando sidebar está aberta (`navOpen === true`) — elimina sobreposição z-index que impedia acesso ao botão "Sair" em telas pequenas (ex: Samsung Galaxy A07).
- **Mapa separado do Dashboard** (`/mapa`, todos os usuários): mapa Google Maps em página dedicada para evitar custo de API no carregamento do Dashboard. Clicar numa rota abre modal com `TimeChart`. Dashboard mantém apenas lista + gráficos.
- **Referência histórica no gráfico** (`TimeChart`): linha celeste tracejada mostra média das últimas 3 semanas, mesmo dia da semana de hoje, excluindo feriados. Parâmetro `diaSemanaRef` enviado pelo Dashboard. Tooltip mostra % de variação entre média do período e referência.
- **Card de hora atual vs. referência** (`StatsCards`): quando rota selecionada, exibe card com média da hora atual, média de referência histórica e % de variação — base para alertas aos gestores.
- **Monitor — filtros de status e variação**: botões "Todos/🔴 Acima/🟡 Normal/🟢 Abaixo" + limiar de variação (>5/25/50/75%) que aparece ao selecionar "Acima". Filtros são client-side (React state, sem nova chamada à API). Grid sem `max-w-7xl` — ocupa tela inteira.
- **RouteCard redesenhado**: estrutura header (nome completo com `break-words`, sem `truncate`) / main (tempo + variação) / footer (horário + contexto histórico "N leit. · Sábs · 3 sem.").
- **Saude — badge origem ETL**: `health.js /detalhes` inclui `etl.heartbeat` (source, lastRun, minutosAtras). `Saude.jsx` exibe badge 🟢 "Máquina local" ou 🔴 "VPS (failover)" atualizado a cada 30s.

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
8. [x] Browser persistente (`obterBrowser`) — elimina launch/close a cada ciclo
9. [x] 14 Chrome flags extras para reduzir CPU/memória por aba
10. [x] TAB_OPEN_DELAY reduzido de 2000ms → 500ms (+ `other` adicionado ao request interception)

### Módulo de Rotas — entregas aplicadas
1. [x] Autoria de rota (`creatorId`) — vinculação automática ao criar
2. [x] Permissões de edição/remoção por criador ou Admin
3. [x] Compartilhamento view-only por e-mail (`route_shares`)
4. [x] Categorização de rotas com agrupamento e filtro em `Admin.jsx`
5. [x] Página `/ajustes` para Admin reivindicar rotas órfãs
6. [x] `utils/rotasVisiveis.js` — helper de visibilidade centralizado
7. [x] Dashboard e Monitor filtram rotas por visibilidade do usuário
8. [x] Filtro de categoria por chips em Dashboard (sidebar) e Monitor (barra superior)
9. [x] Seção metodologia `🔐 Rotas, Permissões e Compartilhamento` com acordeão de FAQ

### Observabilidade e alertas — entregas aplicadas
1. [x] `GET /api/health` público — status básico para monitoramento externo
2. [x] `GET /api/health/detalhes` (soAdmin) — ETL config, email, memória+heapLimite, CPU load, uptime
3. [x] `GET /api/health/live` (soAdmin) — sem banco; loadavg, CPU% processo, memória; polled 1s
4. [x] `POST /api/health/test-email` (soAdmin) — dispara e-mail de teste sem esperar falhas
5. [x] `enviarAlertaEmail` loga warn quando vars não configuradas (era silencioso)
6. [x] `utils/monitorSistema.js` — alerta por e-mail quando CPU da VPS > threshold (padrão 80%); verifica a cada 60s usando `os.loadavg()[0]`; cooldown 30min
7. [x] Página `/saude` (Admin only) — dois ciclos: CPU/RAM ao vivo 1s + config 30s; heap usa `heapLimite` real; RSS como texto; uptime com segundos

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
ETL_TAB_DELAY=500
ETL_FAST_MODE=true
ETL_BROWSER_RECYCLE=12
VITE_GOOGLE_MAPS_KEY=<chave Google Maps API>
ALERT_EMAIL=<gmail>
ALERT_EMAIL_PASS=<app password>
ALERT_EMAIL_TO=<destinatário>
ALERTA_CPU_PORCENTO=80
```

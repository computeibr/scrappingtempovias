# Tempovias — Monitoramento de Rotas do Google Maps

Plataforma full-stack para monitoramento automático do tempo de viagem em rotas urbanas. O backend coleta dados do Google Maps a cada 5 minutos via Puppeteer; o frontend (React) exibe dashboards interativos com mapa de rotas, gráficos de variação por hora e filtros históricos.

---

## Como funciona

1. O usuário cadastra uma rota no banco de dados (`tv_tempo_via`) com um nome e a URL do Google Maps contendo os pontos definidos da rota.
2. A cada **5 minutos**, um job `node-cron` dispara o processo de scraping (e também roda imediatamente ao iniciar).
3. O Puppeteer abre o Google Maps em modo headless e extrai o **tempo estimado** (em minutos ou horas) e a **distância** (em km) daquela rota **no momento atual**.
4. Os dados são salvos na tabela `tempovias` com timestamp, permitindo visualizar como o trânsito varia ao longo do dia e da semana.

```
[Rota cadastrada no banco]
        ↓
[Cron a cada 5min]
        ↓
[Puppeteer abre Google Maps com a URL da rota]
        ↓
[Extrai tempo (min) e distância (km)]
        ↓
[Salva em tempovias com timestamp]
```

---

## Estrutura do projeto

```
├── app.js                      # Servidor Express — API + serve do frontend
├── Dockerfile                  # Multi-stage: build frontend + Node prod com Chromium
├── docker-compose.yml          # Serviços: postgres:15-alpine + app
├── init.sql                    # Schema inicial do PostgreSQL (criado automaticamente)
├── .env.example                # Modelo das variáveis de ambiente
├── controller/
│   ├── etl.js                  # Scraping + cron job (a cada 5 min, roda ao iniciar também)
│   ├── rotasvia.js             # Rota legada usada pelo scraper
│   ├── auth.js                 # Login JWT + criação de usuário
│   └── dashboard.js            # API do dashboard (resumo, histórico, snapshot, últimas)
├── models/
│   ├── db.js                   # Conexão Sequelize — PostgreSQL (suporte a SSL via env)
│   ├── User.js                 # Model de usuários
│   ├── rotasvia.js             # Model tv_tempo_via
│   └── tempovias.js            # Model tempovias
├── middlewares/
│   ├── auth.js                 # Verificação JWT (eAdmin)
│   └── acl.js                  # Controle de perfil
└── frontend/                   # React + Vite (interface web)
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx       # Tela de login
    │   │   └── Dashboard.jsx   # Dashboard principal
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Sidebar.jsx     # Lista de rotas + seleção
    │   │   ├── RouteMap.jsx    # Mapa Google Maps com DirectionsService
    │   │   ├── TimeChart.jsx   # Gráfico Recharts (variação por hora, banda min-max)
    │   │   ├── StatsCards.jsx  # Cards de resumo
    │   │   └── FilterPanel.jsx # Filtros de data e dia da semana
    │   ├── contexts/
    │   │   └── AuthContext.jsx # Gerenciamento de sessão JWT
    │   ├── services/api.js     # Axios com interceptors
    │   └── utils/mapUtils.js   # Parser de URLs do Google Maps
    └── dist/                   # Build servido pelo Express em produção
```

---

## Banco de dados

O banco utilizado é **PostgreSQL** (migrado do SQL Server). O schema é criado automaticamente pelo `init.sql` na primeira vez que o container sobe.

### Tabela `tv_tempo_via` — Rotas cadastradas
| Campo      | Tipo         | Descrição                            |
|------------|--------------|--------------------------------------|
| id         | SERIAL PK    | Identificador da rota                |
| name       | VARCHAR(100) | Nome amigável da rota                |
| url        | TEXT         | URL do Google Maps com os waypoints  |
| geometry   | TEXT         | Traçado da rota (geométrico)         |
| createdAt  | TIMESTAMPTZ  | Data de criação                      |
| updatedAt  | TIMESTAMPTZ  | Data de atualização                  |

### Tabela `tempovias` — Histórico de tempos
| Campo      | Tipo         | Descrição                                      |
|------------|--------------|------------------------------------------------|
| id         | SERIAL PK    | Identificador do registro                      |
| viaId      | INTEGER FK   | Referência à rota (`tv_tempo_via.id`)          |
| nomedarota | VARCHAR(255) | Nome da rota (desnormalizado)                  |
| tempo      | VARCHAR(255) | Tempo extraído do Google Maps (ex: "23 min")   |
| km         | VARCHAR(255) | Distância extraída (ex: "12,4 km")             |
| leitura    | TIMESTAMPTZ  | Timestamp da leitura                           |
| urlfoto    | VARCHAR(255) | URL de foto da rota (opcional)                 |
| createdAt  | TIMESTAMPTZ  | Data de criação                                |
| updatedAt  | TIMESTAMPTZ  | Data de atualização                            |

### Tabela `users` — Usuários do sistema
| Campo    | Tipo         | Descrição                           |
|----------|--------------|-------------------------------------|
| id       | SERIAL PK    | Identificador do usuário            |
| name     | VARCHAR(100) | Nome completo                       |
| email    | VARCHAR(150) | E-mail único                        |
| password | VARCHAR(255) | Senha hasheada com bcrypt           |
| perfilId | INTEGER      | Perfil: 1=usuário, 99=admin         |

---

## Configuração

### Pré-requisitos

- Node.js >= 18
- Docker + Docker Compose (para produção via EasyPanel)
- Chave da **Google Maps JavaScript API** (com Directions API habilitada)

### Variáveis de ambiente — Backend (`.env` na raiz)

```env
PORT=3001
SECRET=uma_string_secreta_para_jwt

DB=nome_do_banco
DB_USER=usuario
DB_PASS=senha
DB_HOST=host_do_servidor
DB_PORT=5432
DB_SSL=false
```

### Variáveis de ambiente — Frontend (`frontend/.env`)

```env
VITE_GOOGLE_MAPS_KEY=sua_chave_google_maps
```

> Ambos os `.env` estão no `.gitignore` e **nunca devem ser commitados**.
> Use `.env.example` como referência.

---

## Instalação e execução

### Desenvolvimento (dois terminais)

```bash
# Terminal 1 — Backend (porta 3001)
npm install
npm run dev

# Terminal 2 — Frontend (porta 3000, proxy para 3001)
cd frontend
npm run dev
```

Acesse `http://localhost:3000`

### Produção via Docker (EasyPanel / VPS)

O `Dockerfile` usa **multi-stage build**:
- **Stage 1:** `node:18-alpine` — instala deps do frontend e faz `npm run build`
- **Stage 2:** `node:18-alpine` + Chromium (via apk) — instala deps de produção e sobe o servidor

```bash
# Build e start local (se tiver Docker)
docker compose up --build

# No EasyPanel: aponte para o repositório Git — o docker-compose.yml é lido automaticamente
```

**Variáveis a configurar no EasyPanel:**
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

### Criar primeiro usuário (admin)

```bash
# Via curl — rode enquanto o backend está no ar
curl -X POST http://localhost:3001/api/auth/criar-usuario \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@cetrio.rio","password":"suasenha","perfilId":99}'
```

---

## Endpoints da API

| Método | Rota                              | Auth | Descrição                                      |
|--------|-----------------------------------|------|------------------------------------------------|
| POST   | `/api/auth/login`                 | —    | Autenticação, retorna JWT                      |
| POST   | `/api/auth/criar-usuario`         | —    | Cria novo usuário                              |
| GET    | `/api/dashboard/resumo`           | JWT  | Contadores gerais                              |
| GET    | `/api/dashboard/rotas`            | JWT  | Lista todas as rotas                           |
| GET    | `/api/dashboard/historico/:id`    | JWT  | Médias por hora + evolução diária com filtros  |
| GET    | `/api/dashboard/snapshot`         | JWT  | Última leitura de cada rota (para popup mapa)  |
| GET    | `/api/dashboard/ultimas/:id`      | JWT  | Últimas leituras com paginação                 |
| GET    | `/rota/rotasvia`                  | —    | Legado — usado pelo scraper interno            |

**Parâmetros de `/historico/:id`:**
- `dataInicio` / `dataFim` — `YYYY-MM-DD` (padrão: últimos 30 dias)
- `diasSemana` — `0,1,2,3,4,5,6` (Dom=0, Sab=6)
- Resposta inclui: `mediasPorHora` (média, min, max por hora), `evolucaoDiaria`, `totalRegistros`

**Parâmetros de `/ultimas/:id`:**
- `page` — número da página (padrão: 1)
- `limite` — registros por página (padrão: 20, máx: 100)
- `dataInicio` / `dataFim` — filtro de período (ISO 8601)

---

## Dependências principais

### Backend
| Pacote         | Uso                                        |
|----------------|--------------------------------------------|
| `puppeteer`    | Scraping headless do Google Maps           |
| `node-cron`    | Agendamento do job a cada 5 minutos        |
| `sequelize`    | ORM para PostgreSQL                        |
| `pg`           | Driver PostgreSQL                          |
| `express`      | Servidor HTTP                              |
| `bcryptjs`     | Hash de senhas                             |
| `jsonwebtoken` | Autenticação JWT                           |
| `luxon`        | Manipulação de datas/fuso (America/Sao_Paulo) |
| `moment`       | Formatação de timestamps (legado)          |

### Frontend
| Pacote                   | Uso                                    |
|--------------------------|----------------------------------------|
| `react` + `vite`         | SPA com build rápido                   |
| `@react-google-maps/api` | Mapa interativo + DirectionsService    |
| `recharts`               | Gráfico de variação por hora           |
| `tailwindcss`            | Estilização (cores da Prefeitura Rio)  |
| `react-router-dom`       | Roteamento client-side                 |
| `react-datepicker`       | Seletor de intervalo de datas          |
| `axios`                  | Requisições HTTP com interceptors JWT  |

---

## Observações

- O cron possui uma **flag de controle** (`isRunning`) que impede execuções paralelas.
- O Puppeteer roda em modo `headless: 'new'`, adequado para servidores sem display.
- No Docker, o Chromium é instalado via Alpine (`apk`) — `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`.
- Cada rota tem até **2 tentativas** em caso de falha antes de ser ignorada no ciclo.
- O fuso horário em toda a aplicação é **America/Sao_Paulo**.
- O `init.sql` é executado automaticamente pelo container do PostgreSQL apenas na **primeira inicialização** (quando o volume está vazio).
- As cores da interface seguem o **Manual de Marca da Prefeitura do Rio de Janeiro (2022)**:
  - Azul marinho primário `#004A80`, azul celeste `#00C0F3`, laranja `#E95F3E`.

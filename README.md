# Tempovias — Monitoramento de Rotas do Google Maps

Plataforma full-stack para monitoramento automático do tempo de viagem em rotas urbanas. O backend coleta dados do Google Maps a cada 5 minutos via Puppeteer; o frontend (React) exibe dashboards interativos com mapa de rotas, gráficos de variação por hora e filtros históricos.

**Stack:** Node.js + Express + Sequelize + Puppeteer · React 18 + Vite + Tailwind · PostgreSQL · Docker + EasyPanel

---

## Quick Start — desenvolvimento local

```bash
# Pré-requisitos: Node.js ≥ 18, PostgreSQL acessível, Google Maps API Key

# 1. Clone e instale dependências
git clone <repo>
npm install
cd frontend && npm install && cd ..

# 2. Configure as variáveis de ambiente
cp .env.example .env              # edite com suas credenciais
cp frontend/.env.example frontend/.env   # adicione VITE_GOOGLE_MAPS_KEY

# 3. Inicialize o banco (execute uma vez no PostgreSQL)
psql -h <DB_HOST> -U <DB_USER> -d <DB> -f init.sql

# 4. Suba os dois processos (terminais separados)
npm run dev          # backend → http://localhost:3001
cd frontend && npm run dev   # frontend → http://localhost:3000
```

Acesse `http://localhost:3000`. O primeiro usuário Admin deve ser criado [via SQL](#criar-primeiro-usuário-admin) (o endpoint `/criar-usuario` exige autenticação de Admin).

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
├── app.js                      # Entry point: Express + carga condicional do ETL
├── Dockerfile                  # Multi-stage: build frontend Vite + Node prod com Chromium
├── docker-compose.yml          # Serviço único: app (postgres gerenciado pelo EasyPanel)
├── init.sql                    # Schema completo do PostgreSQL — safe para re-execução
├── .env.example                # Modelo das variáveis de ambiente (backend)
├── controller/
│   ├── etl.js                  # Worker pool Puppeteer + cron 5 min + advisory lock PG
│   ├── auth.js                 # Login JWT + CRUD de usuários (somente Admin)
│   ├── dashboard.js            # API do dashboard filtrada por visibilidade do usuário
│   ├── monitor.js              # GET /api/monitor — variação vs. média histórica por rota
│   ├── rotasvia.js             # CRUD de rotas + autoria + compartilhamento + órfãs
│   ├── health.js               # /api/health: status público + /detalhes + /live (soAdmin)
│   └── feriados.js             # CRUD de dias não úteis
├── models/
│   ├── db.js                   # Sequelize dialect postgres (suporte a DB_SSL)
│   ├── User.js                 # Tabela users
│   ├── rotasvia.js             # Tabela tv_tempo_via
│   ├── routeShare.js           # Tabela route_shares (compartilhamento view-only)
│   └── tempovias.js            # Tabela tempovias (histórico de leituras)
├── middlewares/
│   ├── auth.js                 # eAdmin (qualquer logado) + soAdmin (perfilId=99)
│   └── acl.js                  # Helper de lista de perfilIds (menos usado)
├── utils/
│   ├── rotasVisiveis.js        # Lógica centralizada de visibilidade de rotas por usuário
│   └── monitorSistema.js       # Alerta por e-mail quando CPU da VPS > threshold (60s)
└── frontend/                   # React + Vite (interface web)
    ├── src/
    │   ├── pages/
    │   │   ├── Login.jsx           # Autenticação JWT
    │   │   ├── Dashboard.jsx       # Mapa + gráfico + filtros históricos
    │   │   ├── Admin.jsx           # CRUD de rotas (perfilId ≥ 2)
    │   │   ├── Ajustes.jsx         # Reivindicar rotas órfãs (somente Admin 99)
    │   │   ├── Saude.jsx           # CPU/RAM ao vivo + status ETL (somente Admin 99)
    │   │   ├── Usuarios.jsx        # CRUD de usuários (somente Admin 99)
    │   │   ├── Monitor/            # Cards por rota com variação vs. histórico
    │   │   ├── Feriados/           # Dias não úteis (listagem + CRUD admin)
    │   │   └── Metodologia/        # Documentação técnica em acordeão
    │   ├── components/
    │   │   ├── AppShell.jsx        # Shell principal: sidebar + header mobile
    │   │   ├── RouteMap.jsx        # Google Maps + DirectionsService
    │   │   ├── TimeChart.jsx       # Gráfico Recharts (variação por hora, banda min-max)
    │   │   ├── StatsCards.jsx      # Cards de resumo
    │   │   └── FilterPanel.jsx     # Filtros de data e dia da semana
    │   ├── contexts/
    │   │   └── AuthContext.jsx     # JWT no localStorage (tv_token, tv_user)
    │   ├── services/api.js         # Axios com interceptors JWT
    │   └── utils/mapUtils.js       # Parser de URLs do Google Maps
    └── dist/                       # Build Vite servido pelo Express em produção
```

---

## Banco de dados

O banco utilizado é **PostgreSQL** (migrado do SQL Server). O schema é criado automaticamente pelo `init.sql` na primeira vez que o container sobe.

### Tabela `tv_tempo_via` — Rotas cadastradas
| Campo      | Tipo         | Descrição                                            |
|------------|--------------|------------------------------------------------------|
| id         | SERIAL PK    | Identificador da rota                                |
| name       | VARCHAR(100) | Nome amigável da rota                                |
| url        | TEXT         | URL do Google Maps com os waypoints                  |
| geometry   | TEXT         | Traçado da rota (geométrico)                         |
| categoria  | VARCHAR(100) | Agrupamento livre da rota (ex: "Corredor Oeste")     |
| creatorId  | INTEGER FK   | Usuário que criou a rota (FK → users.id, pode ser NULL para rotas legadas) |
| createdAt  | TIMESTAMPTZ  | Data de criação                                      |
| updatedAt  | TIMESTAMPTZ  | Data de atualização                                  |

### Tabela `tempovias` — Histórico de tempos
| Campo      | Tipo         | Descrição                                      |
|------------|--------------|------------------------------------------------|
| id         | SERIAL PK    | Identificador do registro                      |
| viaId      | INTEGER FK   | Referência à rota (`tv_tempo_via.id`)          |
| nomedarota | VARCHAR(255) | Nome da rota (desnormalizado)                  |
| tempo      | VARCHAR(255) | Tempo extraído do Google Maps (ex: "23 min")   |
| km         | VARCHAR(255) | Distância extraída (ex: "12,4 km" ou "250 m")  |
| leitura    | TIMESTAMPTZ  | Timestamp da leitura                           |
| urlfoto    | VARCHAR(255) | URL de foto da rota (opcional)                 |
| createdAt  | TIMESTAMPTZ  | Data de criação                                |
| updatedAt  | TIMESTAMPTZ  | Data de atualização                            |

### Tabela `users` — Usuários do sistema
| Campo    | Tipo         | Descrição                                      |
|----------|--------------|------------------------------------------------|
| id       | SERIAL PK    | Identificador do usuário                       |
| name     | VARCHAR(100) | Nome completo                                  |
| email    | VARCHAR(150) | E-mail único                                   |
| password | VARCHAR(255) | Senha hasheada com bcrypt                      |
| perfilId | INTEGER      | Perfil: **1=View** (só leitura), **2=User** (gerencia suas rotas), **99=Admin** (acesso total) |
| avatarUrl | VARCHAR(500) | URL da foto de perfil (ex: `/files/avatars/user-1-123.jpg`) — nullable |

### Tabela `route_shares` — Compartilhamento de rotas
| Campo    | Tipo         | Descrição                                      |
|----------|--------------|------------------------------------------------|
| id       | SERIAL PK    | Identificador                                  |
| routeId  | INTEGER FK   | Rota compartilhada (FK → tv_tempo_via.id)      |
| email    | VARCHAR(150) | E-mail do usuário com acesso view-only         |
| createdAt | TIMESTAMPTZ | Data do compartilhamento                       |

> UNIQUE em (routeId, email). Compartilhamento é somente leitura — o e-mail recebe acesso ao dashboard, mas não pode editar ou remover a rota.

---

## Configuração

### Pré-requisitos

- Node.js >= 18
- Docker + Docker Compose (para produção via EasyPanel)
- Chave da **Google Maps JavaScript API** (com Directions API habilitada)

### Variáveis de ambiente — Backend (`.env` na raiz)

Copie `.env.example` para `.env` e preencha:

```env
PORT=3001
SECRET=<string aleatória forte — ex: openssl rand -hex 32>

# PostgreSQL
DB=tempovias
DB_USER=tempovias_user
DB_PASS=<senha>
DB_HOST=localhost        # em Docker: nome do serviço (ex: postgres)
DB_PORT=5432
DB_SSL=false             # true para bancos externos com SSL (Supabase, Neon, etc.)

# ETL / Scraping — só importa se ETL_ENABLED=true
ETL_ENABLED=true         # false desativa o scraping completamente
ETL_CONCURRENCY=8        # abas Puppeteer paralelas (produção usa 20 com 8 cores/32 GB)
ETL_FAST_MODE=true       # true = domcontentloaded+3s (padrão); false = networkidle2
ETL_TAB_DELAY=500        # delay em ms entre abertura de cada aba
ETL_BROWSER_RECYCLE=12   # ciclos antes de reciclar o Chromium (≈1h com cron de 5min)

# Alertas por e-mail (opcional — deixar vazio para desativar)
ALERT_EMAIL=seu@gmail.com
ALERT_EMAIL_PASS=<app password de 16 caracteres>
ALERT_EMAIL_TO=destinatario@email.com
ALERTA_CPU_PORCENTO=80   # alerta quando CPU da VPS ultrapassar este %
```

> Requer **App Password** do Gmail (não a senha normal) quando 2FA está ativo.
> Gere em: Conta Google → Segurança → Senhas de apps.

### Variáveis de ambiente — Frontend (`frontend/.env`)

```env
VITE_GOOGLE_MAPS_KEY=sua_chave_google_maps
```

> Ambos os `.env` estão no `.gitignore` e **nunca devem ser commitados**.
> Use `.env.example` como referência.

---

## Modos de execução

O sistema tem **dois modos** de execução, com comportamentos distintos:

### Modo desenvolvimento (local)
- **Backend** (Express) roda na porta `3001`
- **Frontend** (Vite dev server) roda na porta `3000`, com proxy automático para a API em `3001`
- Hot reload ativo — alterações refletem imediatamente sem precisar buildar
- Acesse o sistema em `http://localhost:3000`

### Modo produção local (PM2 + ETL)
- O Express serve o build do Vite (`frontend/dist/`) na porta `3001`
- PM2 gerencia o processo — `pm2 start ecosystem.config.js`
- `ETL_ENABLED=true` no `.env` local ativa o Puppeteer
- Acesse em `http://localhost:3001`

### Modo produção VPS (Docker + EasyPanel)
- O Dockerfile compila o frontend (Stage 1) e sobe o Express (Stage 2)
- `ETL_ENABLED=false` configurado no EasyPanel — sem scraping na VPS
- Frontend + API na porta `3001`, servidos pelo container

---

## Instalação e execução

### Desenvolvimento (dois terminais)

```bash
# Terminal 1 — Backend (porta 3001)
npm install
npm run dev

# Terminal 2 — Frontend (porta 3000, proxy para 3001)
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:3000`

> O banco de dados deve estar acessível com as credenciais do `.env`. Todos os `.sync()` do Sequelize estão **comentados** — o schema é criado pelo `init.sql`. Execute o `init.sql` manualmente uma vez no banco antes de subir.

### Produção local com PM2 (máquina que roda o ETL)

```bash
# Primeira vez — instalar dependências e buildar o frontend
npm install
cd frontend && npm install && npm run build && cd ..

# Instalar PM2 globalmente (apenas na primeira vez)
npm install -g pm2

# Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save                        # persiste na inicialização do sistema

# Atualizar após mudanças no código
cd frontend && npm run build && cd ..
pm2 restart my-app
```

> Para reiniciar automaticamente após reboot no Windows: `pm2-windows-startup install`

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

O endpoint `/api/auth/criar-usuario` **exige autenticação de Admin** (perfilId=99). Para o bootstrap inicial (sem nenhum admin ainda), insira o usuário diretamente no banco:

```bash
# 1. Gere o hash bcrypt da senha desejada
node -e "const b=require('bcryptjs'); b.hash('SuaSenhaForte123',10).then(h=>console.log(h))"
# Copie o hash gerado (começa com $2b$10$...)

# 2. Insira o usuário diretamente no PostgreSQL
psql -h <DB_HOST> -U <DB_USER> -d <DB> -c \
  "INSERT INTO users (name, email, password, \"perfilId\") VALUES ('Admin', 'seu@email.com', '<HASH>', 99);"
```

Após ter o primeiro Admin no banco, os demais usuários são criados via interface (`/usuarios`) ou pelo endpoint com JWT de Admin.

---

## Endpoints da API

| Método | Rota                                        | Auth    | Descrição                                              |
|--------|---------------------------------------------|---------|--------------------------------------------------------|
| POST   | `/api/auth/login`                           | —       | Autenticação, retorna JWT                              |
| POST   | `/api/auth/criar-usuario`                   | Admin   | Cria novo usuário (perfilId: 1, 2 ou 99)               |
| GET    | `/api/auth/usuarios`                        | Admin   | Lista todos os usuários                                |
| PUT    | `/api/auth/usuarios/:id`                    | Admin   | Edita usuário (nome, e-mail, perfil, senha)            |
| DELETE | `/api/auth/usuarios/:id`                    | Admin   | Remove usuário (não pode auto-remover)                 |
| GET    | `/api/dashboard/resumo`                     | JWT     | Contadores filtrados por visibilidade do usuário       |
| GET    | `/api/dashboard/rotas`                      | JWT     | Rotas visíveis ao usuário                              |
| GET    | `/api/dashboard/historico/:id`              | JWT     | Médias por hora + evolução diária com filtros          |
| GET    | `/api/dashboard/snapshot`                   | JWT     | Última leitura das rotas visíveis (mapa)               |
| GET    | `/api/dashboard/ultimas/:id`                | JWT     | Últimas leituras com paginação                         |
| GET    | `/api/monitor`                              | JWT     | Rotas com variação vs. média histórica + categoria     |
| GET    | `/api/health`                               | —       | Status público: ok, última leitura, ETL ativo          |
| GET    | `/api/health/live`                          | Admin   | CPU/RAM ao vivo sem banco (polled a cada 1s)           |
| GET    | `/api/health/detalhes`                      | Admin   | ETL config, memória, uptime, email                     |
| POST   | `/api/health/test-email`                    | Admin   | Dispara e-mail de teste imediatamente                  |
| GET    | `/api/rotas/rotasvia/minhas`                | JWT     | Rotas visíveis ao usuário (suas + legadas + compartilhadas) |
| GET    | `/api/rotas/rotasvia/orfas`                 | Admin   | Rotas sem creatorId                                    |
| POST   | `/api/rotas/rotasvia`                       | JWT     | Cria rota (vincula creatorId automaticamente)          |
| PUT    | `/api/rotas/rotasvia/:id`                   | JWT     | Edita rota (criador ou Admin)                          |
| DELETE | `/api/rotas/rotasvia/:id`                   | JWT     | Remove rota (criador ou Admin)                         |
| POST   | `/api/rotas/rotasvia/:id/compartilhar`      | JWT     | Adiciona e-mail ao compartilhamento (criador ou Admin) |
| DELETE | `/api/rotas/rotasvia/:id/compartilhar/:email` | JWT   | Remove e-mail do compartilhamento                      |
| POST   | `/api/rotas/rotasvia/orfas/assumir`         | Admin   | Atribui creatorId a rotas órfãs (array de IDs ou vazio=todas) |
| GET    | `/rota/rotasvia`                            | —       | Legado — usado pelo scraper interno (sem auth)         |

**Parâmetros de `/historico/:id`:**
- `dataInicio` / `dataFim` — `YYYY-MM-DD` (padrão: últimos 30 dias)
- `diasSemana` — `0,1,2,3,4,5,6` (Dom=0, Sab=6)
- Resposta inclui: `mediasPorHora` (média, min, max por hora), `evolucaoDiaria`, `totalRegistros`

**Parâmetros de `/ultimas/:id`:**
- `page` — número da página (padrão: 1)
- `limite` — registros por página (padrão: 20, máx: 100)
- `dataInicio` / `dataFim` — filtro de período (ISO 8601)

---

## Endpoints adicionais (Monitor, Feriados)

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/api/monitor` | JWT | Todas as rotas com tempo atual e variação vs. média histórica |
| GET | `/api/feriados` | JWT | Lista dias não úteis cadastrados |
| POST | `/api/feriados` | JWT Admin | Cadastra dia não útil (data, descrição, tipo) |
| DELETE | `/api/feriados/:id` | JWT Admin | Remove dia não útil |

**Resposta de `/api/monitor` por rota:**
```json
{
  "id": 1,
  "nome": "Centro → Barra",
  "url": "https://www.google.com/maps/dir/...",
  "leituraAtual": { "tempo": "45 min", "tempoMinutos": 45, "km": "28,3 km", "leitura": "2026-04-06T14:30:00Z" },
  "mediaHistorica": { "media": 36.7, "baseadoEm": 12 },
  "variacao": 22.6,
  "status": "acima"
}
```

**Tipos de status:** `acima` (> +5%) · `normal` (±5%) · `abaixo` (< -5%) · `sem_historico` · `sem_dados`

---

## Páginas do frontend

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/perfil` | Autenticado | Editar nome, e-mail, senha e foto de perfil (perfilId somente Admin) |
| `/` | Autenticado | Dashboard — lista de rotas + gráfico + referência histórica; mobile com lista de rotas como tela inicial |
| `/mapa` | Autenticado | Mapa Google Maps — todas as rotas; clicar abre modal com gráfico da rota |
| `/monitor` | Autenticado | Monitor em tempo real — cards com variação vs. histórico, filtros de status e limiar %, auto-refresh 2 min |
| `/feriados` | Autenticado | Dias não úteis — listagem pública, cadastro/remoção somente admin |
| `/metodologia` | Autenticado | Documentação técnica — metodologia de coleta, cálculos e perguntas frequentes |
| `/admin` | perfilId ≥ 2 | Gerenciar rotas — cadastro e edição com preview do traçado no mapa (fitBounds automático) + validação visual de campos obrigatórios |
| `/agente` | Admin (99) | Base de conhecimento do produto — stack, arquitetura, ETL, variáveis |
| `/saude` | Admin (99) | CPU/RAM ao vivo, status ETL, origem do ETL (local ou VPS failover) |
| `/login` | Público | Autenticação JWT |

---

## Arquitetura em produção — dois ambientes, um banco

```
[Máquina local — Node.js + PM2]     [VPS — Docker + EasyPanel]
  ETL_ENABLED=true                    ETL_ENABLED=false
  Puppeteer coleta Google Maps         Express API + Frontend
  node-cron a cada 5 min               Sem Puppeteer/Chromium
  ecosystem.config.js                  docker-compose.yml
        ↓                                     ↓
        └──────── PostgreSQL (VPS) ───────────┘
                  (banco único, compartilhado)
```

- **Local (PM2):** coleta dados, salva no banco da VPS via PostgreSQL remoto. PM2 + `pm2-windows-startup` reinicia após quedas de energia.
- **VPS (Docker):** apenas serve a API e o frontend. `ETL_ENABLED=false` configurado no EasyPanel — nunca roda Puppeteer.
- A cada `git push` para `main`, o EasyPanel faz redeploy automático do container da VPS.

### ETL — arquitetura resumida

- **Worker pool dinâmico**: até `ETL_CONCURRENCY` abas Puppeteer simultâneas com fila compartilhada
- **Browser persistente**: Chromium reutilizado entre ciclos; reciclado após `ETL_BROWSER_RECYCLE` ciclos
- **Advisory lock PostgreSQL** (`pg_try_advisory_lock`): lock no nível do banco — impede dois processos (mesmo em máquinas diferentes) de escrever ao mesmo tempo
- **Dedup de 3 min**: segunda barreira — descarta leitura se já existe registro do mesmo `viaId` nos últimos 3 min
- **Request interception**: bloqueia imagens, fontes e CSS — Maps só precisa de JS/XHR para calcular tempo/km

---

## Metodologia de cálculo (Monitor)

A variação exibida nos cards do Monitor é calculada como:

```
variação (%) = ((tempo_atual − média_histórica) / média_histórica) × 100
```

**Filtros aplicados à média histórica:**
- Mesma hora do dia (ex: leitura às 17h → compara com leituras às 17h)
- Mesmo dia da semana (ex: sexta → compara com sextas anteriores)
- Últimas 3 semanas (21 dias)
- Exclui dias cadastrados em `dias_nao_uteis` (feriados e pontos facultativos)

A tolerância de ±5% evita falsos alertas por variações naturais. Documentação completa em [`biblioteca/`](biblioteca/).

---

## Banco de dados — tabela adicional

### Tabela `dias_nao_uteis` — Feriados e pontos facultativos
| Campo | Tipo | Descrição |
|---|---|---|
| id | SERIAL PK | Identificador |
| data | DATE UNIQUE | Data do dia não útil |
| descricao | VARCHAR(150) | Nome do feriado/evento |
| tipo | VARCHAR(50) | `feriado_nacional`, `feriado_municipal`, `ponto_facultativo` |

Pré-populada com feriados nacionais e municipais do Rio de Janeiro de 2025 e 2026.

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

## Deploy na VPS com EasyPanel

### Pré-requisitos
- VPS com EasyPanel instalado
- Banco PostgreSQL já rodando e acessível (host, porta, usuário, senha, nome do banco)
- Repositório no GitHub (público ou privado com acesso configurado)
- Chave da Google Maps JavaScript API

---

### Passo 1 — Conectar o repositório no EasyPanel

1. Acesse o EasyPanel no navegador (`http://IP-da-VPS:3000`)
2. Crie um novo **Project**
3. Dentro do projeto, clique em **Create Service → App**
4. Em **Source**, selecione **GitHub** e autorize o acesso ao repositório `scrappingtempovias`
5. Branch: `main`

---

### Passo 2 — Configurar o build

No painel da service:

- **Build method:** `Dockerfile` (o EasyPanel detecta automaticamente)
- O `docker-compose.yml` **não é usado** diretamente pelo EasyPanel — ele gerencia os containers. As variáveis de ambiente são configuradas no painel.

---

### Passo 3 — Configurar as variáveis de ambiente

Na aba **Environment** da service, adicione:

```
PORT=3001
SECRET=<string aleatória forte — ex: openssl rand -hex 32>
DB=tempovias
DB_USER=tempovias_user
DB_PASS=<senha do banco>
DB_HOST=<host do PostgreSQL — geralmente o nome do serviço postgres no EasyPanel>
DB_PORT=5432
DB_SSL=false
ETL_ENABLED=true
ETL_CONCURRENCY=20
ETL_FAST_MODE=true
ETL_TAB_DELAY=500
ETL_BROWSER_RECYCLE=12
VITE_GOOGLE_MAPS_KEY=<sua chave Google Maps API>
ALERT_EMAIL=<gmail para alertas — opcional>
ALERT_EMAIL_PASS=<app password Gmail — opcional>
ALERT_EMAIL_TO=<destinatário — opcional>
ALERTA_CPU_PORCENTO=80
```

> O `docker-compose.yml` tem `ETL_ENABLED: ${ETL_ENABLED:-true}` — **o default é `true`**. Defina explicitamente `ETL_ENABLED=false` se não quiser scraping nesse container.

---

### Passo 4 — Configurar o domínio / porta

Na aba **Domains** da service:

- Adicione o domínio ou subdomínio desejado
- Porta interna: `3001`
- Ative HTTPS se disponível (Let's Encrypt)

---

### Passo 5 — Fazer o deploy

1. Clique em **Deploy** (ou **Build & Deploy**)
2. Acompanhe os logs de build — o processo tem duas etapas:
   - **Stage 1:** instala deps do frontend e roda `vite build` (usa `VITE_GOOGLE_MAPS_KEY`)
   - **Stage 2:** instala deps de produção do backend e sobe `node app.js`
3. Quando aparecer `Tempovias API rodando na porta 3001`, o deploy foi concluído

---

### Passo 6 — Criar o primeiro usuário admin

O endpoint `/api/auth/criar-usuario` exige JWT de Admin. Para o bootstrap inicial, acesse o banco diretamente pelo console do EasyPanel ou via `psql`:

```bash
# Gere o hash da senha (Node deve estar disponível)
node -e "const b=require('bcryptjs'); b.hash('SuaSenhaForte123',10).then(h=>console.log(h))"

# Insira o admin diretamente no PostgreSQL
psql -h <DB_HOST> -U <DB_USER> -d <DB> -c \
  "INSERT INTO users (name, email, password, \"perfilId\") VALUES ('Admin', 'seu@email.com', '<HASH>', 99);"
```

Após ter o primeiro Admin, os demais usuários são criados pela interface (`/usuarios`).

---

### Atualizações futuras

A cada novo `git push` para `main`, o EasyPanel detecta automaticamente e faz o redeploy — não é necessário acessar o servidor.

---

## Migrações de banco de dados

O Sequelize está com todos os `.sync()` **comentados** — o schema é criado exclusivamente pelo `init.sql`. Para adicionar novas colunas ou tabelas:

1. Adicione `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ao `init.sql` (seguro para re-execução)
2. Execute o comando manualmente em produção — o `init.sql` só roda automaticamente no **primeiro boot** do container PostgreSQL (quando o volume está vazio)
3. Atualize o model Sequelize correspondente

```sql
-- Exemplo de migração manual em produção:
ALTER TABLE tv_tempo_via ADD COLUMN IF NOT EXISTS nova_coluna VARCHAR(100);
```

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

---

## Contexto de Desenvolvimento

> **Instrução mestre para o assistente de IA.** Esta seção consolida todas as decisões de produto, arquitetura e padrões de código acordados ao longo do desenvolvimento. Ao receber uma nova tarefa, consulte este contexto antes de qualquer implementação.

---

### Modelo de negócios

O sistema atende à **CETRIO / Prefeitura do Rio de Janeiro** com o objetivo de monitorar o trânsito em rotas urbanas de forma contínua e automatizada.

**Dois ambientes, um banco:**

| Ambiente | Função | Tecnologia | ETL_ENABLED |
|---|---|---|---|
| Máquina local do cliente | Scraping a cada 5 min + backend + frontend | Node.js + PM2 + Windows | `true` |
| VPS (EasyPanel) | Backend + frontend apenas (sem scraping) | Docker + Node.js | `false` (padrão no Dockerfile) |

- A máquina local coleta e salva os dados. A VPS apenas exibe. Ambos usam o **mesmo PostgreSQL** na VPS.
- PM2 + `pm2-windows-startup` garante que o scraping recomece automaticamente após quedas de energia na máquina local.
- A variável `ETL_ENABLED` controla isso — **nunca remover essa verificação do `app.js`**.

---

### Regras de negócio consolidadas

#### Perfis de usuário
- `perfilId = 1` → Usuário comum (visualização)
- `perfilId = 99` → Administrador (cadastrar rotas, feriados, editar/remover)
- Operações destrutivas e de cadastro **sempre** verificadas via middleware `acl([99])`

#### Cálculo de variação (Monitor)
```
variação (%) = ((tempo_atual − média_histórica) / média_histórica) × 100
```
- **Janela histórica:** últimas 3 semanas (21 dias)
- **Filtros obrigatórios:** mesma hora do dia + mesmo dia da semana + excluir `dias_nao_uteis`
- **Tolerância:** ±5% (evita falso positivo por variação natural)
- **Status resultante:**
  - `acima` → variação > +5% (vermelho `#E51B23`)
  - `normal` → variação entre -5% e +5% (cinza)
  - `abaixo` → variação < -5% (verde `#34973B`)
  - `sem_historico` → menos de 1 leitura histórica disponível
  - `sem_dados` → nenhuma leitura recente da rota

#### Dias não úteis
- Tabela `dias_nao_uteis`: id, data (DATE UNIQUE), descricao, tipo
- Tipos: `feriado_nacional`, `feriado_municipal`, `ponto_facultativo`
- Excluídos do cálculo de médias no Monitor e na Metodologia
- Listagem visível a todos os usuários autenticados; cadastro/remoção somente admin
- Pré-populada com feriados 2025/2026 do Rio de Janeiro via `init.sql`

#### Nomes de rota são links
- Em **todos** os lugares onde o nome de uma rota é exibido, ele deve ser um `<a>` clicável que abre a URL do Google Maps em nova aba (`target="_blank"`).
- Isso vale para: Dashboard (sidebar + painel de análise), Monitor (cards), Admin (lista de rotas).

#### Schema de banco
- **Nunca usar `.sync({ force: true })` ou `.sync({ alter: true })`** — todos os `.sync()` estão comentados.
- O schema é criado exclusivamente pelo `init.sql` na primeira inicialização do container PostgreSQL.
- Novos campos/tabelas devem ser adicionados ao `init.sql` E ao `init.sql` de migração manual quando aplicável.

---

### Padrões de código

#### Datas e fusos
- **Backend:** usar `luxon` (Luxon) — nunca `moment` em código novo.
- **Frontend:** usar `date-fns` + `Date` nativa — **luxon NÃO está instalado no frontend** e causará erro de build.
- Datas ISO `YYYY-MM-DD` vindas do banco devem ser parseadas com `new Date(iso + 'T12:00:00')` no frontend para evitar variação de fuso UTC que deslocaria o dia.
- Timestamps de leitura: `new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })`.

#### Sequelize / banco
- Dialect: `postgres` (migração do SQL Server concluída)
- SSL controlado por `DB_SSL` no `.env` — nunca hardcodar
- Todos os modelos em `models/` — nunca criar lógica de banco em controllers

#### Autenticação
- JWT armazenado em `localStorage` com chaves `tv_token` e `tv_user`
- Middleware `eAdmin` em `middlewares/auth.js` — popula `req.userId`
- Middleware `acl` em `middlewares/acl.js` — verifica `perfilId`

---

### Arquitetura do frontend

#### AppShell — layout central
Todos os componentes de página autenticada são envolvidos por `<AppShell>`. **Nunca criar layout de navegação fora do AppShell.**

```
AppShell
├── <aside> — Sidebar (w-56, fundo #004A80)
│   ├── Logo (LogoIcon — pin SVG) + nome "Tempovias" + subtítulo CETRIO
│   ├── Botão fechar (mobile apenas, md:hidden)
│   ├── <nav> — NavItem × N (renderiza items ou ALL_NAV_ITEMS)
│   └── Bloco usuário — avatar inicial + nome + link "Sair"
├── Overlay escuro (mobile, fixed inset-0 z-30, fecha ao clicar)
└── <div> principal
    ├── <header> (mobile apenas, md:hidden) — LogoIcon + título + avatar
    └── <div> flex-1 — {children}
```

**Constantes de módulo (não recalcular no render):**
- `NAV_ITEMS` — itens para todos os usuários
- `ADMIN_ITEMS` — itens exclusivos de admin
- `ALL_NAV_ITEMS = [...NAV_ITEMS, ...ADMIN_ITEMS]` — combinação pré-computada
- `LogoIcon` — componente SVG do pin do mapa (reutilizado na sidebar e no mobile header)

**Lógica de `isActive(to)`:**
- `/` → `pathname === '/'` (match exato)
- qualquer outro → `pathname.startsWith(to)`

**Comportamento mobile:**
- `navOpen` (useState) controla o drawer
- Sidebar: `fixed inset-y-0 left-0 z-40 w-56`, `-translate-x-full` quando fechada, `translate-x-0` quando aberta
- Desktop: `md:relative md:translate-x-0` — sempre visível

#### Estrutura de páginas

| Página | Arquivo | Acesso |
|---|---|---|
| Dashboard | `pages/Dashboard.jsx` | Autenticado |
| Monitor | `pages/Monitor/index.jsx` + `RouteCard.jsx` | Autenticado |
| Feriados | `pages/Feriados/index.jsx` | Autenticado (CRUD somente admin) |
| Metodologia | `pages/Metodologia/index.jsx` | Autenticado |
| Admin | `pages/Admin.jsx` | perfilId=99 |
| Login | `pages/Login.jsx` | Público |

#### Monitor — comportamento esperado
- Auto-refresh a cada **120 segundos** com countdown regressivo visível
- Cards ordenáveis por **variação** (padrão, maior desvio primeiro) ou **ordem alfabética**
- Cards de resumo: contagem de rotas `acima` / `normal` / `abaixo`
- Nome da rota no card é link clicável para o Google Maps

#### Metodologia — comportamento esperado
- Accordion — cada seção (`SecaoControlada`) controla seu próprio estado
- Botão "Expandir tudo" usa `useState(false)` no componente pai + `useEffect(() => { setAberta(forceOpen); }, [forceOpen])` em cada `SecaoControlada`
- O `key={expandirTodos}` no container de seções força remount ao alternar — complemento ao useEffect
- Conteúdo embutido em `SECOES` (constante no próprio arquivo) — fonte de verdade em `biblioteca/*.md`

---

### Identidade visual (obrigatória)

Todas as telas seguem o **Manual de Marca da Prefeitura do Rio de Janeiro (2022)**:

| Token | Hex | Uso |
|---|---|---|
| Azul marinho primário | `#004A80` | Header, sidebar, títulos, botões primários |
| Azul marinho escuro | `#13335A` | Hover, subtítulos |
| Azul celeste (accent) | `#00C0F3` | Destaques, borda ativa no nav |
| Laranja | `#E95F3E` | Alertas |
| Vermelho | `#E51B23` | Status "acima", erros, botão remover |
| Verde | `#34973B` | Status "abaixo", sucesso |
| Amarelo | `#F9C600` | Avisos, ponto facultativo |
| Fundo | `#F0F0F0` | Background da aplicação |
| Texto | `#1D1D1B` | Corpo de texto |

**Nunca usar cores arbitrárias** — sempre referenciar esta paleta.

---

### Regras de desenvolvimento (padrões de IA)

1. **Não criar abstrações especulativas** — implementar apenas o que foi pedido.
2. **Não adicionar error handling para cenários impossíveis** — confiar nos middlewares e no framework.
3. **Não usar `.sync()` no Sequelize** — schema é responsabilidade do `init.sql`.
4. **Não usar luxon no frontend** — usar `date-fns` e `Date` nativa.
5. **Não criar arquivos de documentação (`.md`)** a menos que explicitamente solicitado.
6. **Não adicionar comentários óbvios** — apenas comentar lógica não evidente.
7. **Nunca commitar `.env`** — apenas `.env.example`.
8. **Nomes de rota sempre clicáveis** — todo `rota.name` deve ser `<a href={rota.url}>` quando `rota.url` existir.
9. **Mobile-first** — toda nova página deve funcionar como app no celular (AppShell já resolve o layout base).
10. **Perguntar antes de ações destrutivas** (delete de rotas/feriados usa `confirm()` no browser).

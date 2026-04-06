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

## Modos de execução

O sistema tem **dois modos** de execução, com comportamentos distintos:

### Modo desenvolvimento
- **Backend** (Express) roda na porta `3001`
- **Frontend** (Vite dev server) roda na porta `3000`, com proxy automático para a API em `3001`
- Hot reload ativo — alterações refletem imediatamente sem precisar buildar
- Acesse o sistema em `http://localhost:3000`

### Modo produção local (PM2)
- O frontend é **compilado** (`npm run build`) gerando `frontend/dist/`
- O Express passa a servir os arquivos estáticos do `dist/` **na mesma porta 3001**
- Frontend + API rodam no **mesmo processo**, na mesma porta
- Gerenciado pelo PM2 — sobrevive a reboots e quedas de energia
- Acesse o sistema em `http://localhost:3001`

> Este é o mesmo comportamento do Docker — Express unificando tudo em uma porta só.

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

### Produção local com PM2 (máquina do cliente)

```bash
# 1. Instalar dependências (primeira vez)
npm install
cd frontend && npm install && cd ..

# 2. Buildar o frontend
cd frontend && npm run build && cd ..

# 3. Iniciar com PM2
pm2 start ecosystem.config.js --update-env
pm2 save
```

Ou use o script pronto em `scripts/iniciar.bat` (faz os passos 2 e 3 automaticamente).

Acesse `http://localhost:3001`

> **Atenção:** Sempre que alterar arquivos do frontend, rode `npm run build` dentro de `frontend/`
> e reinicie o PM2 com `pm2 restart my-app` para as mudanças entrarem em vigor.

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
| `/` | Autenticado | Dashboard principal — mapa + gráfico + histórico por rota |
| `/monitor` | Autenticado | Monitor em tempo real — cards de todas as rotas com variação, auto-refresh 2 min |
| `/feriados` | Autenticado | Dias não úteis — listagem pública, cadastro/remoção somente admin |
| `/metodologia` | Autenticado | Documentação técnica — metodologia de coleta, cálculos e perguntas frequentes |
| `/admin` | Admin (perfilId=99) | Gerenciar rotas — cadastro, edição e remoção com preview no mapa |
| `/login` | Público | Autenticação JWT |

---

## Arquitetura de dois ambientes (cliente)

O sistema opera em dois ambientes simultâneos com o **mesmo banco PostgreSQL** na VPS:

```
[Máquina local do cliente]          [VPS — EasyPanel]
  Node.js + PM2                       Docker container
  Express + ETL (scraping)            Express (sem ETL)
  Puppeteer → Google Maps             Frontend estático
  ETL_ENABLED=true                    ETL_ENABLED=false
        ↓                                     ↓
        └──────── PostgreSQL (VPS) ───────────┘
```

- **Local:** coleta dados a cada 5 min, salva no banco da VPS. PM2 + `pm2-windows-startup` reinicia automaticamente após quedas de energia.
- **VPS:** consome os dados e exibe o sistema. Sem Puppeteer/Chromium — VPS não tem recursos para scraping.

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
DB=<nome do banco>
DB_USER=<usuário do banco>
DB_PASS=<senha do banco>
DB_HOST=<host do PostgreSQL>
DB_PORT=<porta do PostgreSQL>
DB_SSL=false
VITE_GOOGLE_MAPS_KEY=<sua chave Google Maps API>
```

> `ETL_ENABLED` **não precisa ser definido** — o Dockerfile já define `ETL_ENABLED=false` por padrão via `docker-compose.yml`. O scraping nunca roda na VPS.

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

Com a aplicação no ar, rode o comando abaixo (substitua os dados):

```bash
curl -X POST https://seu-dominio.com/api/auth/criar-usuario \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"seu@email.com","password":"suasenha","perfilId":99}'
```

Ou via PowerShell local:

```powershell
Invoke-RestMethod -Method POST -Uri "https://seu-dominio.com/api/auth/criar-usuario" `
  -ContentType "application/json" `
  -Body '{"name":"Admin","email":"seu@email.com","password":"suasenha","perfilId":99}'
```

---

### Atualizações futuras

A cada novo `git push` para `main`, o EasyPanel detecta automaticamente e faz o redeploy. Basta fazer push do repositório — não é necessário acessar o servidor.

---

### Resumo da arquitetura em produção

```
[Máquina local do cliente]          [VPS — EasyPanel]
  Node.js + PM2                       Docker container
  Express + ETL (scraping)            Express (sem ETL)
  Puppeteer → Google Maps             Frontend estático servido pelo Express
        ↓                                     ↓
        └──────────── PostgreSQL (VPS) ───────┘
                    (banco único, compartilhado)
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

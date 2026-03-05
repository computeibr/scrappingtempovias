# Tempovias — Monitoramento de Rotas do Google Maps

Plataforma full-stack para monitoramento automático do tempo de viagem em rotas urbanas. O backend coleta dados do Google Maps a cada 5 minutos via Puppeteer; o frontend (React) exibe dashboards interativos com mapa de rotas, gráficos de variação por hora e filtros históricos.

---

## Como funciona

1. O usuário cadastra uma rota no banco de dados (`tv_tempo_via`) com um nome e a URL do Google Maps contendo os pontos definidos da rota.
2. A cada **5 minutos**, um job `node-cron` dispara o processo de scraping.
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
├── app.js                  # Entrada da aplicação — Express + rotas
├── start.js                # Wrapper para iniciar via child_process
├── ecosystem.config.js     # Configuração PM2
├── controller/
│   ├── etl.js              # Lógica principal: scraping + cron job (a cada 5min)
│   ├── rotasvia.js         # CRUD de rotas cadastradas
│   └── tempovias.js        # Endpoint para inserção manual de tempos
├── models/
│   ├── db.js               # Conexão Sequelize (SQL Server / MSSQL)
│   ├── rotasvia.js         # Model da tabela tv_tempo_via
│   └── tempovias.js        # Model da tabela tempovias
├── middlewares/
│   ├── auth.js             # Autenticação JWT
│   ├── acl.js              # Controle de acesso
│   ├── uploadImgHomeTop.js # Upload de imagem de capa
│   └── uploadImgProfile.js # Upload de imagem de perfil
└── utils/
    ├── date.js             # Utilitários de data
    ├── pagination.js       # Paginação
    ├── responses.js        # Padronização de respostas
    └── i18n/events/enums.js
```

---

## Banco de dados

O banco utilizado é **SQL Server (MSSQL)** via Sequelize. Há também suporte comentado para **PostgreSQL**.

### Tabela `tv_tempo_via` — Rotas cadastradas
| Campo | Tipo        | Descrição                          |
|-------|-------------|------------------------------------|
| id    | INTEGER PK  | Identificador da rota              |
| name  | STRING(100) | Nome amigável da rota              |
| url   | TEXT        | URL do Google Maps com os waypoints |

### Tabela `tempovias` — Histórico de tempos
| Campo       | Tipo     | Descrição                              |
|-------------|----------|----------------------------------------|
| id          | INTEGER PK | Identificador do registro            |
| viaId       | INTEGER FK | Referência à rota (`tv_tempo_via.id`) |
| nomedarota  | STRING   | Nome da rota (desnormalizado)          |
| tempo       | STRING   | Tempo extraído do Google Maps (ex: "23 min") |
| km          | STRING   | Distância extraída (ex: "12,4 km")     |
| leitura     | DATE     | Timestamp da leitura (fuso: America/Sao_Paulo) |

---

## Estrutura do projeto (completa)

```
├── app.js                      # Servidor Express — API + serve do frontend
├── start.js                    # Wrapper PM2
├── ecosystem.config.js         # Config PM2
├── controller/
│   ├── etl.js                  # Scraping + cron job (a cada 5 min)
│   ├── rotasvia.js             # Rota legada usada pelo scraper
│   ├── auth.js                 # Login JWT + criação de usuário
│   └── dashboard.js            # API do dashboard (resumo, histórico, últimas)
├── models/
│   ├── db.js                   # Conexão Sequelize (SQL Server)
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
    │   │   ├── TimeChart.jsx   # Gráfico Recharts (variação por hora)
    │   │   ├── StatsCards.jsx  # Cards de resumo
    │   │   └── FilterPanel.jsx # Filtros de data e dia da semana
    │   ├── contexts/
    │   │   └── AuthContext.jsx # Gerenciamento de sessão JWT
    │   ├── services/api.js     # Axios com interceptors
    │   └── utils/mapUtils.js   # Parser de URLs do Google Maps
    └── dist/                   # Build servido pelo Express em produção
```

---

## Configuração

### Pré-requisitos

- Node.js >= 16.14.0
- SQL Server acessível em rede
- PM2 instalado globalmente
- Chave da **Google Maps JavaScript API** (com Directions API habilitada)

### Variáveis de ambiente — Backend (`.env` na raiz)

```env
PORT=3001
SECRET=uma_string_secreta_para_jwt

DB=nome_do_banco
DB_USER=usuario
DB_PASS=senha
DB_HOST=host_do_servidor
```

### Variáveis de ambiente — Frontend (`frontend/.env`)

```env
VITE_GOOGLE_MAPS_KEY=sua_chave_google_maps
```

> Ambos os `.env` estão no `.gitignore` e **nunca devem ser commitados**.

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

### Produção (processo único no PM2)

```bash
# 1. Build do frontend
cd frontend && npm run build && cd ..

# 2. Instalar PM2
npm install -g pm2

# 3. Iniciar com PM2
pm2 start app.js --name tempovias
pm2 save
```

O Express serve o build do Vite em `frontend/dist` e a API na mesma porta (3001).

### Criar primeiro usuário (admin)

```bash
# Via curl — rode enquanto o backend está no ar
curl -X POST http://localhost:3001/api/auth/criar-usuario \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@cetrio.rio","password":"suasenha","perfilId":99}'
```

---

## Endpoints da API

| Método | Rota                              | Auth | Descrição                              |
|--------|-----------------------------------|------|----------------------------------------|
| POST   | `/api/auth/login`                 | —    | Autenticação, retorna JWT              |
| POST   | `/api/auth/criar-usuario`         | —    | Cria novo usuário                      |
| GET    | `/api/dashboard/resumo`           | JWT  | Contadores gerais                      |
| GET    | `/api/dashboard/rotas`            | JWT  | Lista todas as rotas                   |
| GET    | `/api/dashboard/historico/:id`    | JWT  | Médias por hora com filtros            |
| GET    | `/api/dashboard/ultimas/:id`      | JWT  | Últimas N leituras de uma rota         |
| GET    | `/rota/rotasvia`                  | —    | Legado — usado pelo scraper interno    |

**Parâmetros de `/historico/:id`:**
- `dataInicio` / `dataFim` — `YYYY-MM-DD` (padrão: últimos 30 dias)
- `diasSemana` — `0,1,2,3,4,5,6` (Dom=0, Sab=6)

---

## Dependências principais

### Backend
| Pacote       | Uso                                        |
|--------------|--------------------------------------------|
| `puppeteer`  | Scraping headless do Google Maps           |
| `node-cron`  | Agendamento do job a cada 5 minutos        |
| `sequelize`  | ORM para SQL Server                        |
| `express`    | Servidor HTTP                              |
| `bcryptjs`   | Hash de senhas                             |
| `jsonwebtoken` | Autenticação JWT                         |
| `moment`     | Formatação de timestamps                   |
| `pm2`        | Gerenciador de processos em produção       |

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
- Cada rota tem até **2 tentativas** em caso de falha antes de ser ignorada no ciclo.
- O fuso horário em toda a aplicação é **America/Sao_Paulo**.
- As cores da interface seguem o **Manual de Marca da Prefeitura do Rio de Janeiro (2022)**:
  - Azul marinho primário `#004A80`, azul celeste `#00C0F3`, laranja `#E95F3E`.

-- ─────────────────────────────────────────────────────────────────────────────
-- Tempovias — Inicialização do banco de dados PostgreSQL
-- Executado automaticamente pelo Docker na primeira vez que o container sobe.
-- ─────────────────────────────────────────────────────────────────────────────

-- Rotas cadastradas pelo usuário
CREATE TABLE IF NOT EXISTS tv_tempo_via (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100),
    url         TEXT,
    geometry    TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Adiciona coluna geometry caso a tabela já exista (upgrades)
ALTER TABLE tv_tempo_via ADD COLUMN IF NOT EXISTS geometry TEXT;

-- Histórico de leituras de tempo por rota
CREATE TABLE IF NOT EXISTS tempovias (
    id          SERIAL PRIMARY KEY,
    "viaId"     INTEGER REFERENCES tv_tempo_via(id) ON DELETE SET NULL,
    nomedarota  VARCHAR(255),
    tempo       VARCHAR(255),
    km          VARCHAR(255),
    leitura     TIMESTAMPTZ,
    urlfoto     VARCHAR(255),
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para acelerar buscas por rota e data
CREATE INDEX IF NOT EXISTS idx_tempovias_via_leitura ON tempovias ("viaId", leitura DESC);

-- Usuários do sistema
CREATE TABLE IF NOT EXISTS users (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL,
    email       VARCHAR(150)  NOT NULL UNIQUE,
    password    VARCHAR(255)  NOT NULL,
    "perfilId"  INTEGER       DEFAULT 1,
    "createdAt" TIMESTAMPTZ   DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ   DEFAULT NOW()
);

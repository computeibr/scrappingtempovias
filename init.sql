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

-- Dias não úteis (feriados nacionais, municipais, pontos facultativos)
CREATE TABLE IF NOT EXISTS dias_nao_uteis (
    id          SERIAL PRIMARY KEY,
    data        DATE          NOT NULL UNIQUE,
    descricao   VARCHAR(150)  NOT NULL,
    tipo        VARCHAR(50)   NOT NULL DEFAULT 'feriado_nacional',
    "createdAt" TIMESTAMPTZ   DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ   DEFAULT NOW()
);

INSERT INTO dias_nao_uteis (data, descricao, tipo) VALUES
  ('2025-01-01', 'Confraternização Universal', 'feriado_nacional'),
  ('2025-01-20', 'São Sebastião — Padroeiro do Rio de Janeiro', 'feriado_municipal'),
  ('2025-03-03', 'Carnaval — Segunda-feira', 'feriado_municipal'),
  ('2025-03-04', 'Carnaval — Terça-feira', 'feriado_municipal'),
  ('2025-04-18', 'Sexta-feira Santa', 'feriado_nacional'),
  ('2025-04-21', 'Tiradentes', 'feriado_nacional'),
  ('2025-05-01', 'Dia do Trabalho', 'feriado_nacional'),
  ('2025-06-19', 'Corpus Christi', 'feriado_nacional'),
  ('2025-09-07', 'Independência do Brasil', 'feriado_nacional'),
  ('2025-10-12', 'Nossa Senhora Aparecida', 'feriado_nacional'),
  ('2025-11-02', 'Finados', 'feriado_nacional'),
  ('2025-11-15', 'Proclamação da República', 'feriado_nacional'),
  ('2025-11-20', 'Dia da Consciência Negra', 'feriado_nacional'),
  ('2025-12-25', 'Natal', 'feriado_nacional'),
  ('2026-01-01', 'Confraternização Universal', 'feriado_nacional'),
  ('2026-01-20', 'São Sebastião — Padroeiro do Rio de Janeiro', 'feriado_municipal'),
  ('2026-02-16', 'Carnaval — Segunda-feira', 'feriado_municipal'),
  ('2026-02-17', 'Carnaval — Terça-feira', 'feriado_municipal'),
  ('2026-04-03', 'Sexta-feira Santa', 'feriado_nacional'),
  ('2026-04-21', 'Tiradentes', 'feriado_nacional'),
  ('2026-05-01', 'Dia do Trabalho', 'feriado_nacional'),
  ('2026-06-04', 'Corpus Christi', 'feriado_nacional'),
  ('2026-09-07', 'Independência do Brasil', 'feriado_nacional'),
  ('2026-10-12', 'Nossa Senhora Aparecida', 'feriado_nacional'),
  ('2026-11-02', 'Finados', 'feriado_nacional'),
  ('2026-11-15', 'Proclamação da República', 'feriado_nacional'),
  ('2026-11-20', 'Dia da Consciência Negra', 'feriado_nacional'),
  ('2026-12-25', 'Natal', 'feriado_nacional')
ON CONFLICT (data) DO NOTHING;

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

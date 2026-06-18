import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AppShell from '../components/AppShell';

// ── Seções de conteúdo ─────────────────────────────────────────────────────
// Atualizar este arquivo sempre que o CLAUDE.md for atualizado com novas
// decisões de produto, arquitetura ou stack.

function Secao({ titulo, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100" style={{ background: '#004A80' }}>
        <h2 className="text-sm font-semibold text-white">{titulo}</h2>
      </div>
      <div className="p-5 text-sm text-[#1D1D1B] space-y-3">{children}</div>
    </div>
  );
}

function Item({ label, children }) {
  return (
    <div className="flex gap-3">
      <span className="font-medium text-[#004A80] min-w-[140px] flex-shrink-0">{label}</span>
      <span className="text-gray-600 leading-relaxed">{children}</span>
    </div>
  );
}

function Tag({ children, cor }) {
  const estilos = {
    azul:    { background: '#E0F2FE', color: '#0369A1' },
    verde:   { background: '#DCFCE7', color: '#166534' },
    laranja: { background: '#FEF3C7', color: '#92400E' },
    cinza:   { background: '#F3F4F6', color: '#374151' },
  };
  return (
    <span
      className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mr-1 mb-1"
      style={estilos[cor] || estilos.cinza}
    >
      {children}
    </span>
  );
}

function TabelaAcesso() {
  const perfis = [
    { id: 1,  nome: 'View',  acesso: 'Dashboard apenas — somente leitura', cor: 'cinza' },
    { id: 2,  nome: 'User',  acesso: 'Dashboard + Gerenciar Rotas (cria e edita apenas as suas)', cor: 'azul' },
    { id: 99, nome: 'Admin', acesso: 'Acesso total: rotas, usuários, ajustes, saúde, agente', cor: 'laranja' },
  ];
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-5 py-2 text-left font-medium text-gray-500">perfilId</th>
            <th className="px-5 py-2 text-left font-medium text-gray-500">Perfil</th>
            <th className="px-5 py-2 text-left font-medium text-gray-500">Acesso</th>
          </tr>
        </thead>
        <tbody>
          {perfis.map((p) => (
            <tr key={p.id} className="border-b border-gray-50 last:border-0">
              <td className="px-5 py-2 font-mono font-bold text-[#004A80]">{p.id}</td>
              <td className="px-5 py-2"><Tag cor={p.cor}>{p.nome}</Tag></td>
              <td className="px-5 py-2 text-gray-600">{p.acesso}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabelaRotas() {
  const regras = [
    { quem: 'Admin (99)',       vê: 'Todas as rotas sem exceção' },
    { quem: 'User / View (1,2)', vê: 'Suas rotas + rotas legadas (creatorId IS NULL) + rotas compartilhadas com seu e-mail' },
  ];
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            <th className="px-5 py-2 text-left font-medium text-gray-500">Perfil</th>
            <th className="px-5 py-2 text-left font-medium text-gray-500">Visibilidade</th>
          </tr>
        </thead>
        <tbody>
          {regras.map((r) => (
            <tr key={r.quem} className="border-b border-gray-50 last:border-0">
              <td className="px-5 py-2 font-medium text-[#004A80]">{r.quem}</td>
              <td className="px-5 py-2 text-gray-600">{r.vê}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Env({ nome, valor }) {
  return (
    <div className="flex items-start gap-2 font-mono text-xs">
      <span className="text-[#004A80] font-bold min-w-[200px] flex-shrink-0">{nome}</span>
      <span className="text-gray-500">{valor}</span>
    </div>
  );
}

export default function Agente() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.perfilId !== 99) navigate('/');
  }, []);

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-5">

          {/* Cabeçalho */}
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#004A80' }}>Agente — Contexto do Produto</h1>
            <p className="text-sm text-gray-500 mt-1">
              Base de conhecimento do projeto para continuidade do desenvolvimento.
              Atualizada junto com o CLAUDE.md a cada evolução significativa.
            </p>
          </div>

          {/* Visão geral */}
          <Secao titulo="Visão Geral e Ideia de Negócio">
            <Item label="Produto">Tempovias — plataforma de monitoramento automático de tempo de viagem em rotas urbanas do Rio de Janeiro.</Item>
            <Item label="Cliente">CETRIO / Prefeitura do Rio de Janeiro.</Item>
            <Item label="Objetivo">Coletar dados do Google Maps a cada 5 minutos via Puppeteer e exibir dashboards com histórico, variação e alertas de trânsito por rota.</Item>
            <Item label="Proposta de valor">Registro contínuo e histórico do trânsito em rotas específicas, permitindo análises comparativas por hora, dia da semana e período — incluindo exclusão de feriados municipais e nacionais do Rio.</Item>
            <Item label="Diferencial">Scraping automatizado com worker pool paralelo, deduplicação via advisory lock no PostgreSQL e categorização de rotas com compartilhamento por e-mail.</Item>
          </Secao>

          {/* Stack */}
          <Secao titulo="Stack Tecnológica">
            <div>
              <p className="font-medium text-[#004A80] mb-2">Backend</p>
              <div className="flex flex-wrap">
                {['Node.js 18', 'Express', 'Sequelize', 'node-cron', 'Puppeteer', 'bcryptjs', 'jsonwebtoken', 'luxon', 'nodemailer', 'pg (PostgreSQL driver)'].map(t => <Tag key={t} cor="azul">{t}</Tag>)}
              </div>
            </div>
            <div>
              <p className="font-medium text-[#004A80] mb-2">Frontend</p>
              <div className="flex flex-wrap">
                {['React 18', 'Vite', 'Tailwind CSS', 'Recharts', '@react-google-maps/api', 'react-router-dom', 'axios', 'date-fns'].map(t => <Tag key={t} cor="verde">{t}</Tag>)}
              </div>
            </div>
            <div>
              <p className="font-medium text-[#004A80] mb-2">Banco de dados e Infra</p>
              <div className="flex flex-wrap">
                {['PostgreSQL', 'Docker', 'EasyPanel', 'PM2 (local)', 'Chromium via Alpine apk'].map(t => <Tag key={t} cor="laranja">{t}</Tag>)}
              </div>
            </div>
            <Item label="Datas/Fuso">
              Backend usa <strong>luxon</strong> (America/Sao_Paulo). Frontend usa <strong>date-fns</strong> + Date nativa — luxon NÃO está instalado no frontend.
            </Item>
            <Item label="Auth">JWT no localStorage (<code className="bg-gray-100 px-1 rounded">tv_token</code>, <code className="bg-gray-100 px-1 rounded">tv_user</code>). Payload contém <code className="bg-gray-100 px-1 rounded">id</code> e <code className="bg-gray-100 px-1 rounded">role</code> (=perfilId). JWT expira em 8h.</Item>
            <Item label="CORS">Configurado como <code className="bg-gray-100 px-1 rounded">*</code> (aberto) — restringir em produção se necessário.</Item>
          </Secao>

          {/* Arquitetura */}
          <Secao titulo="Arquitetura — Dois Ambientes, Um Banco">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 font-mono text-xs leading-relaxed text-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-bold text-[#004A80] mb-2">[ Máquina Local — PM2 ]</p>
                  <p>ETL_ENABLED=true</p>
                  <p>ETL_FAILOVER=false  ← primária</p>
                  <p>ETL_CONCURRENCY=8</p>
                  <p>Puppeteer → Google Maps</p>
                  <p>Grava heartbeat após cada ciclo</p>
                  <p>ecosystem.config.js</p>
                </div>
                <div>
                  <p className="font-bold text-[#004A80] mb-2">[ VPS — Docker/EasyPanel ]</p>
                  <p>ETL_ENABLED=true</p>
                  <p>ETL_FAILOVER=true   ← backup</p>
                  <p>ETL_CONCURRENCY=4</p>
                  <p>Checa heartbeat (SELECT leve)</p>
                  <p>Só roda se local ausente {'>'} 10 min</p>
                  <p>docker-compose.yml</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200 text-center text-gray-500">
                ↕ PostgreSQL na VPS — banco único, compartilhado pelos dois ambientes
              </div>
            </div>
            <Item label="Failover automático">
              Se a máquina local cair, a VPS detecta a ausência do heartbeat após <strong>10 minutos</strong> e assume o ETL automaticamente.
              Quando local volta, o heartbeat é atualizado e a VPS volta a ignorar os ciclos — <strong>zero intervenção manual</strong>.
            </Item>
            <Item label="Como o failover funciona">
              (1) Local roda ETL → grava <code className="bg-gray-100 px-1 rounded">etl_heartbeat.last_run = NOW()</code> no banco.{' '}
              (2) VPS a cada 5 min faz um SELECT nessa tabela — se recente, pula (sem Puppeteer, sem CPU).{' '}
              (3) Se ausente {'>'} 10 min, VPS tenta o advisory lock e roda com concorrência reduzida.
            </Item>
            <Item label="Dedup anti-duplicata">
              (1) <strong>Advisory lock PostgreSQL</strong> <code className="bg-gray-100 px-1 rounded">pg_try_advisory_xact_lock(737465)</code> dentro de uma transação — impede dois processos de escrever simultaneamente e libera o lock automaticamente no commit/rollback (evita lock preso por descompasso de conexão no pool).{' '}
              (2) <strong>Dedup de 3 min</strong> — descarta leitura se já existe registro do mesmo viaId nos últimos 3 min.
            </Item>
            <Item label="Deploy VPS">A cada <code className="bg-gray-100 px-1 rounded">git push main</code>, o EasyPanel faz redeploy automático do container.</Item>
            <Item label="PM2 local">
              Instalar globalmente (apenas uma vez): <code className="bg-gray-100 px-1 rounded">npm install -g pm2</code>.{' '}
              Iniciar: <code className="bg-gray-100 px-1 rounded">pm2 start ecosystem.config.js</code>.{' '}
              Parar: <code className="bg-gray-100 px-1 rounded">pm2 stop my-app</code>.{' '}
              Persistir entre reboots: <code className="bg-gray-100 px-1 rounded">pm2-windows-startup install</code>.
            </Item>
            <Item label="Banco — sync()">Todos os <code className="bg-gray-100 px-1 rounded">.sync()</code> do Sequelize estão comentados. Schema criado pelo <code className="bg-gray-100 px-1 rounded">init.sql</code>. Novas colunas devem ser executadas manualmente em produção via <code className="bg-gray-100 px-1 rounded">ALTER TABLE ... ADD COLUMN IF NOT EXISTS</code>.</Item>
          </Secao>

          {/* Dashboard e Mapa */}
          <Secao titulo="Dashboard e Mapa — Análise de Rotas">
            <Item label="Dashboard (/)">
              Sem mapa (eliminado para reduzir custo Google Maps API). Exibe lista de rotas, gráfico de variação por hora e cards de KPI.
            </Item>
            <Item label="Linha de referência">
              Gráfico <code className="bg-gray-100 px-1 rounded">TimeChart</code> mostra linha azul (média do período) + linha celeste tracejada (média das últimas 3 semanas, mesmo dia da semana de hoje, excluindo feriados). Tooltip mostra % de variação entre as duas.
            </Item>
            <Item label="Card hora atual">
              Ao selecionar uma rota, aparece card com: média da hora atual, referência histórica e % de variação — base para alertas aos gestores. Estrutura: header (nome completo da rota) / main (métricas em 3 colunas) / footer (contexto histórico).
            </Item>
            <Item label="Mapa (/mapa)">
              Página separada com o mapa Google Maps completo. Clicar em qualquer rota abre modal com o <code className="bg-gray-100 px-1 rounded">TimeChart</code> daquela rota. Visível a todos os usuários autenticados.
            </Item>
            <Item label="Perfil (/perfil)">
              Todos os usuários logados. Editar nome, e-mail, senha e foto de perfil. <strong>perfilId é read-only</strong> — somente Admin pode alterar via <code className="bg-gray-100 px-1 rounded">/usuarios</code>. Avatar com overlay de câmera, upload imediato (JPG/PNG/WebP · 2 MB). Acessível clicando no avatar da sidebar ou do header mobile.
            </Item>
          </Secao>

          {/* Monitor */}
          <Secao titulo="Monitor — Filtros e Visualização">
            <Item label="Auto-refresh">A cada 120 segundos com countdown regressivo visível.</Item>
            <Item label="Filtro de status">
              Botões: <strong>Todos</strong> · <strong>🔴 Acima</strong> · <strong>🟡 Normal</strong> · <strong>🟢 Abaixo</strong>.
              Ao selecionar "Acima", aparecem limiares de variação: <strong>&gt;5%</strong> · <strong>&gt;25%</strong> · <strong>&gt;50%</strong> · <strong>&gt;75%</strong>.
            </Item>
            <Item label="Filtros client-side">Todos os filtros são React state — sem chamada à API. Os dados ficam em memória e são filtrados/reordenados instantaneamente.</Item>
            <Item label="Grid tela inteira">Sem <code className="bg-gray-100 px-1 rounded">max-w-7xl</code> — cards ocupam toda a largura disponível. Grid: 1 col mobile / 2 sm / 3 lg / 4 xl.</Item>
            <Item label="RouteCard">
              Estrutura header (nome completo sem truncamento, <code className="bg-gray-100 px-1 rounded">break-words</code>) / main (tempo atual + % variação) / footer (horário + "N leit. · Sábs · 3 sem.").
            </Item>
          </Secao>

          {/* ETL */}
          <Secao titulo="ETL — Scraping e Coleta de Dados">
            <Item label="Cron">A cada 5 min (<code className="bg-gray-100 px-1 rounded">*/5 * * * *</code>, timezone America/Sao_Paulo). Executa também imediatamente ao iniciar.</Item>
            <Item label="Worker pool">Até <code className="bg-gray-100 px-1 rounded">ETL_CONCURRENCY</code> abas Puppeteer abertas simultaneamente. Fila compartilhada com <code className="bg-gray-100 px-1 rounded">Array.shift()</code> — seguro no event loop single-thread.</Item>
            <Item label="Browser persistente">Chromium reutilizado entre ciclos. Reciclado após <code className="bg-gray-100 px-1 rounded">ETL_BROWSER_RECYCLE</code> ciclos (padrão 12 ≈ 1h) para prevenir memory leak.</Item>
            <Item label="FAST_MODE">
              <code className="bg-gray-100 px-1 rounded">ETL_FAST_MODE=true</code>: usa <code className="bg-gray-100 px-1 rounded">domcontentloaded</code> + espera fixa de 3s.{' '}
              <code className="bg-gray-100 px-1 rounded">false</code>: usa <code className="bg-gray-100 px-1 rounded">networkidle2</code> (mais lento, mais preciso).
            </Item>
            <Item label="Failover">
              <code className="bg-gray-100 px-1 rounded">ETL_FAILOVER=false</code> (local) = sempre roda, grava heartbeat.{' '}
              <code className="bg-gray-100 px-1 rounded">ETL_FAILOVER=true</code> (VPS) = só roda se heartbeat ausente {'>'} <code className="bg-gray-100 px-1 rounded">ETL_FAILOVER_MINUTOS</code> (padrão 10).
              Check é um SELECT de uma linha — zero Puppeteer quando local está ativo.
            </Item>
            <Item label="Request interception">Bloqueia image, font, stylesheet, media, other — Maps só precisa de JS/XHR para calcular tempo/km. Reduz CPU significativamente.</Item>
            <Item label="Retry">2 tentativas por rota com backoff de 2s antes de ignorar no ciclo.</Item>
            <Item label="Alertas">Após 3 falhas consecutivas envia e-mail via Gmail (nodemailer). Requer App Password do Gmail (não senha normal).</Item>
            <Item label="Distâncias">Campo km armazena tanto "7,4 km" quanto "250 m" — rotas curtas exibem metros. XPath exclui "min" para não capturar o campo de tempo como distância.</Item>
          </Secao>

          {/* Gerenciar Rotas */}
          <Secao titulo="Gerenciar Rotas (/admin) — Cadastro e Mapa">
            <Item label="Acesso">perfilId ≥ 2. Usuário vê e edita apenas as suas rotas; Admin vê e edita todas.</Item>
            <Item label="Preview do traçado">
              Ao clicar em "Visualizar", chama o <code className="bg-gray-100 px-1 rounded">DirectionsService</code> do Google Maps.
              O mapa usa <code className="bg-gray-100 px-1 rounded">fitBounds</code> com padding de 50px para ajustar o zoom automaticamente ao traçado — funciona para rotas curtas e longas.
              Centro padrão: Rio de Janeiro (<code className="bg-gray-100 px-1 rounded">-22.9068, -43.1729</code>).
            </Item>
            <Item label="Anti-pattern React">
              <code className="bg-gray-100 px-1 rounded">PreviewMap</code> é definido <strong>fora</strong> do componente <code className="bg-gray-100 px-1 rounded">Admin</code> — componentes definidos dentro do pai são recriados a cada render, causando remount do GoogleMap e impedindo o <code className="bg-gray-100 px-1 rounded">fitBounds</code> de funcionar. Sempre mover sub-componentes para escopo de módulo.
            </Item>
            <Item label="Validação visual">
              Campos obrigatórios têm <span className="text-red-500">*</span> no label. Botão sempre clicável — ao clicar com campos vazios, ativa estado <code className="bg-gray-100 px-1 rounded">tentouCadastrar</code>: borda vermelha + fundo vermelho claro + mensagem por campo. Retorna cedo sem chamar a API.
            </Item>
            <Item label="Campos obrigatórios">Nome da rota <span className="text-red-500">*</span> · URL do Google Maps <span className="text-red-500">*</span> · Categoria <span className="text-red-500">*</span> (no cadastro).</Item>
          </Secao>

          {/* Perfis */}
          <Secao titulo="Controle de Acesso — Perfis de Usuário">
            <TabelaAcesso />
            <p className="text-xs text-gray-400 pt-1">
              Sidebar (<code className="bg-gray-100 px-1 rounded">AppShell.jsx</code>) exibe itens de acordo com o perfil.
              Páginas admin-only redirecionam para <code className="bg-gray-100 px-1 rounded">/</code> se <code className="bg-gray-100 px-1 rounded">perfilId !== 99</code>.
            </p>
          </Secao>

          {/* Módulo de rotas */}
          <Secao titulo="Módulo de Rotas — Regras de Negócio">
            <Item label="Autoria">Toda rota criada vincula <code className="bg-gray-100 px-1 rounded">creatorId = req.userId</code> automaticamente. Rotas sem creatorId são chamadas de <strong>legadas</strong> ou <strong>órfãs</strong>.</Item>
            <Item label="Visibilidade"><TabelaRotas /></Item>
            <Item label="Escrita">Criador da rota ou Admin podem editar/remover. Compartilhamento é somente leitura.</Item>
            <Item label="Compartilhamento">Por e-mail (não por user_id). Criador ou Admin adicionam e-mails via API. Badge "compartilhado" exibido no frontend.</Item>
            <Item label="Categoria">Campo <code className="bg-gray-100 px-1 rounded">VARCHAR(100)</code> livre. Input com <code className="bg-gray-100 px-1 rounded">&lt;datalist&gt;</code> sugere categorias existentes. Chips clicáveis no Dashboard e Monitor filtram por categoria.</Item>
            <Item label="Órfãs">Página <strong>/ajustes</strong> — Admin reivindica rotas sem creatorId individualmente ou todas de uma vez.</Item>
            <Item label="Nomes são links">Em todo lugar onde <code className="bg-gray-100 px-1 rounded">rota.name</code> é exibido, deve ser um <code className="bg-gray-100 px-1 rounded">&lt;a href={'{'}rota.url{'}'}&gt;</code> abrindo em nova aba.</Item>
          </Secao>

          {/* Variáveis de ambiente */}
          <Secao titulo="Variáveis de Ambiente — Referência Rápida">
            <div className="space-y-1.5 bg-gray-50 rounded-lg p-4 border border-gray-100">
              <Env nome="ETL_ENABLED" valor="true (local/PM2 e VPS backup) | false desativa" />
              <Env nome="ETL_FAILOVER" valor="false = primária (local) | true = backup (VPS)" />
              <Env nome="ETL_FAILOVER_MINUTOS" valor="minutos sem heartbeat para VPS assumir (padrão 10)" />
              <Env nome="ETL_CONCURRENCY" valor="abas paralelas — local: 8 | VPS backup: 4" />
              <Env nome="ETL_FAST_MODE" valor="true = domcontentloaded+3s (recomendado)" />
              <Env nome="ETL_TAB_DELAY" valor="500ms entre abertura de abas" />
              <Env nome="ETL_BROWSER_RECYCLE" valor="12 ciclos ≈ 1h" />
              <Env nome="ALERT_EMAIL" valor="Gmail remetente para alertas ETL e CPU" />
              <Env nome="ALERT_EMAIL_PASS" valor="App Password 16 chars (não senha normal)" />
              <Env nome="ALERT_EMAIL_TO" valor="destinatário (vazio = usa ALERT_EMAIL)" />
              <Env nome="ALERTA_CPU_PORCENTO" valor="threshold CPU para alerta (padrão 80)" />
              <Env nome="DB_SSL" valor="false local | true para Supabase/Neon/externo" />
              <Env nome="VITE_GOOGLE_MAPS_KEY" valor="chave Google Maps API (frontend/.env)" />
            </div>
            <p className="text-xs text-gray-400">
              Arquivo <code className="bg-gray-100 px-1 rounded">.env.example</code> na raiz contém todas as variáveis comentadas.
              Nunca commitar o <code className="bg-gray-100 px-1 rounded">.env</code>.
            </p>
          </Secao>

          {/* Identidade visual */}
          <Secao titulo="Identidade Visual — Prefeitura do Rio de Janeiro (2022)">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { nome: 'Azul marinho primário',  hex: '#004A80', uso: 'Header, sidebar, títulos, botões' },
                { nome: 'Azul marinho escuro',    hex: '#13335A', uso: 'Hover, subtítulos' },
                { nome: 'Azul celeste (accent)',  hex: '#00C0F3', uso: 'Borda ativa nav, destaques' },
                { nome: 'Vermelho',               hex: '#E51B23', uso: 'Status "acima", erros' },
                { nome: 'Verde',                  hex: '#34973B', uso: 'Status "abaixo", sucesso' },
                { nome: 'Fundo',                  hex: '#F0F0F0', uso: 'Background da aplicação' },
              ].map(({ nome, hex, uso }) => (
                <div key={hex} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded flex-shrink-0 mt-0.5 border border-gray-200" style={{ background: hex }} />
                  <div>
                    <p className="text-xs font-mono font-medium">{hex}</p>
                    <p className="text-xs text-gray-500 leading-tight">{nome}</p>
                    <p className="text-xs text-gray-400 leading-tight">{uso}</p>
                  </div>
                </div>
              ))}
            </div>
          </Secao>

          {/* Mobile UX */}
          <Secao titulo="Mobile UX — Web App Responsivo">
            <Item label="h-dvh">
              <code className="bg-gray-100 px-1 rounded">h-dvh</code> no AppShell em vez de <code className="bg-gray-100 px-1 rounded">h-screen</code> — corrige o bug do Safari mobile onde a URL bar não é contabilizada na altura.
            </Item>
            <Item label="Bottom tab bar">
              <code className="bg-gray-100 px-1 rounded">fixed bottom-0 md:hidden</code> — mostra todos os itens do perfil do usuário. Scroll horizontal quando não cabem. <code className="bg-gray-100 px-1 rounded">env(safe-area-inset-bottom)</code> para iPhone com notch. Cada item tem <code className="bg-gray-100 px-1 rounded">min-width: 64px</code>.
            </Item>
            <Item label="Sidebar desktop">
              Toggle chevron no header da sidebar. Estado persistido em <code className="bg-gray-100 px-1 rounded">localStorage('tv_sidebar')</code>. Modo colapsado: <code className="bg-gray-100 px-1 rounded">w-14</code> (icon-only com tooltip). Transição <code className="bg-gray-100 px-1 rounded">duration-300</code>. Background da sidebar: <code className="bg-gray-100 px-1 rounded">#13335A</code>.
            </Item>
            <Item label="Fix logout mobile">
              Bottom tab bar fica <code className="bg-gray-100 px-1 rounded">hidden</code> quando <code className="bg-gray-100 px-1 rounded">navOpen === true</code> — elimina sobreposição de z-index que bloqueava o botão "Sair" em telas pequenas (ex: Samsung Galaxy A07).
            </Item>
            <Item label="Dashboard master-detail">
              Mobile sem rota selecionada → exibe lista de rotas completa (busca + chips + items). Ao selecionar → exibe análise com botão "← Rotas" para voltar. Desktop mantém sidebar lateral sempre visível.
            </Item>
            <Item label="Touch / CSS">
              <code className="bg-gray-100 px-1 rounded">touch-action: manipulation</code> em botões e links — remove delay de 300ms. <code className="bg-gray-100 px-1 rounded">-webkit-tap-highlight-color: transparent</code> — sem flash azul. <code className="bg-gray-100 px-1 rounded">overscroll-behavior: none</code> — sem bounce iOS.
            </Item>
          </Secao>

          {/* Perfil e Avatar */}
          <Secao titulo="Perfil do Usuário e Avatar">
            <Item label="Página /perfil">Acessível a todos os usuários logados. Permite editar nome, e-mail, senha e foto de perfil. <strong>perfilId é read-only</strong> — somente Admin altera via /usuarios.</Item>
            <Item label="Upload de avatar">
              Arquivo salvo em <code className="bg-gray-100 px-1 rounded">public/upload/avatars/user-{'{id}'}-{'{ts}'}.ext</code>, servido via <code className="bg-gray-100 px-1 rounded">/files/avatars/</code>. URL relativa armazenada em <code className="bg-gray-100 px-1 rounded">users.avatarUrl</code>. Limite: 2 MB, JPG/PNG/WebP. Silhueta SVG como fallback.
            </Item>
            <Item label="AppShell">Avatar (sidebar + header mobile) é <code className="bg-gray-100 px-1 rounded">&lt;Link to="/perfil"&gt;</code> — clicar na foto/silhueta abre o perfil.</Item>
            <Item label="updateUser">Função no <code className="bg-gray-100 px-1 rounded">AuthContext</code> que atualiza estado + localStorage sem re-login — usada após salvar nome/e-mail/foto.</Item>
            <Item label="Admin em Usuarios.jsx">
              Admin vê avatar de cada usuário na lista. No form de edição: preview da foto, botão "Alterar foto" (upload), botão "Remover foto".{' '}
              Endpoints: <code className="bg-gray-100 px-1 rounded">POST /api/auth/usuarios/:id/avatar</code> e <code className="bg-gray-100 px-1 rounded">DELETE /api/auth/usuarios/:id/avatar</code>.
            </Item>
            <Item label="Banco">
              <code className="bg-gray-100 px-1 rounded">ALTER TABLE users ADD COLUMN IF NOT EXISTS "avatarUrl" VARCHAR(500);</code> — executar manualmente em produção.
            </Item>
            <Item label="Persistência no Docker">
              <code className="bg-gray-100 px-1 rounded">docker-compose.yml</code> monta named volume <code className="bg-gray-100 px-1 rounded">uploads</code> em <code className="bg-gray-100 px-1 rounded">/app/public/upload</code> — avatares sobrevivem a qualquer redeploy. Sem o volume, a pasta é recriada vazia a cada deploy.
            </Item>
          </Secao>

          {/* Saúde do sistema */}
          <Secao titulo="Saúde do Sistema — Observabilidade">
            <Item label="Origem do ETL">Badge na página <strong>/saude</strong> mostra 🟢 "Máquina local" ou 🔴 "VPS (failover)" — atualizado a cada 30s via <code className="bg-gray-100 px-1 rounded">/api/health/detalhes</code>.</Item>
            <Item label="Dois ciclos de polling">
              <code className="bg-gray-100 px-1 rounded">/api/health/live</code> a cada 1s (sem banco — CPU/RAM instantâneos).{' '}
              <code className="bg-gray-100 px-1 rounded">/api/health/detalhes</code> a cada 30s (com banco — ETL config, heartbeat, uptime).
            </Item>
            <Item label="Alertas por e-mail">
              (1) ETL: após 3 falhas consecutivas → "Scraping com falha".{' '}
              (2) Failover: local cai → "Local ausente, VPS assumiu" / local volta → "Local voltou".{' '}
              (3) CPU: VPS acima do threshold → alerta com cooldown de 30min.
            </Item>
          </Secao>

          {/* Rodapé */}
          <p className="text-center text-xs text-gray-400 pb-4">
            Atualizar este arquivo (<code className="bg-gray-100 px-1 rounded">frontend/src/pages/Agente.jsx</code>) sempre que o CLAUDE.md for atualizado com novas decisões de produto ou arquitetura.
          </p>

        </div>
      </div>
    </AppShell>
  );
}

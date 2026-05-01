import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AppShell from '../components/AppShell';

function bytes(b) {
  if (b >= 1073741824) return (b / 1073741824).toFixed(1) + ' GB';
  if (b >= 1048576)    return (b / 1048576).toFixed(0) + ' MB';
  return (b / 1024).toFixed(0) + ' KB';
}

function Barra({ valor, total, cor }) {
  const pct = total > 0 ? Math.min(100, Math.round((valor / total) * 100)) : 0;
  const bg  = pct > 85 ? '#E51B23' : pct > 65 ? '#F9C600' : cor || '#34973B';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: bg }} />
      </div>
      <span className="text-xs text-gray-500 w-9 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

function Badge({ ok, labelOk = 'OK', labelErro = 'Erro' }) {
  return ok
    ? <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#DCFCE7', color: '#166534' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />{labelOk}
      </span>
    : <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{labelErro}
      </span>;
}

function Linha({ label, valor, sub }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="text-right">
        <span className="text-xs font-medium text-gray-800">{valor}</span>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

export default function Saude() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Dados completos (30s) — ETL config, email, uptime
  const [dados, setDados]           = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState(null);
  const [ultimaAtt, setUltimaAtt]   = useState(null);

  // Dados ao vivo (1s) — CPU e memória apenas, sem banco
  const [live, setLive]             = useState(null);
  const liveRef                     = useRef(false);

  const [testando, setTestando]     = useState(false);
  const [resultadoEmail, setResultadoEmail] = useState(null);

  useEffect(() => {
    if (!user || user.perfilId !== 99) navigate('/');
  }, []);

  // ── Carga completa (30s) ──────────────────────────────────────────────────
  const carregar = useCallback(async () => {
    setCarregando(v => dados ? false : v); // só mostra spinner na primeira carga
    setErro(null);
    try {
      const { data } = await api.get('/api/health/detalhes');
      setDados(data);
      setUltimaAtt(new Date());
    } catch (e) {
      setErro(e.response?.data?.mensagem || 'Erro ao carregar dados de saúde.');
    } finally {
      setCarregando(false);
    }
  }, [dados]);

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    const id = setInterval(carregar, 30000);
    return () => clearInterval(id);
  }, [carregar]);

  // ── Live (1s) — sem banco ─────────────────────────────────────────────────
  useEffect(() => {
    liveRef.current = true;
    async function buscarLive() {
      try {
        const { data } = await api.get('/api/health/live');
        if (liveRef.current) setLive(data);
      } catch {
        // silencioso — não bloqueia a UI
      }
    }
    buscarLive();
    const id = setInterval(buscarLive, 1000);
    return () => { liveRef.current = false; clearInterval(id); };
  }, []);

  async function testarEmail() {
    setTestando(true);
    setResultadoEmail(null);
    try {
      const { data } = await api.post('/api/health/test-email');
      setResultadoEmail({ ok: true, mensagem: data.mensagem });
    } catch (e) {
      setResultadoEmail({ ok: false, mensagem: e.response?.data?.mensagem || 'Erro ao enviar.' });
    } finally {
      setTestando(false);
    }
  }

  const s   = dados?.sistema;
  const mem = live?.memoria ?? s?.memoria;

  // Carga da VPS vinda do live (1s) ou fallback para detalhes (30s)
  const carga = live?.carga ?? s?.carga;

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">

        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#004A80' }}>Saúde do Sistema</h1>
            <div className="flex items-center gap-3 mt-0.5">
              {ultimaAtt && (
                <p className="text-xs text-gray-400">
                  Configuração atualizada às {ultimaAtt.toLocaleTimeString('pt-BR')} (30s)
                </p>
              )}
              {live && (
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  CPU/RAM ao vivo (1s)
                </span>
              )}
            </div>
          </div>
          <button
            onClick={carregar}
            disabled={carregando}
            className="text-xs px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-[#004A80] hover:text-[#004A80] disabled:opacity-50 transition-colors"
          >
            {carregando ? 'Atualizando…' : 'Atualizar agora'}
          </button>
        </div>

        {erro && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
            {erro}
          </div>
        )}

        {carregando && !dados && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#004A80]/20 border-t-[#004A80] rounded-full animate-spin" />
          </div>
        )}

        {dados && (
          <div className="flex flex-col gap-4">

            {/* ── Status geral ── */}
            <div
              className="rounded-xl p-4 flex items-center gap-4"
              style={{ background: dados.ok ? '#DCFCE7' : '#FEE2E2', border: `1px solid ${dados.ok ? '#86EFAC' : '#FCA5A5'}` }}
            >
              <span className="text-3xl">{dados.ok ? '✅' : '🔴'}</span>
              <div>
                <p className="font-bold text-sm" style={{ color: dados.ok ? '#166534' : '#B91C1C' }}>
                  {dados.ok ? 'Sistema operacional' : 'Sistema com problemas'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: dados.ok ? '#166534' : '#B91C1C' }}>
                  {dados.etl.ultimaLeitura
                    ? `Última leitura há ${dados.etl.minutosDesdeUltimaLeitura} min`
                    : 'Nenhuma leitura registrada ainda'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* ── ETL / Scraping ── */}
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-sm font-semibold mb-3" style={{ color: '#004A80' }}>ETL / Scraping</h2>
                <div className="space-y-0.5">
                  <Linha label="Status"
                    valor={<Badge ok={dados.etl.ativo} labelOk="Ativo" labelErro="Desativado" />} />
                  <Linha label="Modo"
                    valor={dados.etl.fastMode ? 'Fast (domcontentloaded)' : 'Padrão (networkidle2)'} />
                  <Linha label="Concorrência"      valor={`${dados.etl.concurrency} abas`} />
                  <Linha label="Delay entre abas"  valor={`${dados.etl.tabDelay} ms`} />
                  <Linha label="Reciclar browser"  valor={`a cada ${dados.etl.browserRecycle} ciclos`} />
                  <Linha label="Última leitura"
                    valor={dados.etl.ultimaLeitura
                      ? new Date(dados.etl.ultimaLeitura).toLocaleString('pt-BR')
                      : '—'}
                    sub={dados.etl.minutosDesdeUltimaLeitura !== null
                      ? `há ${dados.etl.minutosDesdeUltimaLeitura} min`
                      : undefined} />
                </div>
              </div>

              {/* ── E-mail de alertas ── */}
              <div className="bg-white rounded-xl shadow p-5">
                <h2 className="text-sm font-semibold mb-3" style={{ color: '#004A80' }}>E-mail de Alertas</h2>
                <div className="space-y-0.5 mb-4">
                  <Linha label="Configurado"
                    valor={<Badge ok={dados.email.configurado} labelOk="Sim" labelErro="Não" />} />
                  <Linha label="Remetente"    valor={dados.email.remetente    || '—'} />
                  <Linha label="Destinatário" valor={dados.email.destinatario || '—'} />
                  <Linha label="Alerta CPU"
                    valor={`acima de ${live?.alertaThreshold ?? '80'}% da VPS`} />
                </div>

                <button
                  onClick={testarEmail}
                  disabled={testando || !dados.email.configurado}
                  className="w-full text-xs py-2 rounded-lg font-semibold text-white disabled:opacity-50 transition-colors"
                  style={{ background: '#004A80' }}
                  title={!dados.email.configurado ? 'Configure ALERT_EMAIL e ALERT_EMAIL_PASS no EasyPanel' : ''}
                >
                  {testando ? 'Enviando…' : 'Enviar e-mail de teste'}
                </button>

                {!dados.email.configurado && (
                  <p className="text-xs text-gray-400 mt-2 text-center">
                    Configure ALERT_EMAIL e ALERT_EMAIL_PASS no EasyPanel
                  </p>
                )}

                {resultadoEmail && (
                  <p className="mt-2 text-xs px-3 py-2 rounded-lg"
                     style={{ background: resultadoEmail.ok ? '#DCFCE7' : '#FEE2E2',
                              color:      resultadoEmail.ok ? '#166534' : '#B91C1C' }}>
                    {resultadoEmail.mensagem}
                  </p>
                )}
              </div>
            </div>

            {/* ── Recursos ao vivo ── */}
            <div className="bg-white rounded-xl shadow p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: '#004A80' }}>
                  Recursos do Servidor
                  {s && (
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {s.carga.nucleos} núcleos · Node {s.node}
                    </span>
                  )}
                </h2>
                {live && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                    ao vivo
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* CPU da VPS */}
                {carga && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Carga da CPU — VPS inteira
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { label: '1 min',  val: carga.um,     pct: carga.pctUm ?? Math.min(100, Math.round((carga.um / carga.nucleos) * 100)) },
                        { label: '5 min',  val: carga.cinco,  pct: Math.min(100, Math.round((carga.cinco  / carga.nucleos) * 100)) },
                        { label: '15 min', val: carga.quinze, pct: Math.min(100, Math.round((carga.quinze / carga.nucleos) * 100)) },
                      ].map(({ label, val, pct }) => {
                        const bg = pct > 85 ? '#E51B23' : pct > 65 ? '#F9C600' : '#34973B';
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                              <span>{label}</span>
                              <span className="tabular-nums font-medium" style={{ color: bg }}>
                                {val} <span className="text-gray-400 font-normal">({pct}%)</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: bg }} />
                              </div>
                              <span className="text-xs text-gray-400 w-9 text-right tabular-nums">{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {live?.cpuProcesso !== null && live?.cpuProcesso !== undefined && (
                      <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                        Nosso processo Node.js:{' '}
                        <span className="font-semibold text-[#004A80]">{live.cpuProcesso}%</span>
                        {' '}da capacidade total
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Alerta por e-mail acima de {live?.alertaThreshold ?? 80}%
                    </p>
                  </div>
                )}

                {/* Memória Node.js */}
                {mem && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Memória Node.js</p>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Heap usado</span>
                          <span className="tabular-nums">
                            {bytes(mem.heapUsado)} / {bytes(mem.heapLimite)}
                          </span>
                        </div>
                        <Barra valor={mem.heapUsado} total={mem.heapLimite} cor="#004A80" />
                        <p className="text-xs text-gray-400 mt-1">
                          Alocado: {bytes(mem.heapTotal)} — V8 expande até o limite automaticamente
                        </p>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>RSS (processo)</span>
                          <span className="tabular-nums">
                            {bytes(mem.rss)}
                            {s && (
                              <span className="text-gray-400 ml-1">
                                ({((mem.rss / s.memoria.sistemaTotal) * 100).toFixed(1)}% da RAM)
                              </span>
                            )}
                          </span>
                        </div>
                        {s && <Barra valor={mem.rss} total={s.memoria.sistemaTotal} cor="#00C0F3" />}
                        <p className="text-xs text-gray-400 mt-1">Heap + buffers + libs nativas</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Memória do sistema */}
                {s && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">RAM do Servidor</p>
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Em uso</span>
                        <span className="tabular-nums">
                          {bytes(s.memoria.sistemaTotal - s.memoria.sistemaLivre)} / {bytes(s.memoria.sistemaTotal)}
                        </span>
                      </div>
                      <Barra
                        valor={s.memoria.sistemaTotal - s.memoria.sistemaLivre}
                        total={s.memoria.sistemaTotal}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {bytes(s.memoria.sistemaLivre)} livre na VPS
                      </p>
                    </div>
                  </div>
                )}

                {/* Uptime */}
                {s && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Uptime</p>
                    <div className="space-y-0.5">
                      <Linha label="Processo Node.js"    valor={s.uptime.processoFormatado} />
                      <Linha label="Servidor / container" valor={s.uptime.sistemaFormatado} />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Uptime do container reinicia a cada deploy no EasyPanel.
                    </p>
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        <button
          onClick={() => navigate('/')}
          className="mt-6 text-sm underline"
          style={{ color: '#004A80' }}
        >
          Voltar ao Dashboard
        </button>
      </div>
    </AppShell>
  );
}

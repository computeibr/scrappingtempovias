import { useState, useEffect, useCallback } from 'react';
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
  const bg = pct > 85 ? '#E51B23' : pct > 65 ? '#F9C600' : cor || '#34973B';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: bg }} />
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

  const [dados, setDados]           = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]             = useState(null);
  const [ultimaAtt, setUltimaAtt]   = useState(null);

  const [testando, setTestando]     = useState(false);
  const [resultadoEmail, setResultadoEmail] = useState(null);

  useEffect(() => {
    if (!user || user.perfilId !== 99) navigate('/');
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
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
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Refresh automático a cada 30s
  useEffect(() => {
    const id = setInterval(carregar, 30000);
    return () => clearInterval(id);
  }, [carregar]);

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

  const s = dados?.sistema;
  const cargaMax = s ? Math.max(s.carga.um, s.carga.cinco, s.carga.quinze, s.carga.nucleos) : 1;
  const cargaPct = s ? Math.min(100, Math.round((s.carga.um / s.carga.nucleos) * 100)) : 0;
  const cargaCor = cargaPct > 85 ? '#E51B23' : cargaPct > 65 ? '#F9C600' : '#34973B';

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">

        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#004A80' }}>Saúde do Sistema</h1>
            {ultimaAtt && (
              <p className="text-xs text-gray-400 mt-0.5">
                Atualizado às {ultimaAtt.toLocaleTimeString('pt-BR')} · auto-refresh a cada 30s
              </p>
            )}
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
                  <Linha label="Concorrência"
                    valor={`${dados.etl.concurrency} abas`} />
                  <Linha label="Delay entre abas"
                    valor={`${dados.etl.tabDelay} ms`} />
                  <Linha label="Reciclar browser a cada"
                    valor={`${dados.etl.browserRecycle} ciclos`} />
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
                  <Linha label="Remetente"   valor={dados.email.remetente    || '—'} />
                  <Linha label="Destinatário" valor={dados.email.destinatario || '—'} />
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

            {/* ── Recursos do sistema ── */}
            <div className="bg-white rounded-xl shadow p-5">
              <h2 className="text-sm font-semibold mb-4" style={{ color: '#004A80' }}>
                Recursos do Servidor
                <span className="ml-2 text-xs font-normal text-gray-400 normal-case">
                  ({s.nucleos} núcleos · Node {s.node} · {s.plataforma})
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                {/* Memória do processo */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Memória Node.js</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Heap usado</span>
                        <span className="tabular-nums">{bytes(s.memoria.heapUsado)} / {bytes(s.memoria.heapTotal)}</span>
                      </div>
                      <Barra valor={s.memoria.heapUsado} total={s.memoria.heapTotal} cor="#004A80" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>RSS (processo total)</span>
                        <span className="tabular-nums">{bytes(s.memoria.rss)}</span>
                      </div>
                      <Barra valor={s.memoria.rss} total={s.memoria.sistemaTotal} cor="#00C0F3" />
                    </div>
                  </div>
                </div>

                {/* Memória do sistema */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Memória do Servidor</p>
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Livre</span>
                      <span className="tabular-nums">
                        {bytes(s.memoria.sistemaLivre)} / {bytes(s.memoria.sistemaTotal)}
                      </span>
                    </div>
                    <Barra
                      valor={s.memoria.sistemaTotal - s.memoria.sistemaLivre}
                      total={s.memoria.sistemaTotal}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {bytes(s.memoria.sistemaTotal - s.memoria.sistemaLivre)} em uso
                    </p>
                  </div>
                </div>

                {/* Carga da CPU */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Carga da CPU (load average)
                  </p>
                  <div className="space-y-1.5">
                    {[
                      { label: '1 min',  val: s.carga.um },
                      { label: '5 min',  val: s.carga.cinco },
                      { label: '15 min', val: s.carga.quinze },
                    ].map(({ label, val }) => {
                      const pct = Math.min(100, Math.round((val / s.carga.nucleos) * 100));
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                            <span>{label}</span>
                            <span className="tabular-nums">{val} <span className="text-gray-400">({pct}%)</span></span>
                          </div>
                          <Barra valor={val} total={s.carga.nucleos} />
                        </div>
                      );
                    })}
                    <p className="text-xs text-gray-400 mt-1">
                      {s.carga.nucleos} núcleos — ideal: load &lt; {s.carga.nucleos}
                    </p>
                  </div>
                </div>

                {/* Uptime */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Uptime</p>
                  <div className="space-y-0.5">
                    <Linha label="Processo Node.js" valor={s.uptime.processoFormatado} />
                    <Linha label="Servidor / container" valor={s.uptime.sistemaFormatado} />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    O uptime do container reinicia a cada deploy no EasyPanel.
                  </p>
                </div>

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

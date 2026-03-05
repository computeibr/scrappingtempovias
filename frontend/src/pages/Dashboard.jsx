import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../services/api';
import Navbar from '../components/Navbar';
import StatsCards from '../components/StatsCards';
import FilterPanel from '../components/FilterPanel';
import RouteMap from '../components/RouteMap';
import TimeChart from '../components/TimeChart';
import { routeColor } from '../utils/mapUtils';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rotas, setRotas] = useState([]);
  const [loadingRotas, setLoadingRotas] = useState(true);
  const [rotaAtiva, setRotaAtiva] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [search, setSearch] = useState('');
  const [snapshot, setSnapshot] = useState({});

  const [filters, setFilters] = useState({
    dataInicio: null,
    dataFim: null,
    diasSemana: [],
  });

  useEffect(() => {
    async function fetchInit() {
      try {
        const [rotasRes, resumoRes, snapshotRes] = await Promise.all([
          api.get('/api/dashboard/rotas'),
          api.get('/api/dashboard/resumo'),
          api.get('/api/dashboard/snapshot'),
        ]);
        setRotas(rotasRes.data.rotas);
        setResumo(resumoRes.data);
        setSnapshot(snapshotRes.data.snapshot || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRotas(false);
      }
    }
    fetchInit();
  }, []);

  const fetchHistorico = useCallback(
    async (id) => {
      if (!id) { setHistorico(null); return; }
      setLoadingHistorico(true);
      try {
        const params = {};
        if (filters.dataInicio) params.dataInicio = format(filters.dataInicio, 'yyyy-MM-dd');
        if (filters.dataFim) params.dataFim = format(filters.dataFim, 'yyyy-MM-dd');
        if (filters.diasSemana.length) params.diasSemana = filters.diasSemana.join(',');
        const { data } = await api.get(`/api/dashboard/historico/${id}`, { params });
        setHistorico(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingHistorico(false);
      }
    },
    [filters],
  );

  useEffect(() => {
    fetchHistorico(rotaAtiva?.id);
  }, [rotaAtiva, fetchHistorico]);

  function selectRota(rota) {
    setRotaAtiva((prev) => (prev?.id === rota.id ? null : rota));
  }

  const rotasFiltradas = rotas.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Painel lateral: lista de rotas */}
        <aside
          className={`
            flex-shrink-0 w-56 flex flex-col border-r border-white/10 overflow-hidden
            transition-transform duration-300 z-20
            fixed md:relative md:translate-x-0 inset-y-0 left-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
          style={{ background: '#13335A', top: 56 }}
        >
          <div className="px-3 py-2.5 border-b border-white/10 flex-shrink-0">
            <p className="text-white font-semibold text-xs uppercase tracking-widest mb-2">
              Rotas ({rotas.length})
            </p>
            <input
              type="text"
              placeholder="Buscar rota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/10 text-white placeholder-white/40 text-xs rounded px-2 py-1.5 outline-none focus:bg-white/20"
            />
          </div>

          <div className="flex-1 overflow-y-auto py-1">
            {loadingRotas && (
              <div className="flex items-center justify-center h-16">
                <div className="w-4 h-4 border-2 border-sky/50 border-t-sky rounded-full animate-spin" />
              </div>
            )}
            {!loadingRotas && rotasFiltradas.length === 0 && (
              <p className="text-white/40 text-xs text-center px-3 py-4">
                {search ? 'Nenhum resultado.' : 'Nenhuma rota cadastrada.'}
              </p>
            )}
            {!loadingRotas &&
              rotasFiltradas.map((rota) => {
                const idx = rotas.findIndex((r) => r.id === rota.id);
                const isActive = rotaAtiva?.id === rota.id;
                const color = routeColor(idx);
                return (
                  <button
                    key={rota.id}
                    onClick={() => selectRota(rota)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-all border-l-2 ${
                      isActive
                        ? 'bg-white/15 border-sky'
                        : 'hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    <span
                      className={`text-xs truncate flex-1 ${
                        isActive ? 'text-white font-semibold' : 'text-white/60'
                      }`}
                    >
                      {rota.name}
                    </span>
                    {isActive && (
                      <span className="text-sky text-xs">●</span>
                    )}
                  </button>
                );
              })}
          </div>

          <div className="px-3 py-2 border-t border-white/10 flex-shrink-0">
            <p className="text-white/30 text-xs text-center">Coleta automática · 5 min</p>
          </div>
        </aside>

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Área principal: mapa (topo) + análises (baixo) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mapa: mostra TODAS as rotas — altura fixa para deixar espaço para análises */}
          <div className="flex-shrink-0" style={{ height: 380 }}>
            <RouteMap
              rotas={rotas}
              rotaAtiva={rotaAtiva}
              snapshot={snapshot}
              onRotaClick={selectRota}
            />
          </div>

          {/* Painel de análises */}
          <div className="flex-1 overflow-y-auto bg-[#F0F0F0]">
            {!rotaAtiva ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-400 py-8">
                  <div className="text-4xl mb-3">&#8592;</div>
                  <p className="font-semibold text-gray-500 text-sm">
                    Selecione uma rota na lista para ver análises
                  </p>
                  <p className="text-xs mt-1 text-gray-400">
                    {rotas.length} rota(s) exibida(s) no mapa
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {/* Cabeçalho da rota ativa */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      background: routeColor(rotas.findIndex((r) => r.id === rotaAtiva.id)),
                    }}
                  />
                  <h2 className="font-bold text-navy text-sm truncate flex-1">
                    {rotaAtiva.name}
                  </h2>
                  <button
                    onClick={() => setRotaAtiva(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                  >
                    ✕ Fechar
                  </button>
                </div>

                {/* Cards de resumo */}
                <StatsCards
                  resumo={resumo}
                  rotaSelecionada={rotaAtiva}
                  historico={historico}
                />

                {/* Filtros do gráfico */}
                <FilterPanel filters={filters} onChange={setFilters} />

                {/* Gráfico */}
                <TimeChart
                  historico={historico}
                  rotaName={rotaAtiva.name}
                  loading={loadingHistorico}
                />

                {/* Tabela de leituras com paginação e filtro de data/hora */}
                <LastReadings
                  key={rotaAtiva.id}
                  rotaId={rotaAtiva.id}
                  rotaName={rotaAtiva.name}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente de leituras: paginação + filtro por data e hora
// ---------------------------------------------------------------------------
const LIMITE = 20;

function LastReadings({ rotaId, rotaName }) {
  const [page, setPage] = useState(1);
  const [dtInicioTemp, setDtInicioTemp] = useState(null);
  const [dtFimTemp, setDtFimTemp] = useState(null);
  const [dtInicio, setDtInicio] = useState(null);
  const [dtFim, setDtFim] = useState(null);
  const [data, setData] = useState({ registros: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { page, limite: LIMITE };
    if (dtInicio) params.dataInicio = dtInicio.toISOString();
    if (dtFim) params.dataFim = dtFim.toISOString();

    api
      .get(`/api/dashboard/ultimas/${rotaId}`, { params })
      .then(({ data: d }) => { if (!cancelled) setData(d); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [rotaId, page, dtInicio, dtFim]);

  function aplicar() {
    setDtInicio(dtInicioTemp);
    setDtFim(dtFimTemp);
    setPage(1);
  }

  function limpar() {
    setDtInicioTemp(null);
    setDtFimTemp(null);
    setDtInicio(null);
    setDtFim(null);
    setPage(1);
  }

  const { registros, total, totalPages } = data;

  // Gera até 5 números de página em torno da página atual
  const pageNumbers = (() => {
    const total = totalPages;
    const start = Math.max(1, Math.min(page - 2, total - 4));
    const end = Math.min(total, start + 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-semibold text-navy text-sm">
          Leituras — {rotaName}
        </h3>
        {total > 0 && (
          <span className="text-xs text-gray-400">{total.toLocaleString('pt-BR')} registros</span>
        )}
      </div>

      {/* Filtro por data e hora */}
      <div className="flex flex-wrap gap-2 items-end mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <label className="label">De</label>
          <DatePicker
            selected={dtInicioTemp}
            onChange={setDtInicioTemp}
            showTimeSelect
            dateFormat="dd/MM/yyyy HH:mm"
            timeFormat="HH:mm"
            timeIntervals={30}
            timeCaption="Hora"
            placeholderText="Data/hora início"
            locale={ptBR}
            className="input w-44"
          />
        </div>
        <div>
          <label className="label">Até</label>
          <DatePicker
            selected={dtFimTemp}
            onChange={setDtFimTemp}
            showTimeSelect
            dateFormat="dd/MM/yyyy HH:mm"
            timeFormat="HH:mm"
            timeIntervals={30}
            timeCaption="Hora"
            minDate={dtInicioTemp}
            placeholderText="Data/hora fim"
            locale={ptBR}
            className="input w-44"
          />
        </div>

        {/* Atalhos rápidos */}
        <div className="flex gap-1 pb-0.5">
          {[
            { label: 'Hoje', fn: () => { const d = new Date(); d.setHours(0,0,0,0); const e = new Date(); e.setHours(23,59,59,999); setDtInicioTemp(d); setDtFimTemp(e); } },
            { label: '7 dias', fn: () => { const d = new Date(); d.setDate(d.getDate()-6); d.setHours(0,0,0,0); const e = new Date(); e.setHours(23,59,59,999); setDtInicioTemp(d); setDtFimTemp(e); } },
            { label: '30 dias', fn: () => { const d = new Date(); d.setDate(d.getDate()-29); d.setHours(0,0,0,0); const e = new Date(); e.setHours(23,59,59,999); setDtInicioTemp(d); setDtFimTemp(e); } },
          ].map(({ label, fn }) => (
            <button
              key={label}
              onClick={fn}
              className="text-xs px-2 py-1 rounded border border-gray-300 text-gray-500 hover:border-navy hover:text-navy"
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={aplicar}
          className="text-xs px-3 py-1.5 rounded bg-navy text-white hover:bg-navy/90"
        >
          Filtrar
        </button>
        {(dtInicio || dtFim) && (
          <button
            onClick={limpar}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Limpar
          </button>
        )}
      </div>

      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
        </div>
      ) : registros.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">
          Nenhuma leitura encontrada para o período.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                  <th className="text-left py-2 pr-4 font-semibold">Data/Hora</th>
                  <th className="text-left py-2 pr-4 font-semibold">Tempo</th>
                  <th className="text-left py-2 font-semibold">Distância</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-50 hover:bg-brand-gray transition-colors"
                  >
                    <td className="py-1.5 pr-4 text-gray-600 text-xs">
                      {format(new Date(r.leitura), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-1.5 pr-4">
                      <span className="font-semibold text-navy text-xs">{r.tempo}</span>
                    </td>
                    <td className="py-1.5 text-gray-500 text-xs">{r.km}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 flex-wrap gap-2">
              <span className="text-xs text-gray-400">
                Página {page} de {totalPages} · {total.toLocaleString('pt-BR')} registros
              </span>
              <div className="flex gap-1 items-center">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                  className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:border-navy hover:text-navy"
                >
                  «
                </button>
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:border-navy hover:text-navy"
                >
                  ‹
                </button>
                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-2.5 py-1 text-xs rounded border ${
                      p === page
                        ? 'bg-navy text-white border-navy'
                        : 'border-gray-200 text-gray-600 hover:border-navy hover:text-navy'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:border-navy hover:text-navy"
                >
                  ›
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(totalPages)}
                  className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-30 hover:border-navy hover:text-navy"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

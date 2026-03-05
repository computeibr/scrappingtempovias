import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../services/api';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatsCards from '../components/StatsCards';
import FilterPanel from '../components/FilterPanel';
import RouteMap from '../components/RouteMap';
import TimeChart from '../components/TimeChart';

export default function Dashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rotas, setRotas] = useState([]);
  const [loadingRotas, setLoadingRotas] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [rotaAtiva, setRotaAtiva] = useState(null); // rota para o gráfico
  const [resumo, setResumo] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  const [filters, setFilters] = useState({
    dataInicio: null,
    dataFim: null,
    diasSemana: [],
  });

  // Carrega rotas e resumo ao montar
  useEffect(() => {
    async function fetchInit() {
      try {
        const [rotasRes, resumoRes] = await Promise.all([
          api.get('/api/dashboard/rotas'),
          api.get('/api/dashboard/resumo'),
        ]);
        setRotas(rotasRes.data.rotas);
        setResumo(resumoRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingRotas(false);
      }
    }
    fetchInit();
  }, []);

  // Busca histórico quando a rota ativa ou os filtros mudam
  const fetchHistorico = useCallback(
    async (id) => {
      if (!id) {
        setHistorico(null);
        return;
      }
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

  function toggleRota(id) {
    // Atualiza seleção no mapa
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    // Define rota ativa para o gráfico (última selecionada)
    const rota = rotas.find((r) => r.id === id);
    if (selectedIds.includes(id)) {
      // Desmarcando — se era a ativa, limpa
      if (rotaAtiva?.id === id) {
        const restante = selectedIds.filter((x) => x !== id);
        setRotaAtiva(restante.length ? rotas.find((r) => r.id === restante[restante.length - 1]) : null);
      }
    } else {
      setRotaAtiva(rota);
    }
  }

  const dataLabel = (() => {
    if (filters.dataInicio && filters.dataFim) {
      return `${format(filters.dataInicio, 'dd/MM/yy', { locale: ptBR })} – ${format(
        filters.dataFim,
        'dd/MM/yy',
        { locale: ptBR },
      )}`;
    }
    return 'Últimos 30 dias';
  })();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          rotas={rotas}
          selectedIds={selectedIds}
          onToggle={toggleRota}
          loading={loadingRotas}
          open={sidebarOpen}
        />

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-10 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Conteúdo principal */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Cabeçalho da página */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h1 className="text-xl font-bold text-navy-900">Dashboard</h1>
              <p className="text-sm text-gray-500">
                {selectedIds.length === 0
                  ? 'Selecione rotas na barra lateral'
                  : `${selectedIds.length} rota(s) selecionada(s) · ${dataLabel}`}
              </p>
            </div>

            {rotaAtiva && (
              <div className="flex items-center gap-2 bg-navy/10 border border-navy/20 rounded-lg px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-sky" />
                <span className="text-navy text-sm font-medium truncate max-w-48">{rotaAtiva.name}</span>
                <button
                  onClick={() => {
                    setRotaAtiva(null);
                    setSelectedIds([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 ml-1"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Cards de resumo */}
          <StatsCards resumo={resumo} rotaSelecionada={rotaAtiva} historico={historico} />

          {/* Filtros */}
          <FilterPanel filters={filters} onChange={setFilters} />

          {/* Mapa */}
          <div className="card p-0 overflow-hidden" style={{ height: 400 }}>
            {selectedIds.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #13335A 0%, #004A80 100%)' }}>
                <div className="text-5xl mb-4">🗺️</div>
                <p className="text-white font-semibold text-lg">Mapa de Rotas</p>
                <p className="text-white/50 text-sm mt-1">
                  Selecione uma ou mais rotas na barra lateral para visualizar no mapa
                </p>
              </div>
            ) : (
              <RouteMap rotasSelecionadas={selectedIds} rotas={rotas} />
            )}
          </div>

          {/* Gráfico de variação por hora */}
          <TimeChart
            historico={historico}
            rotaName={rotaAtiva?.name}
            loading={loadingHistorico}
          />

          {/* Tabela rápida: últimas leituras */}
          {rotaAtiva && historico && (
            <LastReadings rotaId={rotaAtiva.id} rotaName={rotaAtiva.name} />
          )}
        </main>
      </div>
    </div>
  );
}

function LastReadings({ rotaId, rotaName }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/api/dashboard/ultimas/${rotaId}?limite=10`)
      .then(({ data }) => setRegistros(data.registros))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [rotaId]);

  return (
    <div className="card">
      <h3 className="font-semibold text-navy-900 text-sm mb-3">
        Últimas leituras — {rotaName}
      </h3>

      {loading ? (
        <div className="h-16 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
        </div>
      ) : (
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
                <tr key={r.id} className="border-b border-gray-50 hover:bg-brand-gray transition-colors">
                  <td className="py-2 pr-4 text-gray-600">
                    {format(new Date(r.leitura), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="font-semibold text-navy">{r.tempo}</span>
                  </td>
                  <td className="py-2 text-gray-500">{r.km}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import AppShell from '../components/AppShell';
import RouteMap from '../components/RouteMap';
import TimeChart from '../components/TimeChart';
import { routeColor } from '../utils/mapUtils';

export default function Mapa() {
  const [rotas, setRotas] = useState([]);
  const [snapshot, setSnapshot] = useState({});
  const [loading, setLoading] = useState(true);
  const [rotaAtiva, setRotaAtiva] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [loadingHistorico, setLoadingHistorico] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const [rotasRes, snapshotRes] = await Promise.all([
          api.get('/api/dashboard/rotas'),
          api.get('/api/dashboard/snapshot'),
        ]);
        setRotas(rotasRes.data.rotas);
        setSnapshot(snapshotRes.data.snapshot || {});
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const fetchHistorico = useCallback(async (id) => {
    setLoadingHistorico(true);
    setHistorico(null);
    try {
      const { data } = await api.get(`/api/dashboard/historico/${id}`, {
        params: { diaSemanaRef: new Date().getDay() },
      });
      setHistorico(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistorico(false);
    }
  }, []);

  function handleRotaClick(rota) {
    setRotaAtiva(rota);
    fetchHistorico(rota.id);
  }

  function fecharModal() {
    setRotaAtiva(null);
    setHistorico(null);
  }

  const idxRota = rotaAtiva ? rotas.findIndex((r) => r.id === rotaAtiva.id) : -1;

  return (
    <AppShell>
      <div className="flex-1 relative overflow-hidden">

        {loading ? (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-[#004A80]/20 border-t-[#004A80] rounded-full animate-spin" />
          </div>
        ) : (
          <RouteMap
            rotas={rotas}
            rotaAtiva={rotaAtiva}
            snapshot={snapshot}
            onRotaClick={handleRotaClick}
          />
        )}

        {/* Modal com gráfico da rota */}
        {rotaAtiva && (
          <div
            className="absolute inset-0 flex items-end sm:items-center justify-center z-50 p-3 sm:p-6"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={fecharModal}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2 min-w-0">
                  {idxRota >= 0 && (
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ background: routeColor(idxRota) }}
                    />
                  )}
                  {rotaAtiva.url ? (
                    <a
                      href={rotaAtiva.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-[#004A80] text-sm hover:underline truncate"
                    >
                      {rotaAtiva.name}
                    </a>
                  ) : (
                    <span className="font-bold text-[#004A80] text-sm truncate">{rotaAtiva.name}</span>
                  )}
                  {rotaAtiva.categoria && (
                    <span className="text-xs text-gray-400 flex-shrink-0">· {rotaAtiva.categoria}</span>
                  )}
                </div>
                <button
                  onClick={fecharModal}
                  className="text-gray-400 hover:text-gray-600 text-lg ml-4 flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>

              {/* Gráfico */}
              <div className="p-4">
                <TimeChart
                  historico={historico}
                  rotaName={rotaAtiva.name}
                  loading={loadingHistorico}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}

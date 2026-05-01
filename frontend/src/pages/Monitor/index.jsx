import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import AppShell from '../../components/AppShell';
import RouteCard from './RouteCard';

const INTERVALO = 120; // segundos

export default function Monitor() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [countdown, setCountdown] = useState(INTERVALO);
  const [ordem, setOrdem] = useState('variacao'); // 'variacao' | 'alfabetica'
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const countRef = useRef(INTERVALO);

  async function fetchDados() {
    try {
      const { data } = await api.get('/api/monitor');
      setDados(data);
      setErro(null);
    } catch (err) {
      setErro('Erro ao carregar dados. Tentando novamente...');
    } finally {
      setLoading(false);
      countRef.current = INTERVALO;
      setCountdown(INTERVALO);
    }
  }

  // Carga inicial + intervalo de refresh
  useEffect(() => {
    fetchDados();
    const interval = setInterval(fetchDados, INTERVALO * 1000);
    return () => clearInterval(interval);
  }, []);

  // Contador regressivo
  useEffect(() => {
    const tick = setInterval(() => {
      countRef.current = Math.max(0, countRef.current - 1);
      setCountdown(countRef.current);
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const categorias = dados?.rotas
    ? [...new Set(dados.rotas.map(r => r.categoria).filter(Boolean))].sort()
    : [];

  const rotasOrdenadas = dados?.rotas
    ? [...dados.rotas]
        .filter(r => !filtroCategoria || (r.categoria || '') === filtroCategoria)
        .sort((a, b) => {
          if (ordem === 'alfabetica') return a.nome.localeCompare(b.nome, 'pt-BR');
          const va = a.variacao ?? -Infinity;
          const vb = b.variacao ?? -Infinity;
          return Math.abs(vb) - Math.abs(va);
        })
    : [];

  const resumo = dados?.rotas
    ? {
        acima:  dados.rotas.filter((r) => r.status === 'acima').length,
        abaixo: dados.rotas.filter((r) => r.status === 'abaixo').length,
        normal: dados.rotas.filter((r) => r.status === 'normal').length,
      }
    : null;

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-4 max-w-7xl mx-auto w-full">

        {/* Barra superior */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#004A80]">Monitor de Rotas</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Variação em relação à média histórica · mesmo horário e dia da semana
            </p>
            {categorias.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  onClick={() => setFiltroCategoria('')}
                  className="text-xs px-2.5 py-0.5 rounded-full border transition-colors"
                  style={filtroCategoria === ''
                    ? { background: '#004A80', borderColor: '#004A80', color: '#fff' }
                    : { borderColor: '#d1d5db', color: '#6b7280' }}
                >
                  Todas
                </button>
                {categorias.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFiltroCategoria(filtroCategoria === cat ? '' : cat)}
                    className="text-xs px-2.5 py-0.5 rounded-full border transition-colors"
                    style={filtroCategoria === cat
                      ? { background: '#004A80', borderColor: '#004A80', color: '#fff' }
                      : { borderColor: '#d1d5db', color: '#6b7280' }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro de ordenação */}
            <div className="flex rounded-lg overflow-hidden border border-gray-300 text-xs">
              <button
                onClick={() => setOrdem('variacao')}
                className={`px-3 py-1.5 transition-colors ${
                  ordem === 'variacao'
                    ? 'bg-[#004A80] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Maior variação
              </button>
              <button
                onClick={() => setOrdem('alfabetica')}
                className={`px-3 py-1.5 border-l border-gray-300 transition-colors ${
                  ordem === 'alfabetica'
                    ? 'bg-[#004A80] text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                A → Z
              </button>
            </div>

            {/* Atualizar manualmente */}
            <button
              onClick={fetchDados}
              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-[#004A80] hover:text-[#004A80] transition-colors"
            >
              Atualizar
            </button>

            {/* Countdown */}
            <div className="text-xs text-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-1.5 tabular-nums">
              Próxima atualização: {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
            </div>

          </div>
        </div>

        {/* Cards de resumo */}
        {resumo && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{resumo.acima}</p>
              <p className="text-xs text-red-500 mt-0.5">Acima da média</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-600">{resumo.normal}</p>
              <p className="text-xs text-gray-400 mt-0.5">Na média</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{resumo.abaixo}</p>
              <p className="text-xs text-green-500 mt-0.5">Abaixo da média</p>
            </div>
          </div>
        )}

        {/* Estado de carregamento */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#004A80]/20 border-t-[#004A80] rounded-full animate-spin" />
          </div>
        )}

        {/* Erro */}
        {erro && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-sm text-red-600 mb-4">
            {erro}
          </div>
        )}

        {/* Grid de cards */}
        {!loading && rotasOrdenadas.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {rotasOrdenadas.map((rota) => (
              <RouteCard key={rota.id} rota={rota} />
            ))}
          </div>
        )}

        {!loading && rotasOrdenadas.length === 0 && !erro && (
          <div className="text-center text-gray-400 py-20 text-sm">
            Nenhuma rota cadastrada.
          </div>
        )}
      </div>
    </AppShell>
  );
}

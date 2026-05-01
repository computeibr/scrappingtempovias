import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AppShell from '../components/AppShell';

export default function Ajustes() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orfas, setOrfas] = useState([]);
  const [selecionadas, setSelecionadas] = useState(new Set());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!user || user.perfilId !== 99) {
      navigate('/');
      return;
    }
    carregarOrfas();
  }, []);

  async function carregarOrfas() {
    setCarregando(true);
    try {
      const { data } = await api.get('/api/rotas/rotasvia/orfas');
      setOrfas(data.rotasvias || []);
      setSelecionadas(new Set());
    } catch {
      setOrfas([]);
    } finally {
      setCarregando(false);
    }
  }

  function toggleSelecionada(id) {
    setSelecionadas(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodas() {
    if (selecionadas.size === orfas.length) {
      setSelecionadas(new Set());
    } else {
      setSelecionadas(new Set(orfas.map(r => r.id)));
    }
  }

  async function handleAssumir(routeIds) {
    setSalvando(true);
    setMensagem(null);
    try {
      const { data } = await api.post('/api/rotas/rotasvia/orfas/assumir', { routeIds });
      setMensagem(data.mensagem);
      setErro(false);
      await carregarOrfas();
    } catch (err) {
      setMensagem(err.response?.data?.mensagem || 'Erro ao assumir rotas.');
      setErro(true);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#004A80' }}>
          Ajustes
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Rotas sem criador (legadas). Assuma a autoria para incluí-las no seu painel de gerenciamento.
        </p>

        {mensagem && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-sm"
            style={{ background: erro ? '#FEE2E2' : '#DCFCE7', color: erro ? '#B91C1C' : '#166534' }}
          >
            {mensagem}
          </div>
        )}

        <div className="bg-white rounded-xl shadow p-6">
          {carregando ? (
            <p className="text-sm text-gray-400">Carregando...</p>
          ) : orfas.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma rota órfã encontrada. Tudo em ordem!</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-600">
                  <strong>{orfas.length}</strong> rota(s) sem criador
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={toggleTodas}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                  >
                    {selecionadas.size === orfas.length ? 'Desmarcar todas' : 'Selecionar todas'}
                  </button>
                  {selecionadas.size > 0 && (
                    <button
                      onClick={() => handleAssumir([...selecionadas])}
                      disabled={salvando}
                      className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold disabled:opacity-60"
                      style={{ background: '#004A80' }}
                    >
                      {salvando ? 'Salvando...' : `Assumir selecionadas (${selecionadas.size})`}
                    </button>
                  )}
                  <button
                    onClick={() => handleAssumir([])}
                    disabled={salvando}
                    className="text-xs px-3 py-1.5 rounded-lg text-white font-semibold disabled:opacity-60"
                    style={{ background: '#E95F3E' }}
                  >
                    {salvando ? 'Salvando...' : 'Assumir todas'}
                  </button>
                </div>
              </div>

              <ul className="divide-y divide-gray-100">
                {orfas.map(rota => (
                  <li key={rota.id} className="py-3 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selecionadas.has(rota.id)}
                      onChange={() => toggleSelecionada(rota.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 cursor-pointer"
                      style={{ accentColor: '#004A80' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{rota.name}</p>
                      <a
                        href={rota.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-gray-400 hover:text-[#004A80] truncate block"
                      >
                        {rota.url}
                      </a>
                      {rota.categoria && (
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          {rota.categoria}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleAssumir([rota.id])}
                      disabled={salvando}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border font-medium disabled:opacity-60"
                      style={{ borderColor: '#004A80', color: '#004A80' }}
                    >
                      Assumir
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

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

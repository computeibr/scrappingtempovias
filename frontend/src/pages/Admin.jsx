import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [rotas, setRotas] = useState([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (user?.perfilId !== 99) {
      navigate('/');
    } else {
      carregarRotas();
    }
  }, []);

  async function carregarRotas() {
    try {
      const { data } = await api.get('/api/rotas/rotasvia');
      setRotas(data.rotasvias || []);
    } catch {
      setRotas([]);
    }
  }

  async function handleCadastrar(e) {
    e.preventDefault();
    setMensagem(null);
    setCarregando(true);
    try {
      const { data } = await api.post('/api/rotas/rotasvia', { name, url });
      setMensagem(data.mensagem);
      setErro(false);
      setName('');
      setUrl('');
      carregarRotas();
    } catch (err) {
      setMensagem(err.response?.data?.mensagem || 'Erro ao cadastrar rota.');
      setErro(true);
    } finally {
      setCarregando(false);
    }
  }

  async function handleRemover(id, nomeDaRota) {
    if (!confirm(`Remover a rota "${nomeDaRota}"?`)) return;
    try {
      await api.delete(`/api/rotas/rotasvia/${id}`);
      carregarRotas();
    } catch {
      alert('Erro ao remover rota.');
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0F0F0' }}>
      <Navbar />

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#004A80' }}>
          Gerenciar Rotas
        </h1>

        {/* Formulário de cadastro */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#13335A' }}>
            Cadastrar nova rota
          </h2>

          <form onSubmit={handleCadastrar} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da rota
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Centro → Barra"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': '#004A80' }}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL do Google Maps
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.google.com/maps/dir/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Abra a rota no Google Maps, copie a URL completa da barra de endereços e cole aqui.
              </p>
            </div>

            {mensagem && (
              <p
                className="text-sm px-3 py-2 rounded-lg"
                style={{
                  background: erro ? '#FEE2E2' : '#DCFCE7',
                  color: erro ? '#B91C1C' : '#166534',
                }}
              >
                {mensagem}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="self-start px-6 py-2 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ background: '#004A80' }}
            >
              {carregando ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
        </div>

        {/* Lista de rotas */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#13335A' }}>
            Rotas cadastradas ({rotas.length})
          </h2>

          {rotas.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma rota cadastrada ainda.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {rotas.map((rota) => (
                <li key={rota.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{rota.name}</p>
                    <p className="text-xs text-gray-400 truncate">{rota.url}</p>
                  </div>
                  <button
                    onClick={() => handleRemover(rota.id, rota.name)}
                    className="flex-shrink-0 text-xs px-3 py-1 rounded-lg border transition-colors"
                    style={{ borderColor: '#E51B23', color: '#E51B23' }}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
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
    </div>
  );
}

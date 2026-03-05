import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader } from '@react-google-maps/api';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import { parseGoogleMapsUrl } from '../utils/mapUtils';

const LIBRARIES = ['geometry', 'places'];

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY || '';

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    language: 'pt-BR',
    region: 'BR',
  });

  const [rotas, setRotas] = useState([]);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [editando, setEditando] = useState(null); // { id, name, url }

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

  function getGeometry(parsedUrl) {
    return new Promise((resolve) => {
      if (!isLoaded || !window.google) return resolve(null);
      const service = new window.google.maps.DirectionsService();
      service.route(
        {
          origin: parsedUrl.origin,
          destination: parsedUrl.destination,
          waypoints: parsedUrl.waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
          region: 'BR',
        },
        (result, status) => {
          if (status === 'OK') {
            resolve(result.routes[0]?.overview_polyline || null);
          } else {
            console.warn('DirectionsService status:', status);
            resolve(null);
          }
        },
      );
    });
  }

  async function resolveGeometry(inputUrl) {
    if (!isLoaded) return null;
    const parsed = parseGoogleMapsUrl(inputUrl);
    if (!parsed) return null;
    return getGeometry(parsed);
  }

  async function handleCadastrar(e) {
    e.preventDefault();
    setMensagem(null);
    setCarregando(true);
    try {
      const geometry = await resolveGeometry(url);
      const { data } = await api.post('/api/rotas/rotasvia', { name, url, geometry });
      setMensagem(data.mensagem + (geometry ? ' (traçado salvo)' : ' (traçado não capturado — verifique a URL)'));
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

  async function handleSalvarEdicao(e) {
    e.preventDefault();
    setMensagem(null);
    setCarregando(true);
    try {
      const geometry = await resolveGeometry(editando.url);
      await api.put(`/api/rotas/rotasvia/${editando.id}`, {
        name: editando.name,
        url: editando.url,
        geometry,
      });
      setMensagem('Rota atualizada!' + (geometry ? ' (traçado recapturado)' : ' (traçado não capturado — verifique a URL)'));
      setErro(false);
      setEditando(null);
      carregarRotas();
    } catch (err) {
      setMensagem(err.response?.data?.mensagem || 'Erro ao atualizar rota.');
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da rota</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Centro → Barra"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL do Google Maps</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.google.com/maps/dir/..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Abra a rota no Google Maps, copie a URL da barra de endereços. O traçado será capturado automaticamente.
              </p>
            </div>

            {mensagem && (
              <p
                className="text-sm px-3 py-2 rounded-lg"
                style={{ background: erro ? '#FEE2E2' : '#DCFCE7', color: erro ? '#B91C1C' : '#166534' }}
              >
                {mensagem}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando || !isLoaded}
              className="self-start px-6 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
              style={{ background: '#004A80' }}
            >
              {carregando ? 'Cadastrando...' : !isLoaded ? 'Carregando Maps...' : 'Cadastrar'}
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
                <li key={rota.id} className="py-3">
                  {editando?.id === rota.id ? (
                    /* Formulário de edição inline */
                    <form onSubmit={handleSalvarEdicao} className="flex flex-col gap-3">
                      <input
                        type="text"
                        value={editando.name}
                        onChange={(e) => setEditando({ ...editando, name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        required
                      />
                      <input
                        type="url"
                        value={editando.url}
                        onChange={(e) => setEditando({ ...editando, url: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        required
                      />
                      <p className="text-xs text-gray-400">
                        Ao salvar, o traçado será recapturado automaticamente com a nova URL.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={carregando}
                          className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                          style={{ background: '#004A80' }}
                        >
                          {carregando ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(null)}
                          className="px-4 py-1.5 rounded-lg text-xs border border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Exibição normal */
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-800">{rota.name}</p>
                          {rota.geometry ? (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#DCFCE7', color: '#166534' }}>
                              traçado ok
                            </span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#FEF9C3', color: '#854D0E' }}>
                              sem traçado
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{rota.url}</p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setEditando({ id: rota.id, name: rota.name, url: rota.url })}
                          className="text-xs px-3 py-1 rounded-lg border transition-colors"
                          style={{ borderColor: '#004A80', color: '#004A80' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleRemover(rota.id, rota.name)}
                          className="text-xs px-3 py-1 rounded-lg border transition-colors"
                          style={{ borderColor: '#E51B23', color: '#E51B23' }}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  )}
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

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Polyline } from '@react-google-maps/api';
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
  const [preview, setPreview] = useState(null); // { path, encodedPolyline, status }
  const [previewCarregando, setPreviewCarregando] = useState(false);
  const [editando, setEditando] = useState(null);

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

  function getGeometryFromUrl(inputUrl) {
    return new Promise((resolve) => {
      if (!isLoaded || !window.google) {
        return resolve({ encodedPolyline: null, path: null, status: 'API_NOT_LOADED' });
      }
      const parsed = parseGoogleMapsUrl(inputUrl);
      if (!parsed) {
        return resolve({ encodedPolyline: null, path: null, status: 'URL_INVALIDA' });
      }

      const service = new window.google.maps.DirectionsService();
      service.route(
        {
          origin: parsed.origin,
          destination: parsed.destination,
          waypoints: parsed.waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
          region: 'BR',
        },
        (result, status) => {
          if (status === 'OK') {
            const encodedPolyline = result.routes[0]?.overview_polyline || null;
            const path = encodedPolyline
              ? window.google.maps.geometry.encoding.decodePath(encodedPolyline)
              : null;
            resolve({ encodedPolyline, path, status });
          } else {
            console.warn('DirectionsService:', status);
            resolve({ encodedPolyline: null, path: null, status });
          }
        },
      );
    });
  }

  async function handleVisualizar() {
    if (!url) return;
    setPreview(null);
    setPreviewCarregando(true);
    const result = await getGeometryFromUrl(url);
    setPreview(result);
    setPreviewCarregando(false);
  }

  async function handleVisualizarEdicao() {
    if (!editando?.url) return;
    setPreview(null);
    setPreviewCarregando(true);
    const result = await getGeometryFromUrl(editando.url);
    setPreview(result);
    setPreviewCarregando(false);
  }

  async function handleCadastrar(e) {
    e.preventDefault();
    setMensagem(null);
    setCarregando(true);
    try {
      const geometry = preview?.encodedPolyline || null;
      const { data } = await api.post('/api/rotas/rotasvia', { name, url, geometry });
      setMensagem(data.mensagem + (geometry ? ' Traçado salvo.' : ' Traçado não capturado — use "Visualizar" antes de salvar.'));
      setErro(false);
      setName('');
      setUrl('');
      setPreview(null);
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
      const geometry = preview?.encodedPolyline || null;
      await api.put(`/api/rotas/rotasvia/${editando.id}`, {
        name: editando.name,
        url: editando.url,
        geometry,
      });
      setMensagem('Rota atualizada!' + (geometry ? ' Traçado salvo.' : ' Traçado não capturado — use "Visualizar" antes de salvar.'));
      setErro(false);
      setEditando(null);
      setPreview(null);
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

  function handleIniciarEdicao(rota) {
    setEditando({ id: rota.id, name: rota.name, url: rota.url });
    setPreview(null);
    setMensagem(null);
  }

  function handleCancelarEdicao() {
    setEditando(null);
    setPreview(null);
  }

  const previewMap = preview?.path ? (
    <div className="mt-3 rounded-xl overflow-hidden border border-gray-200" style={{ height: 240 }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={preview.path[Math.floor(preview.path.length / 2)]}
        zoom={13}
        options={{ disableDefaultUI: true, zoomControl: true }}
      >
        <Polyline
          path={preview.path}
          options={{ strokeColor: '#004A80', strokeWeight: 5, strokeOpacity: 0.9 }}
        />
      </GoogleMap>
    </div>
  ) : preview && !preview.path ? (
    <p className="mt-2 text-sm px-3 py-2 rounded-lg" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
      {preview.status === 'URL_INVALIDA'
        ? 'URL não reconhecida. Use uma URL do tipo: google.com/maps/dir/Origem/Destino'
        : preview.status === 'API_NOT_LOADED'
        ? 'API do Google Maps ainda não carregou. Aguarde e tente novamente.'
        : `Traçado não encontrado (${preview.status}). Verifique se a Directions API está habilitada no Google Cloud Console.`}
    </p>
  ) : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0F0F0' }}>
      <Navbar />

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#004A80' }}>
          Gerenciar Rotas
        </h1>

        {/* Formulário de cadastro */}
        {!editando && (
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
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do Google Maps</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setPreview(null); }}
                    placeholder="https://www.google.com/maps/dir/..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleVisualizar}
                    disabled={!url || !isLoaded || previewCarregando}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50 transition-colors"
                    style={{ borderColor: '#004A80', color: '#004A80' }}
                  >
                    {previewCarregando ? 'Buscando...' : !isLoaded ? 'Carregando...' : 'Visualizar rota'}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Cole a URL do Google Maps e clique em "Visualizar" para confirmar o traçado antes de salvar.
                </p>
              </div>

              {previewMap}

              {preview?.path && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ background: '#DCFCE7', color: '#166534' }}>
                  Traçado encontrado! Confira no mapa acima e clique em Cadastrar para salvar.
                </p>
              )}

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
                {carregando ? 'Cadastrando...' : 'Cadastrar'}
              </button>
            </form>
          </div>
        )}

        {/* Formulário de edição */}
        {editando && (
          <div className="bg-white rounded-xl shadow p-6 mb-8 border-2" style={{ borderColor: '#004A80' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#13335A' }}>
              Editando rota
            </h2>

            <form onSubmit={handleSalvarEdicao} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da rota</label>
                <input
                  type="text"
                  value={editando.name}
                  onChange={(e) => setEditando({ ...editando, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do Google Maps</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editando.url}
                    onChange={(e) => { setEditando({ ...editando, url: e.target.value }); setPreview(null); }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleVisualizarEdicao}
                    disabled={!editando.url || !isLoaded || previewCarregando}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50"
                    style={{ borderColor: '#004A80', color: '#004A80' }}
                  >
                    {previewCarregando ? 'Buscando...' : !isLoaded ? 'Carregando...' : 'Visualizar rota'}
                  </button>
                </div>
              </div>

              {previewMap}

              {preview?.path && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ background: '#DCFCE7', color: '#166534' }}>
                  Traçado encontrado! Clique em Salvar para atualizar.
                </p>
              )}

              {mensagem && (
                <p
                  className="text-sm px-3 py-2 rounded-lg"
                  style={{ background: erro ? '#FEE2E2' : '#DCFCE7', color: erro ? '#B91C1C' : '#166534' }}
                >
                  {mensagem}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={carregando || !isLoaded}
                  className="px-6 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: '#004A80' }}
                >
                  {carregando ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelarEdicao}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

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
                      onClick={() => handleIniciarEdicao(rota)}
                      className="text-xs px-3 py-1 rounded-lg border"
                      style={{ borderColor: '#004A80', color: '#004A80' }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleRemover(rota.id, rota.name)}
                      className="text-xs px-3 py-1 rounded-lg border"
                      style={{ borderColor: '#E51B23', color: '#E51B23' }}
                    >
                      Remover
                    </button>
                  </div>
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

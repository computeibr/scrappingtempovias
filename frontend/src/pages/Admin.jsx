import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJsApiLoader, GoogleMap, Polyline } from '@react-google-maps/api';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AppShell from '../components/AppShell';
import { parseGoogleMapsUrl } from '../utils/mapUtils';

const LIBRARIES = ['geometry', 'places'];
const FORM_VAZIO = { name: '', url: '', categoria: '' };
const RIO_CENTER = { lat: -22.9068, lng: -43.1729 };

// Fora do componente para evitar remount a cada render
function PreviewMap({ path }) {
  if (!path || path.length === 0) return null;

  function onMapLoad(map) {
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach(pt => bounds.extend(pt));
    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }

  return (
    <div className="mt-4 rounded-xl overflow-hidden border-2 border-[#004A80]" style={{ height: 450 }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={RIO_CENTER}
        zoom={11}
        options={{ zoomControl: true, scrollwheel: true, streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
        onLoad={onMapLoad}
      >
        <Polyline
          path={path}
          options={{ strokeColor: '#004A80', strokeWeight: 6, strokeOpacity: 0.95 }}
        />
      </GoogleMap>
    </div>
  );
}

function PreviewStatus({ pv }) {
  if (!pv || pv.path) return null;
  const msg =
    pv.status === 'URL_INVALIDA'
      ? 'URL não reconhecida. Use: google.com/maps/dir/Origem/Destino'
      : pv.status === 'API_NOT_LOADED'
      ? 'API do Google Maps ainda carregando. Aguarde e tente novamente.'
      : `Traçado não encontrado (${pv.status}). Verifique se a Directions API está habilitada.`;
  return (
    <p className="mt-2 text-sm px-3 py-2 rounded-lg" style={{ background: '#FEE2E2', color: '#B91C1C' }}>
      {msg}
    </p>
  );
}

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

  const [rotas, setRotas]                         = useState([]);
  const [form, setForm]                           = useState(FORM_VAZIO);
  const [editando, setEditando]                   = useState(null);
  const [shareAberto, setShareAberto]             = useState(null);
  const [novoEmail, setNovoEmail]                 = useState('');
  const [preview, setPreview]                     = useState(null);
  const [previewCarregando, setPreviewCarregando] = useState(false);
  const [mensagem, setMensagem]                   = useState(null);
  const [erro, setErro]                           = useState(false);
  const [carregando, setCarregando]               = useState(false);
  const [filtroCategoria, setFiltroCategoria]     = useState('');
  const [tentouCadastrar, setTentouCadastrar]     = useState(false);
  const [tentouEditar, setTentouEditar]           = useState(false);

  useEffect(() => {
    if (!user || user.perfilId < 2) {
      navigate('/');
    } else {
      carregarRotas();
    }
  }, []);

  async function carregarRotas() {
    try {
      const { data } = await api.get('/api/rotas/rotasvia/minhas');
      setRotas(data.rotasvias || []);
    } catch {
      setRotas([]);
    }
  }

  // ─── Geometry via DirectionsService ────────────────────────────────────────
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
            resolve({ encodedPolyline: null, path: null, status });
          }
        },
      );
    });
  }

  async function handleVisualizar(urlSrc) {
    setPreview(null);
    setPreviewCarregando(true);
    const result = await getGeometryFromUrl(urlSrc);
    setPreview(result);
    setPreviewCarregando(false);
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────
  async function handleCadastrar(e) {
    e.preventDefault();
    setTentouCadastrar(true);
    if (!form.name.trim() || !form.url.trim() || !form.categoria.trim()) return;
    setMensagem(null);
    setCarregando(true);
    try {
      const geometry = preview?.encodedPolyline || null;
      const { data } = await api.post('/api/rotas/rotasvia', { ...form, geometry });
      setMensagem(data.mensagem + (geometry ? ' Traçado salvo.' : ' Use "Visualizar" para capturar o traçado.'));
      setErro(false);
      setForm(FORM_VAZIO);
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
    setTentouEditar(true);
    if (!editando.name.trim() || !editando.url.trim()) return;
    setMensagem(null);
    setCarregando(true);
    try {
      const geometry = preview?.encodedPolyline || null;
      await api.put(`/api/rotas/rotasvia/${editando.id}`, {
        name: editando.name,
        url: editando.url,
        categoria: editando.categoria,
        geometry,
      });
      setMensagem('Rota atualizada!' + (geometry ? ' Traçado salvo.' : ''));
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
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao remover rota.');
    }
  }

  // ─── Compartilhamento ───────────────────────────────────────────────────────
  async function handleCompartilhar(routeId) {
    if (!novoEmail.trim()) return;
    try {
      await api.post(`/api/rotas/rotasvia/${routeId}/compartilhar`, { email: novoEmail.trim() });
      setNovoEmail('');
      carregarRotas();
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao compartilhar.');
    }
  }

  async function handleRemoverShare(routeId, email) {
    try {
      await api.delete(`/api/rotas/rotasvia/${routeId}/compartilhar/${encodeURIComponent(email)}`);
      carregarRotas();
    } catch (err) {
      alert(err.response?.data?.mensagem || 'Erro ao remover compartilhamento.');
    }
  }

  // ─── Agrupamento por categoria ──────────────────────────────────────────────
  const categorias = [...new Set(rotas.map(r => r.categoria || 'Sem categoria'))].sort();

  const rotasFiltradas = filtroCategoria
    ? rotas.filter(r => (r.categoria || 'Sem categoria') === filtroCategoria)
    : rotas;

  const rotasPorCategoria = rotasFiltradas.reduce((acc, rota) => {
    const cat = rota.categoria || 'Sem categoria';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(rota);
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-4 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#004A80' }}>
          Gerenciar Rotas
        </h1>

        {/* ── Formulário de cadastro ────────────────────────────────────────── */}
        {!editando && (
          <div className="bg-white rounded-xl shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#13335A' }}>
              Cadastrar nova rota
            </h2>
            <form onSubmit={handleCadastrar} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da rota <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Centro → Barra"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                      tentouCadastrar && !form.name.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {tentouCadastrar && !form.name.trim() && (
                    <p className="text-xs text-red-500 mt-1">Informe o nome da rota.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.categoria}
                    onChange={e => setForm({ ...form, categoria: e.target.value })}
                    placeholder="Ex: Zona Sul, Corredor Av. Brasil"
                    list="categorias-existentes"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                      tentouCadastrar && !form.categoria.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {tentouCadastrar && !form.categoria.trim() && (
                    <p className="text-xs text-red-500 mt-1">Informe a categoria.</p>
                  )}
                  <datalist id="categorias-existentes">
                    {categorias.filter(c => c !== 'Sem categoria').map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Google Maps <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={form.url}
                    onChange={e => { setForm({ ...form, url: e.target.value }); setPreview(null); }}
                    placeholder="https://www.google.com/maps/dir/..."
                    className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                      tentouCadastrar && !form.url.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleVisualizar(form.url)}
                    disabled={!form.url || !isLoaded || previewCarregando}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50"
                    style={{ borderColor: '#004A80', color: '#004A80' }}
                  >
                    {previewCarregando ? 'Buscando...' : !isLoaded ? 'Carregando...' : 'Visualizar'}
                  </button>
                </div>
                {tentouCadastrar && !form.url.trim() ? (
                  <p className="text-xs text-red-500 mt-1">Informe a URL do Google Maps.</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">
                    Clique em "Visualizar" para confirmar o traçado antes de salvar.
                  </p>
                )}
              </div>

              <PreviewMap path={preview?.path} />
              <PreviewStatus pv={preview} />

              {preview?.path && (
                <p className="text-sm px-3 py-2 rounded-lg" style={{ background: '#DCFCE7', color: '#166534' }}>
                  Traçado encontrado! Clique em Cadastrar para salvar.
                </p>
              )}

              {mensagem && (
                <p className="text-sm px-3 py-2 rounded-lg"
                   style={{ background: erro ? '#FEE2E2' : '#DCFCE7', color: erro ? '#B91C1C' : '#166534' }}>
                  {mensagem}
                </p>
              )}

              <div className="flex items-center gap-4 flex-wrap">
                <button
                  type="submit"
                  disabled={carregando || !isLoaded}
                  className="px-6 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                  style={{ background: '#004A80' }}
                >
                  {carregando ? 'Cadastrando...' : 'Cadastrar'}
                </button>
                <p className="text-xs text-gray-400">
                  Campos marcados com <span className="text-red-500">*</span> são obrigatórios
                </p>
              </div>
            </form>
          </div>
        )}

        {/* ── Formulário de edição ──────────────────────────────────────────── */}
        {editando && (
          <div className="bg-white rounded-xl shadow p-6 mb-8 border-2" style={{ borderColor: '#004A80' }}>
            <h2 className="text-lg font-semibold mb-4" style={{ color: '#13335A' }}>
              Editando rota
            </h2>
            <form onSubmit={handleSalvarEdicao} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da rota <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editando.name}
                    onChange={e => setEditando({ ...editando, name: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                      tentouEditar && !editando.name.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {tentouEditar && !editando.name.trim() && (
                    <p className="text-xs text-red-500 mt-1">Informe o nome da rota.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    value={editando.categoria}
                    onChange={e => setEditando({ ...editando, categoria: e.target.value })}
                    list="categorias-existentes"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Google Maps <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={editando.url}
                    onChange={e => { setEditando({ ...editando, url: e.target.value }); setPreview(null); }}
                    className={`flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                      tentouEditar && !editando.url.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => handleVisualizar(editando.url)}
                    disabled={!editando.url || !isLoaded || previewCarregando}
                    className="px-4 py-2 rounded-lg text-sm font-semibold border disabled:opacity-50"
                    style={{ borderColor: '#004A80', color: '#004A80' }}
                  >
                    {previewCarregando ? 'Buscando...' : 'Visualizar'}
                  </button>
                </div>
                {tentouEditar && !editando.url.trim() && (
                  <p className="text-xs text-red-500 mt-1">Informe a URL do Google Maps.</p>
                )}
              </div>

              <PreviewMap path={preview?.path} />
              <PreviewStatus pv={preview} />

              {mensagem && (
                <p className="text-sm px-3 py-2 rounded-lg"
                   style={{ background: erro ? '#FEE2E2' : '#DCFCE7', color: erro ? '#B91C1C' : '#166634' }}>
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
                  onClick={() => { setEditando(null); setPreview(null); setTentouEditar(false); }}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Filtros por categoria ─────────────────────────────────────────── */}
        {categorias.length > 1 && (
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">Filtrar:</span>
            <button
              onClick={() => setFiltroCategoria('')}
              className="text-xs px-3 py-1 rounded-full border transition-colors"
              style={filtroCategoria === ''
                ? { background: '#004A80', color: '#fff', borderColor: '#004A80' }
                : { color: '#555', borderColor: '#d1d5db' }}
            >
              Todas
            </button>
            {categorias.map(cat => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className="text-xs px-3 py-1 rounded-full border transition-colors"
                style={filtroCategoria === cat
                  ? { background: '#004A80', color: '#fff', borderColor: '#004A80' }
                  : { color: '#555', borderColor: '#d1d5db' }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* ── Lista agrupada por categoria ──────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          {Object.keys(rotasPorCategoria).length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6">
              <p className="text-sm text-gray-400">Nenhuma rota encontrada.</p>
            </div>
          ) : (
            Object.entries(rotasPorCategoria).map(([cat, lista]) => (
              <div key={cat} className="bg-white rounded-xl shadow p-6">
                <h2 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: '#004A80' }}>
                  {cat}
                  <span className="ml-2 text-xs font-normal text-gray-400 normal-case">
                    ({lista.length})
                  </span>
                </h2>

                <ul className="divide-y divide-gray-100">
                  {lista.map(rota => (
                    <li key={rota.id}>
                      <div className="py-3 flex items-start justify-between gap-4">
                        {/* Info da rota */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <a
                              href={rota.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium hover:underline"
                              style={{ color: '#004A80' }}
                            >
                              {rota.name}
                            </a>
                            {rota.geometry ? (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#DCFCE7', color: '#166534' }}>
                                traçado ok
                              </span>
                            ) : (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#FEF9C3', color: '#854D0E' }}>
                                sem traçado
                              </span>
                            )}
                            {rota.isSharedWithMe && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
                                compartilhado
                              </span>
                            )}
                            {rota.creatorId === null && (
                              <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#FEF3C7', color: '#92400E' }}>
                                legada
                              </span>
                            )}
                          </div>
                          <a
                            href={rota.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-[#004A80] truncate block"
                          >
                            {rota.url}
                          </a>
                        </div>

                        {/* Botões de ação (apenas para quem pode editar) */}
                        {rota.canEdit && (
                          <div className="flex gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleIniciarEdicao(rota)}
                              className="text-xs px-3 py-1 rounded-lg border"
                              style={{ borderColor: '#004A80', color: '#004A80' }}
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
                                setShareAberto(shareAberto === rota.id ? null : rota.id);
                                setNovoEmail('');
                              }}
                              className="text-xs px-3 py-1 rounded-lg border"
                              style={{ borderColor: '#00C0F3', color: '#00C0F3' }}
                            >
                              Compartilhar
                            </button>
                            <button
                              onClick={() => handleRemover(rota.id, rota.name)}
                              className="text-xs px-3 py-1 rounded-lg border"
                              style={{ borderColor: '#E51B23', color: '#E51B23' }}
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Painel de compartilhamento inline */}
                      {shareAberto === rota.id && (
                        <div className="mb-3 p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <p className="text-xs font-semibold text-gray-600 mb-2">
                            Compartilhado com (somente leitura):
                          </p>
                          {rota.shares.length === 0 ? (
                            <p className="text-xs text-gray-400 mb-2">Nenhum compartilhamento ainda.</p>
                          ) : (
                            <ul className="mb-2 flex flex-col gap-1">
                              {rota.shares.map(email => (
                                <li key={email} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700">{email}</span>
                                  <button
                                    onClick={() => handleRemoverShare(rota.id, email)}
                                    className="text-red-500 hover:text-red-700 ml-3 underline"
                                  >
                                    remover
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="flex gap-2 mt-2">
                            <input
                              type="email"
                              value={novoEmail}
                              onChange={e => setNovoEmail(e.target.value)}
                              placeholder="email@exemplo.com"
                              className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleCompartilhar(rota.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleCompartilhar(rota.id)}
                              className="text-xs px-3 py-1 rounded text-white"
                              style={{ background: '#004A80' }}
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
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

  function handleIniciarEdicao(rota) {
    setEditando({ id: rota.id, name: rota.name, url: rota.url, categoria: rota.categoria || '' });
    setPreview(null);
    setMensagem(null);
    setShareAberto(null);
  }
}

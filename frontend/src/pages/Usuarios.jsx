import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AppShell from '../components/AppShell';

const PERFIS = [
  { id: 1, nome: 'View', descricao: 'Somente visualização' },
  { id: 2, nome: 'User', descricao: 'Usuário padrão' },
  { id: 99, nome: 'Admin', descricao: 'Acesso total' },
];

const BADGE = {
  1: { bg: '#F0F9FF', color: '#0369A1', label: 'View' },
  2: { bg: '#F0FDF4', color: '#166534', label: 'User' },
  99: { bg: '#FFF7ED', color: '#C2410C', label: 'Admin' },
};

function PerfilBadge({ perfilId }) {
  const b = BADGE[perfilId] || { bg: '#F3F4F6', color: '#374151', label: `Perfil ${perfilId}` };
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: b.bg, color: b.color }}
    >
      {b.label}
    </span>
  );
}

export default function Usuarios() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(false);

  // Formulário novo usuário
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [novoPerfil, setNovoPerfil] = useState(1);
  const [salvando, setSalvando] = useState(false);

  // Edição inline
  const [editando, setEditando] = useState(null); // { id, name, email, perfilId, password, avatarUrl }
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (user?.perfilId !== 99) {
      navigate('/');
    } else {
      carregarUsuarios();
    }
  }, []);

  async function carregarUsuarios() {
    setCarregando(true);
    try {
      const { data } = await api.get('/api/auth/usuarios');
      setUsuarios(data);
    } catch {
      setUsuarios([]);
    } finally {
      setCarregando(false);
    }
  }

  function flash(msg, isErro = false) {
    setMensagem(msg);
    setErro(isErro);
    setTimeout(() => setMensagem(null), 4000);
  }

  async function handleCriar(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const { data } = await api.post('/api/auth/criar-usuario', {
        name: novoNome,
        email: novoEmail,
        password: novaSenha,
        perfilId: novoPerfil,
      });
      flash(data.mensagem);
      setNovoNome('');
      setNovoEmail('');
      setNovaSenha('');
      setNovoPerfil(1);
      carregarUsuarios();
    } catch (err) {
      flash(err.response?.data?.mensagem || 'Erro ao criar usuário.', true);
    } finally {
      setSalvando(false);
    }
  }

  async function handleSalvarEdicao(e) {
    e.preventDefault();
    setSalvando(true);
    try {
      const payload = {
        name: editando.name,
        email: editando.email,
        perfilId: editando.perfilId,
      };
      if (editando.password) payload.password = editando.password;
      const { data } = await api.put(`/api/auth/usuarios/${editando.id}`, payload);
      flash(data.mensagem);
      setEditando(null);
      carregarUsuarios();
    } catch (err) {
      flash(err.response?.data?.mensagem || 'Erro ao atualizar usuário.', true);
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(id, nome) {
    if (!confirm(`Remover o usuário "${nome}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await api.delete(`/api/auth/usuarios/${id}`);
      flash('Usuário removido.');
      carregarUsuarios();
    } catch (err) {
      flash(err.response?.data?.mensagem || 'Erro ao remover usuário.', true);
    }
  }

  async function handleUploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file || !editando) return;
    const form = new FormData();
    form.append('avatar', file);
    try {
      const { data } = await api.post(`/api/auth/usuarios/${editando.id}/avatar`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEditando(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
      flash('Foto atualizada com sucesso.');
      carregarUsuarios();
    } catch (err) {
      flash(err.response?.data?.mensagem || 'Erro ao enviar foto.', true);
    }
    e.target.value = '';
  }

  async function handleRemoverAvatar(id) {
    if (!confirm('Remover a foto de perfil deste usuário?')) return;
    try {
      await api.delete(`/api/auth/usuarios/${id}/avatar`);
      flash('Foto removida.');
      setEditando(prev => prev ? { ...prev, avatarUrl: null } : prev);
      carregarUsuarios();
    } catch (err) {
      flash(err.response?.data?.mensagem || 'Erro ao remover foto.', true);
    }
  }

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#004A80' }}>
          Gerenciar Usuários
        </h1>
        <p className="text-sm text-gray-400 mb-6">Crie, edite e remova usuários do sistema.</p>

        {/* Perfis legenda */}
        <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-4">
          {PERFIS.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <PerfilBadge perfilId={p.id} />
              <span className="text-xs text-gray-500">{p.descricao}</span>
            </div>
          ))}
        </div>

        {/* Formulário novo usuário */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#13335A' }}>
            Novo usuário
          </h2>
          <form onSubmit={handleCriar} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  placeholder="Nome completo"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1"
                  style={{ '--tw-ring-color': '#004A80' }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input
                  type="email"
                  value={novoEmail}
                  onChange={e => setNovoEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Senha inicial"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                <select
                  value={novoPerfil}
                  onChange={e => setNovoPerfil(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  {PERFIS.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} — {p.descricao}</option>
                  ))}
                </select>
              </div>
            </div>

            {mensagem && !editando && (
              <p
                className="text-sm px-3 py-2 rounded-lg"
                style={{ background: erro ? '#FEE2E2' : '#DCFCE7', color: erro ? '#B91C1C' : '#166534' }}
              >
                {mensagem}
              </p>
            )}

            <button
              type="submit"
              disabled={salvando}
              className="self-start px-6 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
              style={{ background: '#004A80' }}
            >
              {salvando ? 'Criando...' : 'Criar usuário'}
            </button>
          </form>
        </div>

        {/* Lista de usuários */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#13335A' }}>
            Usuários cadastrados {!carregando && `(${usuarios.length})`}
          </h2>

          {carregando ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-[#004A80] rounded-full animate-spin" />
            </div>
          ) : usuarios.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum usuário cadastrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {usuarios.map(u => (
                <li key={u.id} className="py-4">
                  {editando?.id === u.id ? (
                    <form onSubmit={handleSalvarEdicao} className="flex flex-col gap-3">
                      {/* Avatar preview + upload no form de edição */}
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleUploadAvatar}
                      />
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => avatarInputRef.current?.click()}
                          title="Clique para alterar a foto"
                          className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-[#004A80] transition-colors"
                        >
                          {editando.avatarUrl ? (
                            <img src={editando.avatarUrl} alt={editando.name} className="w-full h-full object-cover" />
                          ) : (
                            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-gray-400">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                          )}
                        </button>
                        <div>
                          <button
                            type="button"
                            onClick={() => avatarInputRef.current?.click()}
                            className="text-xs font-medium hover:underline block"
                            style={{ color: '#004A80' }}
                          >
                            {editando.avatarUrl ? 'Alterar foto' : 'Adicionar foto'}
                          </button>
                          <p className="text-xs text-gray-400 mt-0.5">JPG, PNG ou WebP · máx. 2 MB</p>
                          {editando.avatarUrl && (
                            <button
                              type="button"
                              onClick={() => handleRemoverAvatar(editando.id)}
                              className="text-xs text-red-500 hover:text-red-700 underline mt-0.5 block"
                            >
                              Remover foto
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                          <input
                            type="text"
                            value={editando.name}
                            onChange={e => setEditando({ ...editando, name: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                          <input
                            type="email"
                            value={editando.email}
                            onChange={e => setEditando({ ...editando, email: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Nova senha (opcional)</label>
                          <input
                            type="password"
                            value={editando.password || ''}
                            onChange={e => setEditando({ ...editando, password: e.target.value })}
                            placeholder="Deixe em branco para manter"
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Perfil</label>
                          <select
                            value={editando.perfilId}
                            onChange={e => setEditando({ ...editando, perfilId: parseInt(e.target.value) })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
                          >
                            {PERFIS.map(p => (
                              <option key={p.id} value={p.id}>{p.nome} — {p.descricao}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {mensagem && editando && (
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
                          disabled={salvando}
                          className="px-4 py-1.5 rounded-lg text-white text-xs font-semibold disabled:opacity-60"
                          style={{ background: '#004A80' }}
                        >
                          {salvando ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditando(null)}
                          className="px-4 py-1.5 rounded-lg text-xs border border-gray-300 text-gray-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          <svg viewBox="0 0 24 24" className="w-6 h-6 fill-gray-400">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                          </svg>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{u.name}</span>
                          <PerfilBadge perfilId={u.perfilId} />
                          {u.id === user?.id && (
                            <span className="text-xs text-gray-400">(você)</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{u.email}</p>
                        <p className="text-xs text-gray-300 mt-0.5">
                          Criado em {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      {/* Ações */}
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => setEditando({ id: u.id, name: u.name, email: u.email, perfilId: u.perfilId, password: '', avatarUrl: u.avatarUrl })}
                          title="Editar usuário"
                          className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors hover:bg-blue-50"
                          style={{ borderColor: '#004A80', color: '#004A80' }}
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleRemover(u.id, u.name)}
                            title="Remover usuário"
                            className="w-8 h-8 flex items-center justify-center rounded-lg border transition-colors hover:bg-red-50"
                            style={{ borderColor: '#E51B23', color: '#E51B23' }}
                          >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                          </button>
                        )}
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
    </AppShell>
  );
}

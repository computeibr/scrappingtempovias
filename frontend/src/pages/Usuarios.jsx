import { useState, useEffect } from 'react';
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
  const [editando, setEditando] = useState(null); // { id, name, email, perfilId, password }

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
                    <div className="flex items-center justify-between gap-4">
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
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setEditando({ id: u.id, name: u.name, email: u.email, perfilId: u.perfilId, password: '' })}
                          className="text-xs px-3 py-1 rounded-lg border"
                          style={{ borderColor: '#004A80', color: '#004A80' }}
                        >
                          Editar
                        </button>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleRemover(u.id, u.name)}
                            className="text-xs px-3 py-1 rounded-lg border"
                            style={{ borderColor: '#E51B23', color: '#E51B23' }}
                          >
                            Remover
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

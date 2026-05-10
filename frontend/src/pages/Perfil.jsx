import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import AppShell from '../components/AppShell';

export default function Perfil() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [nome, setNome]         = useState(user?.name  || '');
  const [email, setEmail]       = useState(user?.email || '');
  const [senha, setSenha]       = useState('');
  const [senhaConf, setSenhaConf] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro]         = useState(false);
  const [uploadando, setUploadando] = useState(false);

  function flash(msg, isErro = false) {
    setMensagem(msg);
    setErro(isErro);
    setTimeout(() => setMensagem(null), 4000);
  }

  async function handleSalvar(e) {
    e.preventDefault();
    if (senha && senha !== senhaConf) {
      flash('As senhas não coincidem.', true);
      return;
    }
    setSalvando(true);
    try {
      const payload = { name: nome, email };
      if (senha) payload.password = senha;
      const { data } = await api.put('/api/auth/me', payload);
      updateUser({ name: data.user.name, email: data.user.email });
      setSenha('');
      setSenhaConf('');
      flash(data.mensagem);
    } catch (err) {
      flash(err.response?.data?.mensagem || 'Erro ao salvar.', true);
    } finally {
      setSalvando(false);
    }
  }

  async function handleAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadando(true);
    const form = new FormData();
    form.append('avatar', file);
    try {
      const { data } = await api.post('/api/auth/me/avatar', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ avatarUrl: data.user.avatarUrl });
      flash('Foto atualizada!');
    } catch (err) {
      flash(err.response?.data?.mensagem || 'Erro ao enviar foto.', true);
    } finally {
      setUploadando(false);
      e.target.value = '';
    }
  }

  const BADGE = { 1: { label: 'View', color: '#0369A1' }, 2: { label: 'User', color: '#166534' }, 99: { label: 'Admin', color: '#C2410C' } };
  const perfil = BADGE[user?.perfilId] || { label: `Perfil ${user?.perfilId}`, color: '#374151' };

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-4 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-[#004A80] transition-colors">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
            </svg>
          </button>
          <h1 className="text-xl font-bold" style={{ color: '#004A80' }}>Meu Perfil</h1>
        </div>

        {/* Avatar */}
        <div className="bg-white rounded-xl shadow p-6 mb-4 flex flex-col items-center gap-3">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatar} />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploadando}
            className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center hover:opacity-90 transition-opacity group"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-14 h-14 fill-gray-300">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            )}
            {/* Overlay câmera */}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white">
                <path d="M12 15.2A3.2 3.2 0 1 1 15.2 12 3.2 3.2 0 0 1 12 15.2zm9-9h-2.2l-1.5-2H6.7L5.2 6.2H3A1.8 1.8 0 0 0 1.2 8v12A1.8 1.8 0 0 0 3 21.8h18A1.8 1.8 0 0 0 22.8 20V8A1.8 1.8 0 0 0 21 6.2z"/>
              </svg>
            </div>
            {uploadando && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </button>

          <div className="text-center">
            <p className="font-semibold text-gray-800">{user?.name}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: perfil.color, background: perfil.color + '15' }}>
              {perfil.label}
            </span>
          </div>
          <p className="text-xs text-gray-400">Toque na foto para alterar · JPG, PNG ou WebP · máx. 2 MB</p>
        </div>

        {/* Formulário */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-base font-semibold mb-4" style={{ color: '#13335A' }}>Dados do perfil</h2>
          <form onSubmit={handleSalvar} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#004A80]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#004A80]"
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-3">Deixe em branco para manter a senha atual</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
                  <input
                    type="password"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#004A80]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha</label>
                  <input
                    type="password"
                    value={senhaConf}
                    onChange={e => setSenhaConf(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none ${
                      senhaConf && senha !== senhaConf ? 'border-red-400' : 'border-gray-300 focus:ring-1 focus:ring-[#004A80]'
                    }`}
                  />
                  {senhaConf && senha !== senhaConf && (
                    <p className="text-xs text-red-500 mt-1">Senhas não coincidem</p>
                  )}
                </div>
              </div>
            </div>

            {mensagem && (
              <p className="text-sm px-3 py-2 rounded-lg" style={{
                background: erro ? '#FEE2E2' : '#DCFCE7',
                color: erro ? '#B91C1C' : '#166534',
              }}>
                {mensagem}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={salvando || (senhaConf && senha !== senhaConf)}
                className="px-6 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: '#004A80' }}
              >
                {salvando ? 'Salvando...' : 'Salvar alterações'}
              </button>
              <p className="text-xs text-gray-400">Perfil: <strong>{perfil.label}</strong> — somente Admin pode alterar</p>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

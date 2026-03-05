import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setErro(err.response?.data?.mensagem || 'Erro ao autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Painel esquerdo — identidade visual */}
      <div
        className="hidden md:flex md:w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #13335A 0%, #004A80 60%, #00C0F3 100%)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-wide">Tempovias</span>
          </div>

          <h1 className="text-white text-4xl font-bold leading-tight mb-4">
            Monitoramento<br />de Rotas em<br />Tempo Real
          </h1>
          <p className="text-white/70 text-base leading-relaxed">
            Acompanhe a variação do trânsito nas principais vias da cidade. Dados coletados
            automaticamente a cada 5 minutos diretamente do Google Maps.
          </p>
        </div>

        {/* Estatísticas decorativas */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Coleta automática', value: 'a cada 5 min' },
            { label: 'Fuso horário', value: 'America/SP' },
            { label: 'Dados históricos', value: '30+ dias' },
            { label: 'Plataforma', value: 'CETRIO / Rio' },
          ].map((item) => (
            <div key={item.label} className="bg-white/10 rounded-xl p-4">
              <div className="text-white font-semibold text-sm">{item.value}</div>
              <div className="text-white/60 text-xs mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-8 bg-brand-gray">
        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: '#004A80' }}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <span className="font-bold text-navy text-lg">Tempovias</span>
          </div>

          <h2 className="text-2xl font-bold text-navy-900 mb-1">Acesso ao sistema</h2>
          <p className="text-gray-500 text-sm mb-8">
            Insira suas credenciais para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {erro}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full py-3 text-base"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            Prefeitura do Rio de Janeiro — CETRIO
          </p>
        </div>
      </div>
    </div>
  );
}

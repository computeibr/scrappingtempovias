import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar({ sidebarOpen, onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header
      className="h-14 flex items-center justify-between px-4 shadow-md z-30 flex-shrink-0"
      style={{ background: '#004A80' }}
    >
      {/* Esquerda */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="text-white/80 hover:text-white p-1 rounded md:hidden"
          aria-label="Menu"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
          </div>
          <span className="text-white font-bold text-base tracking-wide">Tempovias</span>
        </div>

        <span className="hidden sm:block text-white/40 text-xs ml-2">
          Monitoramento de Rotas — CETRIO
        </span>
      </div>

      {/* Direita */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-sky/30 flex items-center justify-center">
            <span className="text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <span className="text-white/80 text-sm">{user?.name}</span>
        </div>

        <button
          onClick={handleLogout}
          className="text-white/70 hover:text-white text-xs border border-white/30 hover:border-white/60 px-3 py-1.5 rounded-lg transition-colors"
        >
          Sair
        </button>
      </div>
    </header>
  );
}

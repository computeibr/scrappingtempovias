import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Ícones inline — sem dependência extra
const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  ),
  monitor: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4 2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4zm0 14V14l2.5-1.5L11 14v4H6zm6 0h6v-2h-6v2zm0-4h6v-2h-6v2zm0-4h6V8h-6v2z" />
    </svg>
  ),
  route: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
    </svg>
  ),
  menu: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  ),
};

const LogoIcon = ({ size = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${size} fill-white`}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

const NAV_ITEMS = [
  { to: '/',            label: 'Dashboard',      icon: Icons.dashboard },
  { to: '/monitor',     label: 'Monitor',         icon: Icons.monitor   },
  { to: '/feriados',    label: 'Dias Não Úteis',  icon: Icons.calendar  },
  { to: '/metodologia', label: 'Metodologia',     icon: Icons.book      },
];

const ADMIN_ITEMS = [
  { to: '/admin', label: 'Gerenciar Rotas', icon: Icons.route },
];

const ALL_NAV_ITEMS = [...NAV_ITEMS, ...ADMIN_ITEMS];

function NavItem({ item, active, onClick }) {
  return (
    <Link
      to={item.to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 text-sm transition-all border-l-2 ${
        active
          ? 'bg-white/15 text-white font-semibold border-[#00C0F3]'
          : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'
      }`}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export default function AppShell({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = user?.perfilId === 99;
  const items = isAdmin ? ALL_NAV_ITEMS : NAV_ITEMS;
  const avatarInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function isActive(to) {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#F0F0F0]">

      {navOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-56 flex-shrink-0
          transition-transform duration-300
          md:relative md:translate-x-0
          ${navOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full" style={{ background: '#004A80' }}>
          <div className="h-14 flex items-center gap-3 px-4 border-b border-white/10 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <LogoIcon />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight">Tempovias</p>
              <p className="text-white/40 text-xs leading-tight">CETRIO · Rio de Janeiro</p>
            </div>
            <button
              onClick={() => setNavOpen(false)}
              className="ml-auto text-white/60 hover:text-white md:hidden"
            >
              {Icons.close}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-2">
            {items.map((item) => (
              <NavItem
                key={item.to}
                item={item}
                active={isActive(item.to)}
                onClick={() => setNavOpen(false)}
              />
            ))}
          </nav>

          <div className="px-4 py-4 border-t border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{avatarInitial}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{user?.name}</p>
                <p className="text-white/40 text-xs truncate">{isAdmin ? 'Administrador' : 'Usuário'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-white/50 hover:text-white text-xs transition-colors w-full"
            >
              {Icons.logout}
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        <header
          className="h-14 flex items-center gap-3 px-4 flex-shrink-0 md:hidden shadow-md"
          style={{ background: '#004A80' }}
        >
          <button
            onClick={() => setNavOpen(true)}
            className="text-white/80 hover:text-white p-1 rounded"
            aria-label="Abrir menu"
          >
            {Icons.menu}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center">
              <LogoIcon size="w-3.5 h-3.5" />
            </div>
            <span className="text-white font-bold text-sm">Tempovias</span>
          </div>
          <div className="ml-auto w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{avatarInitial}</span>
          </div>
        </header>

        <div className="flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ─── Ícones inline ────────────────────────────────────────────────────────────
const Icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  ),
  monitor: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4 2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4zm0 14V14l2.5-1.5L11 14v4H6zm6 0h6v-2h-6v2zm0-4h6v-2h-6v2zm0-4h6V8h-6v2z" />
    </svg>
  ),
  route: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.02 7.02 0 0 0-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.47.47 0 0 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
    </svg>
  ),
  health: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402C1 3.9 4.068 2 6.5 2 8.352 2 10.22 2.985 12 5c1.78-2.015 3.648-3 5.5-3C19.932 2 23 3.9 23 7.191c0 4.105-5.37 8.863-11 14.402z"/>
    </svg>
  ),
  agent: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2M5 14v2a7 7 0 0 0 14 0v-2H5m3 2h2v2H8v-2m6 0h2v2h-2v-2z"/>
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
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
  chevronLeft: (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
    </svg>
  ),
};

const LogoIcon = ({ size = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={`${size} fill-white`}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

// ─── Itens de navegação ───────────────────────────────────────────────────────
const NAV_ITEMS = [
  { to: '/',            label: 'Dashboard',     icon: Icons.dashboard },
  { to: '/monitor',     label: 'Monitor',        icon: Icons.monitor   },
  { to: '/mapa',        label: 'Mapa',           icon: Icons.map       },
  { to: '/feriados',    label: 'Dias Não Úteis', icon: Icons.calendar  },
  { to: '/metodologia', label: 'Metodologia',    icon: Icons.book      },
];

const USER_ITEMS = [
  { to: '/admin', label: 'Gerenciar Rotas', icon: Icons.route },
];

const ADMIN_ONLY_ITEMS = [
  { to: '/usuarios', label: 'Gerenciar Usuários', icon: Icons.users    },
  { to: '/ajustes',  label: 'Ajustes',            icon: Icons.settings },
  { to: '/saude',    label: 'Saúde do Sistema',   icon: Icons.health   },
  { to: '/agente',   label: 'Agente',             icon: Icons.agent    },
];

// ─── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({ item, active, onClick, collapsed }) {
  return (
    <Link
      to={item.to}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`flex items-center text-sm transition-all border-l-2 ${
        collapsed ? 'justify-center py-3 px-0' : 'gap-3 px-4 py-3'
      } ${
        active
          ? 'bg-white/15 text-white font-semibold border-[#00C0F3]'
          : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'
      }`}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────
export default function AppShell({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(() =>
    localStorage.getItem('tv_sidebar') !== 'false'
  );
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAdmin = user?.perfilId === 99;
  const isUser  = user?.perfilId >= 2;

  const sidebarItems = [
    ...NAV_ITEMS,
    ...(isUser  ? USER_ITEMS       : []),
    ...(isAdmin ? ADMIN_ONLY_ITEMS : []),
  ];

  const avatarInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  function toggleSidebar() {
    const next = !sidebarExpanded;
    setSidebarExpanded(next);
    localStorage.setItem('tv_sidebar', String(next));
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function isActive(to) {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  }

  // Bottom tab bar — todos os itens acessíveis ao usuário, com scroll horizontal
  const mobileNavItems = sidebarItems;

  return (
    // h-dvh: dynamic viewport height — resolve bug do Safari mobile com URL bar
    <div className="h-dvh flex overflow-hidden bg-[#F0F0F0]">

      {/* Overlay mobile */}
      {navOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 flex-shrink-0
          transition-all duration-300
          md:relative md:translate-x-0
          ${navOpen ? 'translate-x-0' : '-translate-x-full'}
          ${sidebarExpanded ? 'w-56' : 'md:w-14 w-56'}
        `}
      >
        <div className="flex flex-col h-full" style={{ background: '#13335A' }}>

          {/* Header da sidebar */}
          <div className={`h-14 flex items-center border-b border-white/10 flex-shrink-0 px-3 gap-2`}>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <LogoIcon />
            </div>
            {/* Texto — oculto no modo colapsado desktop */}
            <div className={`min-w-0 flex-1 transition-all duration-300 overflow-hidden ${!sidebarExpanded ? 'md:w-0 md:opacity-0' : 'opacity-100'}`}>
              <p className="text-white font-bold text-sm leading-tight whitespace-nowrap">Tempovias</p>
              <p className="text-white/40 text-xs leading-tight whitespace-nowrap">CETRIO · Rio de Janeiro</p>
            </div>
            {/* Botão fechar (mobile) */}
            <button
              onClick={() => setNavOpen(false)}
              className="text-white/60 hover:text-white md:hidden flex-shrink-0"
            >
              {Icons.close}
            </button>
            {/* Botão colapsar (desktop) */}
            <button
              onClick={toggleSidebar}
              title={sidebarExpanded ? 'Recolher menu' : 'Expandir menu'}
              className="hidden md:flex items-center justify-center text-white/40 hover:text-white flex-shrink-0 transition-transform duration-300 w-6 h-6 rounded hover:bg-white/10"
              style={{ transform: sidebarExpanded ? 'rotate(0deg)' : 'rotate(180deg)' }}
            >
              {Icons.chevronLeft}
            </button>
          </div>

          {/* Navegação */}
          <nav className="flex-1 overflow-y-auto py-2">
            {sidebarItems.map((item) => (
              <NavItem
                key={item.to}
                item={item}
                active={isActive(item.to)}
                onClick={() => setNavOpen(false)}
                collapsed={!sidebarExpanded}
              />
            ))}
          </nav>

          {/* Bloco do usuário */}
          <div className={`border-t border-white/10 flex-shrink-0 py-3 ${sidebarExpanded ? 'px-4' : 'md:px-0 px-4'}`}>
            <div className={`flex items-center mb-2 gap-2 ${!sidebarExpanded ? 'md:justify-center' : ''}`}>
              <Link
                to="/perfil"
                title="Editar perfil"
                className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden bg-white/20 hover:ring-2 hover:ring-[#00C0F3] transition-all"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white/80">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                )}
              </Link>
              <div className={`min-w-0 flex-1 transition-all duration-300 overflow-hidden ${!sidebarExpanded ? 'md:w-0 md:opacity-0' : 'opacity-100'}`}>
                <p className="text-white text-xs font-medium truncate whitespace-nowrap">{user?.name}</p>
                <p className="text-white/40 text-xs whitespace-nowrap">{isAdmin ? 'Administrador' : 'Usuário'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title={!sidebarExpanded ? 'Sair' : undefined}
              className={`flex items-center text-white/50 hover:text-white text-xs transition-colors w-full gap-2 ${!sidebarExpanded ? 'md:justify-center' : ''}`}
            >
              {Icons.logout}
              <span className={`transition-all duration-300 overflow-hidden ${!sidebarExpanded ? 'md:w-0 md:opacity-0' : 'opacity-100'}`}>
                Sair
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Área principal ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header mobile */}
        <header
          className="h-14 flex items-center gap-3 px-4 flex-shrink-0 md:hidden shadow-md"
          style={{ background: '#13335A' }}
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
          <Link
            to="/perfil"
            title="Editar perfil"
            className="ml-auto w-7 h-7 rounded-full overflow-hidden bg-white/20 flex items-center justify-center hover:ring-2 hover:ring-[#00C0F3] transition-all"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white/80">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            )}
          </Link>
        </header>

        {/* Conteúdo das páginas — mb-14 no mobile reserva espaço para a tab bar */}
        <div className="flex-1 overflow-hidden flex flex-col mb-14 md:mb-0">
          {children}
        </div>
      </div>

      {/* ── Bottom tab bar (mobile only) — oculta quando sidebar está aberta ── */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 md:hidden flex overflow-x-auto${navOpen ? ' hidden' : ''}`}
        style={{
          background: '#13335A',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {mobileNavItems.map((item) => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-none flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? 'text-[#00C0F3]' : 'text-white/50 active:text-white/80'
              }`}
              style={{ minWidth: 64 }}
            >
              <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
              <span className="text-[10px] font-medium leading-tight text-center px-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
}

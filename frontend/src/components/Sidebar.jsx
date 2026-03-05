import { routeColor } from '../utils/mapUtils';

export default function Sidebar({ rotas, selectedIds, onToggle, loading, open }) {
  return (
    <aside
      className={`
        flex-shrink-0 w-64 flex flex-col border-r border-white/10 overflow-hidden transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full'}
        fixed md:relative md:translate-x-0 inset-y-0 left-0 z-20 md:z-auto
      `}
      style={{ background: '#13335A' }}
    >
      <div className="px-4 py-3 border-b border-white/10 flex-shrink-0">
        <h2 className="text-white font-semibold text-sm uppercase tracking-widest">
          Rotas monitoradas
        </h2>
        <p className="text-white/50 text-xs mt-0.5">{rotas.length} rotas cadastradas</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-sky/50 border-t-sky rounded-full animate-spin" />
          </div>
        )}

        {!loading && rotas.length === 0 && (
          <p className="text-white/40 text-xs text-center px-4 py-6">
            Nenhuma rota cadastrada.
          </p>
        )}

        {!loading &&
          rotas.map((rota, idx) => {
            const isSelected = selectedIds.includes(rota.id);
            const color = routeColor(idx);

            return (
              <button
                key={rota.id}
                onClick={() => onToggle(rota.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left transition-all
                  ${isSelected ? 'bg-white/15' : 'hover:bg-white/5'}
                `}
              >
                {/* Indicador de cor */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 border-2 border-white/30"
                  style={{ background: isSelected ? color : 'transparent', borderColor: color }}
                />

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      isSelected ? 'text-white' : 'text-white/60'
                    }`}
                  >
                    {rota.name}
                  </p>
                  <p className="text-white/30 text-xs truncate mt-0.5">ID #{rota.id}</p>
                </div>

                {isSelected && (
                  <div className="w-1.5 h-5 rounded-full flex-shrink-0" style={{ background: color }} />
                )}
              </button>
            );
          })}
      </div>

      {/* Rodapé */}
      <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
        <p className="text-white/30 text-xs text-center">
          Coleta automática · 5 min
        </p>
      </div>
    </aside>
  );
}

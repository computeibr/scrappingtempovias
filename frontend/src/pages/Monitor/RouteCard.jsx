const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_CONFIG = {
  acima:        { border: 'border-red-200',    bg: 'bg-red-50',   badge: 'bg-red-100 text-red-700',       dot: 'bg-red-500',    label: 'Acima da média',   varCor: 'text-red-600'   },
  abaixo:       { border: 'border-green-200',  bg: 'bg-green-50', badge: 'bg-green-100 text-green-700',   dot: 'bg-green-500',  label: 'Abaixo da média',  varCor: 'text-green-600' },
  normal:       { border: 'border-gray-200',   bg: 'bg-white',    badge: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400',   label: 'Na média',         varCor: 'text-gray-500'  },
  sem_historico:{ border: 'border-gray-200',   bg: 'bg-white',    badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', label: 'Sem histórico',    varCor: 'text-gray-400'  },
  sem_dados:    { border: 'border-gray-200',   bg: 'bg-gray-50',  badge: 'bg-gray-100 text-gray-400',     dot: 'bg-gray-300',   label: 'Sem dados',        varCor: 'text-gray-400'  },
};

export default function RouteCard({ rota }) {
  const cfg = STATUS_CONFIG[rota.status] || STATUS_CONFIG.sem_dados;

  const leituraHora = rota.leituraAtual?.leitura
    ? new Date(rota.leituraAtual.leitura).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      })
    : null;

  const diaNome = DIAS[new Date().getDay()];

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} shadow-sm flex flex-col`}>

      {/* Header — nome completo sem truncamento */}
      <div className="px-4 pt-4 pb-3 border-b border-black/5">
        <div className="flex items-start gap-2">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${cfg.dot}`} />
          <div className="flex-1 min-w-0">
            {rota.url ? (
              <a
                href={rota.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-[#004A80] hover:underline leading-snug break-words"
                onClick={(e) => e.stopPropagation()}
              >
                {rota.nome}
              </a>
            ) : (
              <span className="text-sm font-semibold text-[#1D1D1B] leading-snug break-words">
                {rota.nome}
              </span>
            )}
          </div>
        </div>
        <div className="mt-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Main — tempo e variação */}
      <div className="px-4 py-4 flex-1">
        {rota.leituraAtual ? (
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-3xl font-bold text-[#004A80] leading-none">
                {rota.leituraAtual.tempo}
              </p>
              {rota.leituraAtual.km && (
                <p className="text-xs text-gray-400 mt-1.5">{rota.leituraAtual.km}</p>
              )}
            </div>
            {rota.variacao !== null && (
              <div className="text-right flex-shrink-0">
                <p className={`text-2xl font-bold leading-none ${cfg.varCor}`}>
                  {rota.variacao > 0 ? '+' : ''}{rota.variacao}%
                </p>
                <p className="text-xs text-gray-400 mt-1.5">
                  ref. {rota.mediaHistorica?.media} min
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Nenhuma leitura disponível</p>
        )}
      </div>

      {/* Footer — horário e contexto histórico */}
      <div className="px-4 pb-3 flex items-center justify-between text-xs text-gray-400 border-t border-black/5 pt-2.5">
        <span>{leituraHora ? `Às ${leituraHora}` : '—'}</span>
        {rota.mediaHistorica && (
          <span className="text-right">{rota.mediaHistorica.baseadoEm} leit. · {diaNome}s · 3 sem.</span>
        )}
      </div>

    </div>
  );
}

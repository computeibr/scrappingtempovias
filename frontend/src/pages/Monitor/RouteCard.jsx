import { DateTime } from 'luxon';

const STATUS_CONFIG = {
  acima:        { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',    dot: 'bg-red-500',    label: 'Acima da média' },
  abaixo:       { bg: 'bg-green-50',  border: 'border-green-200',  badge: 'bg-green-100 text-green-700',dot: 'bg-green-500',  label: 'Abaixo da média' },
  normal:       { bg: 'bg-white',     border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-600',  dot: 'bg-gray-400',   label: 'Na média' },
  sem_historico:{ bg: 'bg-white',     border: 'border-gray-200',   badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400', label: 'Sem histórico' },
  sem_dados:    { bg: 'bg-gray-50',   border: 'border-gray-200',   badge: 'bg-gray-100 text-gray-400',  dot: 'bg-gray-300',   label: 'Sem dados' },
};

export default function RouteCard({ rota }) {
  const cfg = STATUS_CONFIG[rota.status] || STATUS_CONFIG.sem_dados;

  const variacaoTexto = rota.variacao !== null
    ? `${rota.variacao > 0 ? '+' : ''}${rota.variacao}%`
    : '—';

  const leituraHora = rota.leituraAtual?.leitura
    ? DateTime.fromISO(rota.leituraAtual.leitura).setZone('America/Sao_Paulo').toFormat('HH:mm')
    : null;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex flex-col gap-3 shadow-sm`}>
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
          <span className="text-sm font-semibold text-[#1D1D1B] truncate">{rota.nome}</span>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* Tempo atual */}
      {rota.leituraAtual ? (
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold text-[#004A80] leading-none">
              {rota.leituraAtual.tempo}
            </p>
            {rota.leituraAtual.km && (
              <p className="text-xs text-gray-400 mt-1">{rota.leituraAtual.km}</p>
            )}
          </div>

          {/* Variação */}
          {rota.variacao !== null && (
            <div className="text-right">
              <p className={`text-lg font-bold leading-none ${
                rota.variacao > 5 ? 'text-red-600' : rota.variacao < -5 ? 'text-green-600' : 'text-gray-500'
              }`}>
                {variacaoTexto}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                vs. média {rota.mediaHistorica?.media} min
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400">Nenhuma leitura disponível</p>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between text-xs text-gray-400 border-t border-black/5 pt-2">
        {leituraHora ? (
          <span>Última leitura às {leituraHora}</span>
        ) : (
          <span>—</span>
        )}
        {rota.mediaHistorica && (
          <span>{rota.mediaHistorica.baseadoEm} leitura(s) na base</span>
        )}
      </div>
    </div>
  );
}

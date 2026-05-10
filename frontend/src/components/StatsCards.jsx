function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="card flex items-start gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: `${color}15` }}
      >
        <span style={{ color }} className="text-xl">{icon}</span>
      </div>
      <div>
        <p className="text-2xl font-bold text-navy-900">{value ?? '—'}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function StatsCards({ resumo, rotaSelecionada, historico }) {
  const horasComMedia = historico?.mediasPorHora?.filter((h) => h.media !== null) || [];
  const media = horasComMedia.length
    ? horasComMedia.reduce((acc, h) => acc + h.media, 0) / horasComMedia.length
    : null;

  // Comparação da hora atual vs. referência histórica (mesmo dia da semana, 3 semanas)
  const horaAtual = new Date().getHours();
  const dadosHoraAtual = historico?.mediasPorHora?.find((h) => h.hora === horaAtual);
  const mediaHoraAtual = dadosHoraAtual?.media ?? null;
  const mediaRef = dadosHoraAtual?.mediaReferencia ?? null;

  const variacao = mediaHoraAtual !== null && mediaRef !== null
    ? parseFloat((((mediaHoraAtual - mediaRef) / mediaRef) * 100).toFixed(1))
    : null;

  const horaPico = historico?.mediasPorHora?.reduce(
    (max, h) => (h.media > (max?.media || 0) ? h : max),
    null,
  );

  const diaNome = DIAS[new Date().getDay()];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Total de rotas"
        value={resumo?.totalRotas}
        sub="cadastradas no sistema"
        color="#004A80"
        icon="🗺️"
      />
      <StatCard
        label="Leituras hoje"
        value={resumo?.leiturasHoje?.toLocaleString('pt-BR')}
        sub="coletas realizadas"
        color="#00C0F3"
        icon="📡"
      />
      {rotaSelecionada ? (
        <>
          <StatCard
            label="Média geral"
            value={media ? `${media.toFixed(0)} min` : null}
            sub={`${historico?.totalRegistros || 0} leituras filtradas`}
            color="#34973B"
            icon="⏱️"
          />
          <StatCard
            label="Hora de pico"
            value={horaPico?.label || null}
            sub={horaPico ? `~${horaPico.media} min em média` : 'sem dados'}
            color="#E95F3E"
            icon="🚦"
          />
          {/* Card de referência — hora atual vs. 3 semanas, mesmo dia da semana */}
          {mediaRef !== null && mediaHoraAtual !== null && (
            <div className="col-span-2 lg:col-span-4">
              <div className="card overflow-hidden p-0">

                {/* Header — rota completa */}
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2 flex-wrap" style={{ background: '#F8FAFC' }}>
                  <span className="text-xs font-semibold uppercase tracking-wider flex-shrink-0" style={{ color: '#004A80' }}>
                    Análise {String(horaAtual).padStart(2,'0')}h
                  </span>
                  <span className="text-gray-300 flex-shrink-0">·</span>
                  {rotaSelecionada?.url ? (
                    <a
                      href={rotaSelecionada.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold hover:underline"
                      style={{ color: '#13335A' }}
                    >
                      {rotaSelecionada.name}
                    </a>
                  ) : (
                    <span className="text-sm font-semibold text-gray-700">{rotaSelecionada?.name}</span>
                  )}
                </div>

                {/* Main — métricas lado a lado */}
                <div className="grid grid-cols-2 divide-x divide-gray-100">
                  <div className="px-5 py-4">
                    <p className="text-xs text-gray-400 mb-1">Média agora</p>
                    <p className="text-3xl font-bold leading-none" style={{ color: '#004A80' }}>
                      {mediaHoraAtual.toFixed(0)} min
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs text-gray-400 mb-1">Variação vs. referência</p>
                    <p
                      className="text-3xl font-bold leading-none"
                      style={{ color: variacao > 5 ? '#E51B23' : variacao < -5 ? '#34973B' : '#92400E' }}
                    >
                      {variacao > 0 ? '+' : ''}{variacao}%
                    </p>
                    <p className="text-xs mt-1.5" style={{ color: variacao > 5 ? '#E51B23' : variacao < -5 ? '#34973B' : '#92400E' }}>
                      {variacao > 5 ? 'Acima do esperado' : variacao < -5 ? 'Melhor que o esperado' : 'Dentro do padrão'}
                    </p>
                  </div>
                </div>

                {/* Footer — contexto histórico */}
                <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400" style={{ background: '#F8FAFC' }}>
                  <span>📊</span>
                  <span>Referência histórica: <strong className="text-gray-600">{mediaRef.toFixed(0)} min</strong></span>
                  <span>·</span>
                  <span>{diaNome}s úteis · últimas 3 semanas</span>
                </div>

              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <StatCard
            label="Total de leituras"
            value={resumo?.totalLeituras?.toLocaleString('pt-BR')}
            sub="histórico completo"
            color="#34973B"
            icon="📊"
          />
          <StatCard
            label="Última semana"
            value={resumo?.leiturasSemana?.toLocaleString('pt-BR')}
            sub="leituras nos últimos 7 dias"
            color="#F9C600"
            icon="📅"
          />
        </>
      )}
    </div>
  );
}

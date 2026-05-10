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
              <div className="card flex items-center gap-6 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-40">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#00C0F315' }}>
                    <span className="text-xl">🕐</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-navy-900">{mediaHoraAtual.toFixed(0)} min</p>
                    <p className="text-sm font-medium text-gray-600">Média atual ({String(horaAtual).padStart(2,'0')}h)</p>
                    <p className="text-xs text-gray-400 mt-0.5">ref. histórica: {mediaRef.toFixed(0)} min · {diaNome}s · 3 sem.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 flex-1 min-w-40">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: variacao > 5 ? '#E51B2315' : variacao < -5 ? '#34973B15' : '#F9C60015' }}
                  >
                    <span className="text-xl">
                      {variacao > 5 ? '🔴' : variacao < -5 ? '🟢' : '🟡'}
                    </span>
                  </div>
                  <div>
                    <p
                      className="text-2xl font-bold"
                      style={{ color: variacao > 5 ? '#E51B23' : variacao < -5 ? '#34973B' : '#92400E' }}
                    >
                      {variacao > 0 ? '+' : ''}{variacao}%
                    </p>
                    <p className="text-sm font-medium text-gray-600">Variação vs. referência</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {variacao > 5 ? 'Acima do esperado para este horário' : variacao < -5 ? 'Melhor que o esperado para este horário' : 'Dentro do padrão histórico'}
                    </p>
                  </div>
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

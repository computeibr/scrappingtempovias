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

export default function StatsCards({ resumo, rotaSelecionada, historico }) {
  const media =
    historico?.mediasPorHora
      ?.filter((h) => h.media !== null)
      .reduce((acc, h) => acc + h.media, 0) /
      (historico?.mediasPorHora?.filter((h) => h.media !== null).length || 1) || null;

  const horaPico = historico?.mediasPorHora?.reduce(
    (max, h) => (h.media > (max?.media || 0) ? h : max),
    null,
  );

  const horaLivre = historico?.mediasPorHora
    ?.filter((h) => h.media !== null)
    .reduce((min, h) => (h.media < (min?.media || Infinity) ? h : min), null);

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

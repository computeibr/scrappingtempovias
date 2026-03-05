import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const media = payload.find((p) => p.dataKey === 'media')?.value;
  const min = payload.find((p) => p.dataKey === 'min')?.value;
  const max = payload.find((p) => p.dataKey === 'max')?.value;
  const leituras = payload.find((p) => p.dataKey === 'leituras')?.value;

  return (
    <div className="bg-navy-900 text-white rounded-lg shadow-xl px-4 py-3 text-sm border border-white/10">
      <p className="font-bold text-sky mb-2">{label}</p>
      {media !== null && media !== undefined && (
        <p className="text-white">
          Média: <span className="font-semibold">{media} min</span>
        </p>
      )}
      {min !== null && min !== undefined && (
        <p className="text-brand-green text-xs mt-0.5">Mínimo: {min} min</p>
      )}
      {max !== null && max !== undefined && (
        <p className="text-brand-orange text-xs mt-0.5">Máximo: {max} min</p>
      )}
      {leituras !== undefined && (
        <p className="text-white/40 text-xs mt-1">{leituras} leituras</p>
      )}
    </div>
  );
};

export default function TimeChart({ historico, rotaName, loading }) {
  if (loading) {
    return (
      <div className="card h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-navy/30 border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  if (!historico) {
    return (
      <div className="card h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl mb-2">📈</div>
          <p className="text-gray-400 text-sm">Selecione uma rota para ver a variação de tempo</p>
        </div>
      </div>
    );
  }

  const dados = historico.mediasPorHora || [];
  const semDados = dados.every((d) => d.media === null);

  if (semDados) {
    return (
      <div className="card h-64 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Sem dados para o período selecionado.</p>
      </div>
    );
  }

  // Hora de pico e mais livre
  const comDados = dados.filter((d) => d.media !== null);
  const pico = comDados.reduce((max, h) => (h.media > (max?.media || 0) ? h : max), null);
  const livre = comDados.reduce(
    (min, h) => (h.media < (min?.media || Infinity) ? h : min),
    null,
  );

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-semibold text-navy-900 text-sm">
            Variação de tempo por hora do dia
          </h3>
          {rotaName && (
            <p className="text-xs text-gray-400 mt-0.5">{rotaName}</p>
          )}
        </div>

        <div className="flex gap-3 text-xs">
          {pico && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-brand-orange" />
              <span className="text-gray-500">
                Pico: <span className="font-semibold text-gray-700">{pico.label} ({pico.media} min)</span>
              </span>
            </div>
          )}
          {livre && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-brand-green" />
              <span className="text-gray-500">
                Mais livre: <span className="font-semibold text-gray-700">{livre.label} ({livre.media} min)</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={dados} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}m`}
            width={38}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Banda min–max */}
          <Area
            type="monotone"
            dataKey="max"
            stroke="none"
            fill="#E95F3E"
            fillOpacity={0.08}
            legendType="none"
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="min"
            stroke="none"
            fill="#F0F0F0"
            fillOpacity={1}
            legendType="none"
            connectNulls
          />

          {/* Linha de média */}
          <Line
            type="monotone"
            dataKey="media"
            stroke="#004A80"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#004A80', stroke: '#fff', strokeWidth: 2 }}
            name="Média (min)"
            connectNulls
          />

          {/* Linhas de pico e hora livre */}
          {pico && (
            <ReferenceLine
              x={pico.label}
              stroke="#E95F3E"
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
          )}
          {livre && (
            <ReferenceLine
              x={livre.label}
              stroke="#34973B"
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
          )}

          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            formatter={(value) => <span className="text-gray-500">{value}</span>}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-xs text-gray-400 mt-2 text-right">
        {historico.totalRegistros} leituras no período · Fuso: America/Sao_Paulo
      </p>
    </div>
  );
}

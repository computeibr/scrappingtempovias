import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ptBR } from 'date-fns/locale';

const DIAS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sab' },
];

export default function FilterPanel({ filters, onChange }) {
  const { dataInicio, dataFim, diasSemana } = filters;

  function toggleDia(val) {
    const novos = diasSemana.includes(val)
      ? diasSemana.filter((d) => d !== val)
      : [...diasSemana, val];
    onChange({ ...filters, diasSemana: novos });
  }

  function limpar() {
    onChange({
      dataInicio: null,
      dataFim: null,
      diasSemana: [],
    });
  }

  return (
    <div className="card flex flex-wrap gap-4 items-end">
      {/* Período */}
      <div className="flex gap-2 items-end">
        <div>
          <label className="label">De</label>
          <DatePicker
            selected={dataInicio}
            onChange={(d) => onChange({ ...filters, dataInicio: d })}
            selectsStart
            startDate={dataInicio}
            endDate={dataFim}
            maxDate={new Date()}
            dateFormat="dd/MM/yyyy"
            placeholderText="Início"
            locale={ptBR}
            className="input w-36"
          />
        </div>
        <div>
          <label className="label">Até</label>
          <DatePicker
            selected={dataFim}
            onChange={(d) => onChange({ ...filters, dataFim: d })}
            selectsEnd
            startDate={dataInicio}
            endDate={dataFim}
            minDate={dataInicio}
            maxDate={new Date()}
            dateFormat="dd/MM/yyyy"
            placeholderText="Fim"
            locale={ptBR}
            className="input w-36"
          />
        </div>
      </div>

      {/* Dias da semana */}
      <div>
        <label className="label">Dias da semana</label>
        <div className="flex gap-1">
          {DIAS.map((d) => (
            <button
              key={d.value}
              onClick={() => toggleDia(d.value)}
              className={`px-2 py-1 rounded text-xs font-semibold border transition-colors ${
                diasSemana.includes(d.value)
                  ? 'bg-navy text-white border-navy'
                  : 'bg-white text-gray-500 border-gray-300 hover:border-navy hover:text-navy'
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Limpar */}
      <button
        onClick={limpar}
        className="text-xs text-gray-400 hover:text-navy underline underline-offset-2 pb-1.5"
      >
        Limpar filtros
      </button>
    </div>
  );
}

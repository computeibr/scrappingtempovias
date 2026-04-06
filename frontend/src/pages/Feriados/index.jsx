import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../services/api';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../contexts/AuthContext';

const TIPOS = [
  { value: 'feriado_nacional',   label: 'Feriado Nacional' },
  { value: 'feriado_municipal',  label: 'Feriado Municipal' },
  { value: 'ponto_facultativo',  label: 'Ponto Facultativo' },
];

const TIPO_BADGE = {
  feriado_nacional:  'bg-red-100 text-red-700',
  feriado_municipal: 'bg-blue-100 text-blue-700',
  ponto_facultativo: 'bg-yellow-100 text-yellow-700',
};

export default function Feriados() {
  const { user } = useAuth();
  const isAdmin = user?.perfilId === 99;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [feriados, setFeriados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [form, setForm] = useState({ data: '', descricao: '', tipo: 'ponto_facultativo' });

  async function fetchFeriados() {
    try {
      const { data } = await api.get('/api/feriados');
      setFeriados(data.feriados);
    } catch {
      setErro('Erro ao carregar dias não úteis.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchFeriados(); }, []);

  async function handleSalvar(e) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await api.post('/api/feriados', form);
      setForm({ data: '', descricao: '', tipo: 'ponto_facultativo' });
      await fetchFeriados();
    } catch (err) {
      setErro(err.response?.data?.mensagem || 'Erro ao salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemover(id) {
    if (!window.confirm('Remover este dia não útil?')) return;
    try {
      await api.delete(`/api/feriados/${id}`);
      setFeriados((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setErro('Erro ao remover.');
    }
  }

  const formatarData = (iso) => {
    // Adiciona horário meio-dia para evitar variação de fuso ao parsear YYYY-MM-DD
    const d = new Date(iso + 'T12:00:00');
    return format(d, "dd/MM/yyyy (EEEE)", { locale: ptBR });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F0F0F0' }}>
      <Navbar sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((v) => !v)} />

      <div className="flex-1 p-4 max-w-3xl mx-auto w-full">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#004A80]">Dias Não Úteis</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Feriados e pontos facultativos excluídos do cálculo de médias
            </p>
          </div>
          <Link
            to="/monitor"
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-[#004A80] hover:text-[#004A80] transition-colors"
          >
            ← Monitor
          </Link>
        </div>

        {/* Formulário — somente admin */}
        {isAdmin && (
          <form onSubmit={handleSalvar} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 shadow-sm">
            <h2 className="text-sm font-semibold text-[#004A80] mb-3">Cadastrar dia não útil</h2>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={form.data}
                  onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#004A80]"
                />
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Dia do Servidor Público"
                  value={form.descricao}
                  onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#004A80]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-[#004A80] bg-white"
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={salvando}
                className="text-sm px-4 py-1.5 rounded-lg bg-[#004A80] text-white hover:bg-[#13335A] disabled:opacity-50 transition-colors"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
            {erro && <p className="text-xs text-red-600 mt-2">{erro}</p>}
          </form>
        )}

        {/* Lista */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-4 border-[#004A80]/20 border-t-[#004A80] rounded-full animate-spin" />
            </div>
          ) : feriados.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">
              Nenhum dia não útil cadastrado.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 font-semibold">Data</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Descrição</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Tipo</th>
                  {isAdmin && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody>
                {feriados.map((f) => (
                  <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                      {formatarData(f.data)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{f.descricao}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_BADGE[f.tipo] || 'bg-gray-100 text-gray-500'}`}>
                        {TIPOS.find((t) => t.value === f.tipo)?.label || f.tipo}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => handleRemover(f.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

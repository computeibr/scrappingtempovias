import { useState, useEffect } from 'react';
import AppShell from '../../components/AppShell';

// ─── Conteúdo da biblioteca embutido no frontend ─────────────────────────────
// Fonte de verdade: /biblioteca/*.md no repositório
// Atualizar aqui sempre que os arquivos .md forem alterados

const SECOES = [
  {
    id: 'calculo-variacao',
    titulo: 'Cálculo de Variação do Tempo de Percurso',
    icone: '📊',
    resumo: 'Como o sistema calcula se o trânsito está acima ou abaixo da média histórica.',
    blocos: [
      {
        tipo: 'texto',
        conteudo: 'Para cada rota monitorada, o sistema exibe dois números: o tempo atual de percurso (extraído do Google Maps na última coleta) e a variação percentual em relação à média histórica do mesmo contexto.',
      },
      {
        tipo: 'formula',
        titulo: 'Fórmula de variação',
        conteudo: 'variação (%) = ((tempo_atual − média_histórica) / média_histórica) × 100',
        descricao: 'Se o resultado for +15%, o trânsito está 15% pior que o habitual nesse horário. Se for −10%, está 10% melhor.',
      },
      {
        tipo: 'destaque',
        titulo: 'Por que comparar com o mesmo horário e dia da semana?',
        conteudo: 'Comparar o trânsito de uma sexta às 18h com uma média geral de todos os horários seria incorreto — o horário de pico é estruturalmente diferente da madrugada ou do sábado. O sistema filtra o histórico pela mesma hora do dia e pelo mesmo dia da semana.',
      },
      {
        tipo: 'destaque',
        titulo: 'Por que 3 semanas de histórico?',
        conteudo: '3 semanas garantem pelo menos 3 amostras do mesmo dia da semana e horário — suficiente para uma média representativa. Usar um período muito longo incorporaria variações sazonais (verão vs inverno, obras, períodos de festas) que distorceriam a referência.',
      },
      {
        tipo: 'tabela',
        titulo: 'Classificação de status',
        cabecalho: ['Status', 'Condição', 'Cor'],
        linhas: [
          ['Acima da média', 'Variação > +5%', 'Vermelho'],
          ['Na média', 'Variação entre −5% e +5%', 'Cinza'],
          ['Abaixo da média', 'Variação < −5%', 'Verde'],
          ['Sem histórico', 'Nenhuma leitura válida no período', 'Amarelo'],
          ['Sem dados', 'Nenhuma leitura registrada', 'Cinza claro'],
        ],
      },
      {
        tipo: 'exemplo',
        titulo: 'Exemplo prático',
        linhas: [
          'Rota: Centro → Barra',
          'Hora atual: 08h15 de uma quarta-feira',
          'Tempo atual: 45 min',
          'Histórico das últimas 3 quartas-feiras às 08h: 35, 38 e 37 min',
          'Média histórica: 36,7 min',
          'Variação: ((45 − 36,7) / 36,7) × 100 = +22,6% → Acima da média',
        ],
      },
    ],
  },
  {
    id: 'coleta-dados',
    titulo: 'Coleta de Dados',
    icone: '🔄',
    resumo: 'Como e quando os dados de tempo de percurso são coletados do Google Maps.',
    blocos: [
      {
        tipo: 'texto',
        conteudo: 'O sistema utiliza Puppeteer — uma biblioteca Node.js que controla um navegador Chrome em modo headless — para acessar o Google Maps e extrair o tempo estimado de percurso considerando o tráfego em tempo real.',
      },
      {
        tipo: 'passos',
        titulo: 'Processo de coleta',
        itens: [
          'O servidor abre o Google Maps com a URL da rota (contendo os pontos definidos pela CETRIO)',
          'O Google Maps calcula o tempo estimado considerando o tráfego em tempo real',
          'O sistema extrai o tempo (ex: "23 min", "1 h 10 min") e a distância (ex: "7,4 km")',
          'Os dados são salvos no banco PostgreSQL com o timestamp exato da leitura',
        ],
      },
      {
        tipo: 'destaque',
        titulo: 'Frequência de coleta',
        conteudo: 'A coleta ocorre a cada 5 minutos via node-cron. O sistema também executa uma coleta imediata no momento em que o servidor é iniciado — sem esperar o primeiro ciclo — garantindo dados frescos logo após um reinício.',
      },
      {
        tipo: 'destaque',
        titulo: 'Controle de execução paralela',
        conteudo: 'Uma flag isRunning impede que um novo ciclo inicie antes do anterior terminar. Isso protege contra situações em que a coleta de todas as rotas demorar mais de 5 minutos por lentidão de rede.',
      },
      {
        tipo: 'destaque',
        titulo: 'Tratamento de falhas',
        conteudo: 'Cada rota tem até 2 tentativas em caso de falha (timeout, erro de rede). Se ambas falharem, a rota é ignorada no ciclo atual e a coleta continua para as demais. O erro é registrado no log.',
      },
    ],
  },
  {
    id: 'dias-nao-uteis',
    titulo: 'Dias Não Úteis e Feriados',
    icone: '📅',
    resumo: 'Por que feriados e pontos facultativos são excluídos do cálculo de médias.',
    blocos: [
      {
        tipo: 'destaque',
        titulo: 'Por que excluir feriados?',
        conteudo: 'O comportamento do trânsito em feriados é estruturalmente diferente: volume menor, padrão de horários de pico alterado, muitos estabelecimentos fechados. Incluir esses dias na média puxaria a referência para baixo, gerando falsos alertas de "acima da média" em dias úteis normais.',
      },
      {
        tipo: 'exemplo',
        titulo: 'Exemplo do problema que a exclusão evita',
        linhas: [
          'Sexta com ponto facultativo: 20 min (trânsito livre)',
          'Sextas normais: média de 40 min',
          'Se incluído: média ficaria ~33 min',
          'Resultado: uma sexta com 35 min pareceria "acima da média" — quando está completamente normal',
        ],
      },
      {
        tipo: 'tabela',
        titulo: 'Tipos de dia não útil',
        cabecalho: ['Tipo', 'Exemplos'],
        linhas: [
          ['Feriado Nacional', 'Tiradentes, Natal, Independência, Trabalho'],
          ['Feriado Municipal', 'São Sebastião (20/01), Carnaval (segunda e terça)'],
          ['Ponto Facultativo', 'Decretados pelo prefeito com antecedência variável'],
        ],
      },
      {
        tipo: 'destaque',
        titulo: 'Como adicionar um dia não previsto',
        conteudo: 'Administradores podem acessar a página "Dias Não Úteis" e cadastrar qualquer data com descrição e tipo. Isso é especialmente útil para pontos facultativos decretados com pouca antecedência.',
      },
    ],
  },
  {
    id: 'redundancia',
    titulo: 'Redundância e Disponibilidade',
    icone: '🛡️',
    resumo: 'O que acontece quando o servidor cai e como o sistema se recupera.',
    blocos: [
      {
        tipo: 'destaque',
        titulo: 'O que acontece se o servidor cair?',
        conteudo: 'Se o servidor local (onde roda o scraping) ficar indisponível, os dados simplesmente não são coletados nesse intervalo. Não há coleta retroativa — o Google Maps só fornece o tempo de tráfego em tempo real, não o histórico.',
      },
      {
        tipo: 'destaque',
        titulo: 'Impacto nas médias',
        conteudo: 'Lacunas nos dados reduzem o número de amostras disponíveis para o cálculo de média. O sistema trabalha com o que existe e exibe "Sem histórico" apenas quando não há dados suficientes — nunca força um percentual baseado em amostra insuficiente.',
      },
      {
        tipo: 'tabela',
        titulo: 'Cenários de falha e impacto',
        cabecalho: ['Cenário', 'Impacto na coleta', 'Impacto no acesso ao sistema'],
        linhas: [
          ['Máquina local desliga', 'Coleta interrompida', 'Nenhum — VPS continua funcionando'],
          ['VPS indisponível', 'Falha ao salvar (banco offline)', 'Sistema inacessível temporariamente'],
          ['Internet local cai', 'Puppeteer não acessa o Google Maps', 'Nenhum — VPS continua funcionando'],
          ['Banco PostgreSQL cai', 'Falha ao salvar dados', 'Sistema inacessível temporariamente'],
        ],
      },
      {
        tipo: 'destaque',
        titulo: 'Reinício automático',
        conteudo: 'Na máquina local (Windows), o PM2 com pm2-windows-startup reinicia o sistema automaticamente após quedas de energia ou reboots. O tempo de indisponibilidade típico é de 2 a 5 minutos.',
      },
    ],
  },
  {
    id: 'rotas-visibilidade',
    titulo: 'Rotas, Permissões e Compartilhamento',
    icone: '🔐',
    resumo: 'Quem pode ver, editar e compartilhar cada rota — e como funciona o controle de acesso por e-mail.',
    blocos: [
      {
        tipo: 'texto',
        conteudo: 'Cada rota cadastrada no sistema pertence ao usuário que a criou. Isso garante que cada equipe ou responsável visualize e gerencie apenas as rotas de sua competência, sem poluição visual causada por rotas de outras áreas.',
      },
      {
        tipo: 'tabela',
        titulo: 'Resumo de permissões por perfil',
        cabecalho: ['Perfil', 'Ver rotas', 'Criar', 'Editar / Remover', 'Compartilhar'],
        linhas: [
          ['View (1)', 'Suas + compartilhadas + legadas', '—', '—', '—'],
          ['User (2)', 'Suas + compartilhadas + legadas', 'Sim', 'Apenas as suas', 'Sim (das suas)'],
          ['Admin (99)', 'Todas', 'Sim', 'Todas', 'Todas'],
        ],
      },
      {
        tipo: 'destaque',
        titulo: 'Criador da rota',
        conteudo: 'Ao cadastrar uma rota, o sistema vincula automaticamente o usuário autenticado como criador (campo creatorId). Somente o criador — ou um Administrador — pode editar ou remover a rota.',
      },
      {
        tipo: 'destaque',
        titulo: 'Compartilhamento por e-mail',
        conteudo: 'O criador pode compartilhar qualquer uma das suas rotas com outros usuários informando o endereço de e-mail deles. O acesso concedido é somente leitura: o usuário vê a rota no Dashboard e no Monitor, mas não pode editá-la nem removê-la.',
      },
      {
        tipo: 'passos',
        titulo: 'Como compartilhar uma rota',
        itens: [
          'Acesse "Gerenciar Rotas" no menu lateral',
          'Localize a rota desejada na lista',
          'Clique no botão "Compartilhar" ao lado da rota',
          'Digite o e-mail do usuário no campo que aparece abaixo da rota',
          'Clique em "Adicionar" — o compartilhamento é imediato',
          'Para revogar, clique em "remover" ao lado do e-mail na lista de compartilhamentos',
        ],
      },
      {
        tipo: 'destaque',
        titulo: 'Rotas legadas (sem criador)',
        conteudo: 'Rotas cadastradas antes da implementação do sistema de autoria ficam com creatorId nulo e são visíveis a todos os usuários. Administradores podem acessar a página "Ajustes" para assumir a autoria dessas rotas individualmente ou em lote, transferindo-as para seu perfil.',
      },
      {
        tipo: 'destaque',
        titulo: 'Categorias de rota',
        conteudo: 'Cada rota pode receber uma categoria (campo de texto livre, ex: "Zona Sul", "Corredor Av. Brasil"). No Dashboard e no Monitor, chips de filtro aparecem automaticamente quando há categorias cadastradas, permitindo filtrar a visualização por grupo sem precisar rolar toda a lista.',
      },
      {
        tipo: 'faq',
        itens: [
          {
            pergunta: 'Se eu compartilhar uma rota, o outro usuário pode editar os dados dela?',
            resposta: 'Não. O compartilhamento concede apenas leitura. O usuário que recebeu o compartilhamento vê a rota no Dashboard e no Monitor, mas os botões de editar, remover e compartilhar não aparecem para ele. Qualquer tentativa via API também é bloqueada no backend.',
          },
          {
            pergunta: 'Posso compartilhar com alguém que ainda não tem conta no sistema?',
            resposta: 'Sim. O compartilhamento é registrado pelo e-mail. Quando o usuário criar a conta com esse mesmo e-mail, a rota já aparecerá para ele automaticamente.',
          },
          {
            pergunta: 'Um Administrador pode ver e editar todas as rotas mesmo sem ser o criador?',
            resposta: 'Sim. O perfil Administrador (perfilId = 99) tem acesso total — vê, edita, remove e compartilha qualquer rota, independente de quem a criou.',
          },
          {
            pergunta: 'O que acontece com as rotas legadas que ninguém assumiu?',
            resposta: 'Elas continuam visíveis a todos os usuários e continuam sendo monitoradas pelo ETL normalmente. A diferença é que qualquer usuário pode vê-las, mas apenas um Administrador pode editá-las ou removê-las, já que não há criador definido.',
          },
          {
            pergunta: 'As categorias têm algum efeito na coleta de dados?',
            resposta: 'Não. A coleta automática de dados (ETL) usa todas as rotas independentemente de categoria ou criador. A categoria é exclusivamente um recurso de organização visual no Dashboard e no Monitor.',
          },
        ],
      },
    ],
  },
  {
    id: 'perguntas-frequentes',
    titulo: 'Perguntas Frequentes',
    icone: '❓',
    resumo: 'Respostas diretas para as dúvidas mais comuns sobre o sistema.',
    blocos: [
      {
        tipo: 'faq',
        itens: [
          {
            pergunta: 'Você considera a média do momento da leitura e compara com a média da hora da leitura?',
            resposta: 'Sim. A comparação é feita com leituras anteriores do mesmo horário (mesma hora cheia) e do mesmo dia da semana. Comparar o trânsito de uma sexta às 18h com uma média geral de todos os horários seria incorreto.',
          },
          {
            pergunta: 'Como você sabe que está acima ou abaixo da média?',
            resposta: 'O sistema calcula: variação = ((tempo_atual − média_histórica) / média_histórica) × 100. Acima de +5% é considerado "acima da média". Abaixo de −5% é "abaixo da média". A faixa de ±5% evita falsos alertas por pequenas variações naturais.',
          },
          {
            pergunta: 'Você tem redundância caso o servidor caia e não tenha dados em um determinado período?',
            resposta: 'Não há coleta retroativa. Se o servidor ficar offline, as leituras desse período não existem no banco. O impacto no cálculo é pequeno: algumas amostras a menos no histórico de 3 semanas. O PM2 minimiza o tempo de indisponibilidade com reinício automático.',
          },
          {
            pergunta: 'O que acontece se não houver histórico para uma rota?',
            resposta: 'O card exibe status "Sem histórico" em amarelo. O sistema nunca exibe um percentual baseado em amostra insuficiente.',
          },
          {
            pergunta: 'Os dados são em tempo real?',
            resposta: 'Sim. O Google Maps já considera o tráfego atual ao estimar o tempo. O sistema captura esse dado a cada 5 minutos, então a defasagem máxima em condições normais é de 5 minutos.',
          },
          {
            pergunta: 'O sistema considera obras ou eventos especiais?',
            resposta: 'Não automaticamente. O sistema registra o que o Google Maps informa — se houver acidente ou obra, o Google Maps já incorpora esse dado no tempo estimado. O sistema não classifica o motivo da variação.',
          },
          {
            pergunta: 'Por que a janela histórica é de 3 semanas e não de 30 dias?',
            resposta: 'O filtro por dia da semana já restringe bastante o conjunto. Em 3 semanas, o mesmo dia da semana aparece 3 vezes — suficiente para uma média representativa sem incorporar variações sazonais de períodos mais longos.',
          },
        ],
      },
    ],
  },
];

// ─── Componentes de renderização de blocos ───────────────────────────────────

function BlocoTexto({ bloco }) {
  return <p className="text-sm text-gray-600 leading-relaxed">{bloco.conteudo}</p>;
}

function BlocoFormula({ bloco }) {
  return (
    <div className="rounded-lg bg-[#004A80]/5 border border-[#004A80]/20 p-4">
      {bloco.titulo && <p className="text-xs font-semibold text-[#004A80] uppercase tracking-wide mb-2">{bloco.titulo}</p>}
      <code className="text-sm font-mono text-[#004A80] font-semibold">{bloco.conteudo}</code>
      {bloco.descricao && <p className="text-xs text-gray-500 mt-2">{bloco.descricao}</p>}
    </div>
  );
}

function BlocoDestaque({ bloco }) {
  return (
    <div className="rounded-lg bg-gray-50 border-l-4 border-[#00C0F3] p-4">
      {bloco.titulo && <p className="text-sm font-semibold text-[#1D1D1B] mb-1">{bloco.titulo}</p>}
      <p className="text-sm text-gray-600 leading-relaxed">{bloco.conteudo}</p>
    </div>
  );
}

function BlocoTabela({ bloco }) {
  return (
    <div>
      {bloco.titulo && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{bloco.titulo}</p>}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {bloco.cabecalho.map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bloco.linhas.map((linha, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                {linha.map((cel, j) => (
                  <td key={j} className="px-4 py-2.5 text-gray-700 text-sm">{cel}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BlocoExemplo({ bloco }) {
  return (
    <div className="rounded-lg bg-[#004A80]/5 border border-[#004A80]/10 p-4">
      {bloco.titulo && <p className="text-xs font-semibold text-[#004A80] uppercase tracking-wide mb-3">{bloco.titulo}</p>}
      <ul className="space-y-1">
        {bloco.linhas.map((linha, i) => (
          <li key={i} className={`text-sm flex items-start gap-2 ${i === bloco.linhas.length - 1 ? 'font-semibold text-[#004A80] mt-2 pt-2 border-t border-[#004A80]/10' : 'text-gray-600'}`}>
            {i < bloco.linhas.length - 1 && <span className="text-gray-300 flex-shrink-0 mt-0.5">·</span>}
            {i === bloco.linhas.length - 1 && <span className="text-[#00C0F3] flex-shrink-0 mt-0.5">→</span>}
            {linha}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BlocoPassos({ bloco }) {
  return (
    <div>
      {bloco.titulo && <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">{bloco.titulo}</p>}
      <ol className="space-y-2">
        {bloco.itens.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#004A80] text-white text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="text-sm text-gray-600 leading-relaxed">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function BlocoFaq({ bloco }) {
  const [abertos, setAbertos] = useState({});
  const toggle = (i) => setAbertos((prev) => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="space-y-2">
      {bloco.itens.map((item, i) => (
        <div key={i} className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(i)}
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-[#1D1D1B] pr-4">{item.pergunta}</span>
            <span className={`text-gray-400 flex-shrink-0 transition-transform duration-200 ${abertos[i] ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
          {abertos[i] && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <p className="text-sm text-gray-600 leading-relaxed">{item.resposta}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function renderBloco(bloco, i) {
  const map = {
    texto:    BlocoTexto,
    formula:  BlocoFormula,
    destaque: BlocoDestaque,
    tabela:   BlocoTabela,
    exemplo:  BlocoExemplo,
    passos:   BlocoPassos,
    faq:      BlocoFaq,
  };
  const Comp = map[bloco.tipo];
  return Comp ? <Comp key={i} bloco={bloco} /> : null;
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Metodologia() {
  const [expandirTodos, setExpandirTodos] = useState(false);

  return (
    <AppShell>
      <div className="flex-1 overflow-y-auto p-4 max-w-3xl mx-auto w-full">

        {/* Cabeçalho */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#004A80]">Metodologia</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Como o sistema coleta dados, calcula médias e classifica o trânsito
            </p>
          </div>
          <button
            onClick={() => setExpandirTodos((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-[#004A80] hover:text-[#004A80] transition-colors"
          >
            {expandirTodos ? 'Recolher tudo' : 'Expandir tudo'}
          </button>
        </div>

        {/* Aviso sobre a fonte */}
        <div className="bg-[#00C0F3]/10 border border-[#00C0F3]/30 rounded-xl p-4 mb-4 flex items-start gap-3">
          <span className="text-[#004A80] flex-shrink-0 mt-0.5">ℹ</span>
          <p className="text-xs text-[#004A80] leading-relaxed">
            Esta página documenta as decisões metodológicas do sistema Tempovias. Os arquivos fonte estão em{' '}
            <code className="font-mono bg-[#004A80]/10 px-1 rounded">biblioteca/</code> no repositório
            e podem ser editados a qualquer momento pela equipe técnica.
          </p>
        </div>

        {/* Seções */}
        <div className="space-y-3" key={expandirTodos}>
          {SECOES.map((secao) => (
            <SecaoControlada key={secao.id} secao={secao} forceOpen={expandirTodos} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

// Wrapper que respeita o estado forceOpen
function SecaoControlada({ secao, forceOpen }) {
  const [aberta, setAberta] = useState(forceOpen);

  useEffect(() => { setAberta(forceOpen); }, [forceOpen]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setAberta((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-2xl flex-shrink-0">{secao.icone}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#004A80] text-sm">{secao.titulo}</p>
          <p className="text-xs text-gray-400 mt-0.5">{secao.resumo}</p>
        </div>
        <span className={`text-gray-400 flex-shrink-0 text-lg transition-transform duration-200 ${aberta ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>

      {aberta && (
        <div className="px-5 pb-5 border-t border-gray-100 space-y-4 pt-4">
          {secao.blocos.map((bloco, i) => renderBloco(bloco, i))}
        </div>
      )}
    </div>
  );
}

# Metodologia: Dias Não Úteis

## Por que excluir feriados e pontos facultativos?

O comportamento do trânsito em feriados e pontos facultativos é **estruturalmente diferente** de dias úteis normais. Nesses dias:

- O volume de veículos é significativamente menor
- O padrão de horários de pico muda ou some
- Muitos estabelecimentos comerciais e órgãos públicos estão fechados

Se esses dias fossem incluídos na média histórica, a referência ficaria artificialmente "melhor" do que o dia útil típico — levando a falsos alertas de tráfego acima da média em dias normais.

**Exemplo:** Se uma sexta-feira com ponto facultativo tiver 20 minutos de percurso (trânsito livre) e as sextas normais tiverem 40 minutos, incluir esse dado puxaria a média para baixo e faria parecer que qualquer sexta com 35 minutos está "acima da média", quando na verdade está completamente normal.

---

## Como funciona a exclusão

O sistema mantém uma tabela `dias_nao_uteis` no banco de dados com as seguintes informações por entrada:

| Campo | Descrição |
|---|---|
| `data` | A data específica (ex: 2026-11-20) |
| `descricao` | Nome do feriado ou evento |
| `tipo` | `feriado_nacional`, `feriado_municipal` ou `ponto_facultativo` |

Ao calcular a média histórica, o sistema verifica se a data de cada leitura histórica está nessa tabela. Se estiver, a leitura é excluída do cálculo.

---

## Dias pré-cadastrados

O sistema vem com os feriados nacionais e municipais do Rio de Janeiro de 2025 e 2026 pré-cadastrados, incluindo:

- Feriados nacionais: Confraternização, Tiradentes, Trabalho, Independência, Aparecida, Finados, Proclamação da República, Consciência Negra, Natal
- Feriados municipais: São Sebastião (20/01), Carnaval (segunda e terça)
- Corpus Christi

---

## Como adicionar ou editar um dia não útil

Usuários administradores (perfil 99) podem acessar a página **Dias Não Úteis** no sistema e:

- **Adicionar** uma data específica com descrição e tipo
- **Remover** uma data cadastrada

Isso é especialmente útil para **pontos facultativos decretados com pouca antecedência** — como mudanças no calendário do servidor público municipal — que não estão na lista pré-cadastrada.

---

## Exemplo de uso

> O prefeito decreta ponto facultativo em 31/10 (véspera de Finados).  
> O administrador acessa a página "Dias Não Úteis", adiciona a data 2026-10-30 com descrição "Ponto Facultativo — véspera de Finados" e tipo "Ponto Facultativo".  
> A partir desse momento, as leituras coletadas em 30/10 são automaticamente excluídas dos cálculos de média histórica.

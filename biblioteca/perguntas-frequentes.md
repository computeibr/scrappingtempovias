# Perguntas Frequentes — Metodologia

## Sobre o cálculo de variação

**Você considera a média do momento da leitura e compara com a média da hora da leitura?**

Sim. A comparação é feita com leituras anteriores do **mesmo horário** (mesma hora cheia, ex: 17h) e do **mesmo dia da semana** (ex: sexta-feira). Isso garante que a referência seja contextualmente equivalente — comparar o trânsito de uma sexta às 18h com uma média geral de todos os horários seria incorreto.

---

**Como você sabe que está acima ou abaixo da média?**

O sistema calcula a diferença percentual entre o tempo atual e a média histórica filtrada:

```
variação = ((tempo_atual - média_histórica) / média_histórica) × 100
```

- Acima de +5%: status **Acima da média** (vermelho)
- Entre -5% e +5%: status **Na média** (cinza)
- Abaixo de -5%: status **Abaixo da média** (verde)

A tolerância de ±5% evita alertas desnecessários por pequenas variações naturais.

---

**Por que usar 3 semanas e não 30 dias?**

Porque o filtro por dia da semana já restringe bastante o conjunto. Em 3 semanas, o mesmo dia da semana aparece 3 vezes — suficiente para uma média representativa sem incorporar variações sazonais de períodos mais longos.

---

**O que acontece se houver poucas leituras no histórico?**

Se não houver nenhuma leitura válida para aquele contexto (hora + dia da semana + não feriado) nas últimas 3 semanas, o card exibe **"Sem histórico"** em amarelo. O sistema não força um percentual baseado em amostra insuficiente.

---

**Os feriados afetam a média?**

Não — feriados, pontos facultativos e outros dias não úteis são excluídos do cálculo. Leituras coletadas nesses dias existem no banco de dados, mas são ignoradas ao calcular a média histórica de dias úteis.

---

## Sobre a coleta

**Com que frequência os dados são coletados?**

A cada 5 minutos, via Puppeteer acessando o Google Maps. O sistema também coleta imediatamente ao ser iniciado.

---

**Os dados são em tempo real?**

Sim, no sentido de que o Google Maps já considera o tráfego atual ao calcular o tempo estimado. O sistema coleta esse dado a cada 5 minutos, então a defasagem máxima em condições normais é de 5 minutos.

---

**Você tem redundância caso o servidor caia e não tenha dados em um determinado período?**

Não há coleta retroativa — o Google Maps só fornece o tempo atual, não o histórico. Se o servidor ficar indisponível, as leituras desse período simplesmente não existem no banco.

O impacto no cálculo de média é pequeno: algumas leituras a menos no histórico de 3 semanas. O sistema trabalha com o que está disponível e sinaliza "Sem histórico" apenas quando não há dados suficientes.

Para minimizar lacunas, o servidor usa PM2 com reinício automático após quedas de energia.

---

**O que acontece se o Google Maps mudar o layout da página?**

O scraping pode quebrar. O sistema registra o erro no log e continua tentando nas coletas seguintes. A equipe técnica precisa ser notificada para atualizar o seletor CSS ou XPath usado pelo Puppeteer.

---

## Sobre os dados históricos

**Os dados históricos são preservados indefinidamente?**

Sim. Todas as leituras são armazenadas na tabela `tempovias` sem limite de tempo. Com 12 rotas e coleta a cada 5 minutos, o crescimento é de aproximadamente 3.500 registros por dia.

---

**Posso ver o histórico de uma rota específica?**

Sim. No Dashboard principal, selecione uma rota na lista lateral para ver o gráfico de variação por hora, a evolução diária e a tabela de leituras com filtros de data.

---

**O sistema considera obras ou eventos especiais?**

Não automaticamente. O sistema captura o que o Google Maps informa em tempo real — se houver um acidente ou obra, o Google Maps já incorpora esse dado no tempo estimado. O sistema registra o valor sem classificá-lo como "evento especial".

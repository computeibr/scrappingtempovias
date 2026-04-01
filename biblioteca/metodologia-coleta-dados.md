# Metodologia: Coleta de Dados

## Como os dados são coletados

O sistema utiliza **Puppeteer**, uma biblioteca Node.js que controla um navegador Chrome em modo headless (sem interface gráfica), para acessar o Google Maps e extrair o tempo estimado de percurso de cada rota cadastrada.

O processo é o seguinte:

1. O servidor abre o Google Maps com a URL da rota (que contém os pontos de origem e destino definidos pela CETRIO)
2. O Google Maps calcula o tempo estimado considerando o **tráfego em tempo real**
3. O sistema extrai o tempo (ex: "23 min", "1 h 10 min") e a distância (ex: "7,4 km") da página
4. Os dados são salvos no banco de dados PostgreSQL com o timestamp exato da leitura

---

## Frequência de coleta

A coleta ocorre **a cada 5 minutos**, controlada por um `node-cron` executando no servidor.

Adicionalmente, o sistema faz uma coleta imediata no momento em que o servidor é iniciado — sem esperar o primeiro ciclo de 5 minutos — garantindo dados frescos logo após um reinício.

---

## Controle de execução paralela

O sistema possui uma flag `isRunning` que impede que um novo ciclo de coleta inicie antes do ciclo anterior terminar. Isso protege contra situações em que a coleta de todas as rotas demorar mais que 5 minutos (por lentidão da internet ou sobrecarga do Google Maps).

---

## Como o tempo é armazenado

O Google Maps retorna o tempo em formato textual, como `"23 min"` ou `"1 h 10 min"`. O sistema armazena esse valor textual no banco.

Para cálculos de média, o sistema converte esse texto para minutos usando a seguinte lógica:

- `"23 min"` → 23 minutos
- `"1 h 10 min"` → 70 minutos
- `"1h 5min"` → 65 minutos

---

## Tratamento de falhas na coleta

Cada rota tem até **2 tentativas** em caso de falha (timeout, erro de rede, mudança no layout do Google Maps). Se ambas falharem, a rota é ignorada no ciclo atual e a coleta continua para as demais rotas. O sistema registra o erro no log, mas não interrompe o monitoramento das outras rotas.

---

## Fuso horário

Todos os timestamps são armazenados em UTC no banco de dados PostgreSQL e convertidos para o fuso **America/Sao_Paulo** na exibição e nos cálculos. A biblioteca `luxon` é responsável por essa conversão.

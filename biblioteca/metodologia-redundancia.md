# Metodologia: Redundância e Disponibilidade dos Dados

## O que acontece se o servidor cair?

Se o servidor local (onde roda o scraping) ficar indisponível por algum período, **os dados simplesmente não são coletados** nesse intervalo. Não há backup automático nem coleta retroativa.

O sistema não tenta "recuperar" leituras passadas porque o Google Maps só fornece o tempo de tráfego **em tempo real** — não há API que permita consultar como era o tráfego às 14h de ontem.

---

## Como o sistema lida com lacunas nos dados

O cálculo de variação usa as leituras disponíveis no banco. Se houver lacunas (períodos sem dados), o sistema simplesmente trabalha com o que existe:

- Se houver leituras suficientes no horário e dia da semana, o cálculo é feito normalmente
- Se não houver nenhuma leitura válida no período histórico para aquele contexto, o card exibe status **"Sem histórico"** (amarelo) em vez de forçar um percentual baseado em amostra insuficiente

Isso é intencional: exibir um percentual baseado em 1 ou 2 leituras seria enganoso.

---

## Proteção contra execução paralela

O sistema tem uma flag `isRunning` que garante que apenas um ciclo de coleta rode por vez. Se o ciclo anterior ainda não terminou quando o próximo for disparado, o novo ciclo é ignorado. Isso protege o servidor e o banco de dados de sobrecarga.

---

## Estratégia para alta disponibilidade (produção)

A arquitetura atual usa dois ambientes:

| Ambiente | Função |
|---|---|
| Máquina local do cliente | Coleta de dados (scraping) + banco de dados na VPS |
| VPS (EasyPanel/Docker) | Acesso ao sistema (frontend + API) sem coleta |

O banco de dados PostgreSQL fica na VPS e é compartilhado pelos dois ambientes. Se a máquina local cair:
- O sistema na VPS continua funcionando normalmente para consulta
- Os dados históricos permanecem íntegros
- Apenas a coleta de novos dados é interrompida

Se a VPS cair:
- A coleta na máquina local falha (não consegue salvar no banco)
- Os dados não se perdem — estão no PostgreSQL que ficou indisponível temporariamente
- Quando a VPS volta, a coleta retoma automaticamente no próximo ciclo de 5 minutos

---

## PM2 e reinício automático

Na máquina local (Windows), o sistema usa **PM2** com `pm2-windows-startup` para reiniciar automaticamente após quedas de energia ou reboots. O tempo de indisponibilidade após uma queda de energia é tipicamente de 2 a 5 minutos (tempo de boot do Windows + inicialização do Node.js).

---

## O que não é coberto

- **Queda prolongada da internet local:** se a máquina estiver ligada mas sem internet, o Puppeteer não consegue acessar o Google Maps. As tentativas falham silenciosamente e são registradas no log
- **Mudanças no layout do Google Maps:** o Google pode alterar o HTML da página, quebrando o scraping. Monitorar os logs periodicamente é recomendado
- **Replicação do banco de dados:** não há replicação automática. Um backup manual ou automatizado do PostgreSQL é recomendado para ambientes de produção críticos

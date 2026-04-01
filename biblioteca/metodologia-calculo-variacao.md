# Metodologia: Cálculo de Variação do Tempo de Percurso

## O que o sistema calcula

Para cada rota monitorada, o sistema exibe dois números:

1. **Tempo atual** — o tempo de percurso extraído do Google Maps na última coleta
2. **Variação percentual** — a diferença entre o tempo atual e a média histórica do mesmo contexto

A variação é calculada como:

```
variação (%) = ((tempo_atual - média_histórica) / média_histórica) × 100
```

Se a variação for `+15%`, o trânsito está **15% pior** que o habitual nesse horário.
Se for `-10%`, está **10% melhor** que o habitual.

---

## Por que comparar com o mesmo horário e dia da semana?

Comparar o trânsito de uma sexta às 18h com uma média geral de todos os horários seria incorreto — o trânsito em horário de pico é estruturalmente diferente de madrugada ou sábado.

O sistema filtra o histórico por:
- **Mesma hora do dia** (ex: se a leitura atual foi às 17h, compara apenas com leituras das 17h)
- **Mesmo dia da semana** (ex: se é sexta-feira, compara apenas com sextas-feiras anteriores)

Isso garante que a comparação seja contextualmente justa.

---

## Por que 3 semanas de histórico?

O intervalo de 3 semanas (21 dias) foi escolhido por equilibrar dois fatores:

- **Representatividade:** 3 semanas garantem pelo menos 3 amostras do mesmo dia da semana e mesmo horário (uma por semana), o que é suficiente para calcular uma média significativa
- **Atualidade:** usar um período muito longo (ex: 6 meses) incorporaria variações sazonais — verão vs inverno, período de festas, obras viárias — que distorceriam a referência

Em dias com coleta a cada 5 minutos, uma hora tem até 12 leituras. Em 3 semanas, o mesmo horário de uma sexta-feira pode ter até 36 leituras válidas.

---

## Como o sistema classifica o status

| Status | Condição | Cor |
|---|---|---|
| Acima da média | variação > +5% | Vermelho |
| Na média | variação entre -5% e +5% | Cinza |
| Abaixo da média | variação < -5% | Verde |
| Sem histórico | menos de 1 leitura válida no período | Amarelo |
| Sem dados | nenhuma leitura registrada | Cinza claro |

A faixa de tolerância de ±5% evita falsos alertas causados por pequenas flutuações naturais (semáforo, travessia de pedestre, etc.).

---

## Exemplo prático

> Rota: Centro → Barra  
> Hora atual: 08h15 de uma quarta-feira  
> Tempo atual: 45 min  
> Histórico das últimas 3 quartas-feiras às 08h: 35 min, 38 min, 37 min  
> Média histórica: 36,7 min  
> Variação: ((45 - 36,7) / 36,7) × 100 = **+22,6% — Acima da média**

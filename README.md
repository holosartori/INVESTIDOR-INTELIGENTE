# Patch 2.7 — Selic por intervalo de datas

Substitua apenas `netlify/functions/indicadores.js` no GitHub.

Mudança principal:
- A série 432 deixa de usar `/dados/ultimos/N`.
- Passa a usar `/dados?formato=json&dataInicial=...&dataFinal=...`.
- O fim do intervalo é calculado no fuso America/Sao_Paulo e é exatamente a data atual.
- A janela consultada é de 60 dias, suficiente para capturar a última taxa mesmo em feriados e finais de semana.
- Os demais indicadores continuam com a lógica já corrigida: CDI 12/4389 e IPCA 13522.

Após deploy, teste:
https://calculadorainvesti.netlify.app/.netlify/functions/indicadores

Verifique:
- `ok: true`
- `indicators.selicDate` não posterior a `diagnostics.todaySaoPaulo`
- `diagnostics.selicQueryEnd` igual à data atual de São Paulo.

# Patch 2.6 — correção definitiva do formato de data

A causa provável do erro de Selic é a comparação de datas no runtime do Netlify.

O código anterior usava:
`new Intl.DateTimeFormat("en-CA", ...).format(new Date())`
presumindo que o resultado seria sempre `YYYY-MM-DD`. Isso não é garantido em todos os ambientes. Se o runtime devolver `11/07/2026`, a comparação lexicográfica com datas `2026-...` elimina todos os registros.

Este patch usa `formatToParts()` e monta explicitamente `YYYY-MM-DD`, evitando dependência do formato localizado.

Também inclui diagnóstico:
- `todaySaoPaulo`
- `selicLatestReturned`
- `validSelicRecords`

## Instalação
Substitua somente `netlify/functions/indicadores.js` pelo arquivo do pacote. Commit e aguarde o deploy.

Teste:
https://calculadorainvesti.netlify.app/.netlify/functions/indicadores

Se houver falha, o erro agora mostrará a data calculada e o último registro recebido para a Selic.

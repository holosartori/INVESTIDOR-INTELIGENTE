# Patch 2.5 — IPCA direto pela série SGS 13522

O endpoint da SGS 433 está retornando HTTP 304 repetidamente nesta implantação. Para não depender de uma série mensal e de composição local, este patch passa a usar a série oficial SGS 13522, cuja descrição é "IPCA — em 12 meses".

Vantagens:
- O Banco Central já publica o IPCA acumulado em 12 meses.
- O campo `ipca12mPercent` recebe diretamente um número.
- Remove a consulta à SGS 433 que estava falhando.
- Mantém CDI, Selic, filtro de datas futuras e diagnóstico de quantidade de registros.

## Instalação
Substitua apenas `netlify/functions/indicadores.js` no GitHub pelo arquivo deste pacote. Faça commit e aguarde o deploy.

Teste:
https://calculadorainvesti.netlify.app/.netlify/functions/indicadores

Resultado esperado:
- `ok: true`
- `indicators.ipca12mPercent`: número, próximo de 4.58 para a referência set/2026 que apareceu no retorno anterior.
- `indicators.ipcaDate`: mês de referência da série 13522.
- `diagnostics.ipcaSourceSeries`: 13522.

Fonte oficial da série 13522:
https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarSeries&series=13522

# Patch 2.1 — correção IPCA e data futura da Selic

Substitua `netlify/functions/indicadores.js` pelo arquivo deste pacote e faça commit/push.

Correções:
1. `ipca12mPercent` agora retorna um número (ex.: 4.5761), não a lista de 12 meses.
2. Datas futuras são removidas das séries antes de selecionar a última observação.
3. CDI exibido é anualizado a partir da taxa diária SGS 12 mais recente, enquanto SGS 4389 fica como conferência.
4. Data do CDI exibido corresponde à data da taxa diária utilizada.

Depois do deploy, teste:
`https://calculadorainvesti.netlify.app/.netlify/functions/indicadores`

Resultado esperado na estrutura:
- `indicators.ipca12mPercent`: número.
- `indicators.selicDate`: data não posterior à data atual em São Paulo.
- `indicators.cdiAnnualPercent`: número anualizado.
- `indicators.cdiConsistent`: true/false ou null se não houver série anual disponível.

O frontend pode continuar usando os mesmos nomes `cdiAnnualPercent`, `selicMetaPercent` e `ipca12mPercent`.

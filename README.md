# Investidor Inteligente Pro — Patch 4.1 (correções pós-teste)

Substitua somente `index.html` pelo arquivo deste pacote. Mantenha `netlify/functions/indicadores.js` e `netlify.toml` inalterados.

Correções:
1. Datas do SGS chegam como `DD/MM/YYYY`; a versão anterior passava esse texto diretamente para `new Date()`, gerando "Invalid Date". O formatador agora reconhece `DD/MM/YYYY` e `YYYY-MM-DD`.
2. LCI e LCA pós-fixadas agora capitalizam usando a taxa diária do CDI multiplicada pelo percentual contratado. Na 4.0, os tipos `lci` e `lca` caíam no ramo de prefixado/IPCA e rendiam zero.
3. Ganho real corrigido: compara o saldo líquido com o valor corrigido pela inflação de cada aporte, desde a data da aplicação até o resgate, em vez de deflacionar o saldo inteiro e subtrair aportes nominais.
4. Mantém cálculo por lote, IR/IOF estimados, exportação CSV e conexão BCB existente.

Validação:
- JavaScript verificado sintaticamente.
- Teste aritmético de LCI 95% CDI: taxa anual equivalente calculada pela capitalização da taxa DI diária.
- Antes de investir, confirme as condições reais de carência, liquidez, tributação e calendário de dias úteis.

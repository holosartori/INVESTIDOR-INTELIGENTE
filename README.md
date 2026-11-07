# Investidor Inteligente — versão 3.1

## Instalação
Substitua o `index.html` atual pelo arquivo deste pacote. Mantenha `netlify/functions/indicadores.js` e `netlify.toml` inalterados.

## Alteração principal
O cálculo do IR agora é feito lote a lote:
- aporte inicial: prazo completo;
- cada aporte mensal: prazo restante até o fim da simulação;
- alíquota regressiva estimada por prazo: até 180 dias 22,5%; 181–360 dias 20%; 361–720 dias 17,5%; acima de 720 dias 15%;
- LCI/LCA continuam com IR zero para pessoa física, conforme regra aplicável.

## Limitação importante
Como a simulação usa aportes mensais e não datas de calendário informadas pelo usuário, o prazo de cada lote é convertido de meses em dias corridos médios (365,2425/12). O cálculo é uma estimativa. Para apuração exata, usar datas efetivas de aplicação e resgate, regras do produto e legislação vigente.

O backend de indicadores BCB não foi alterado.

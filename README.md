# Investidor Inteligente Pro — versão 4.0

## Publicação em uma única atualização
Substitua somente o `index.html` no GitHub pelo arquivo deste pacote. Mantenha a pasta `netlify/functions/` e o `netlify.toml` atuais. A integração com o BCB não foi alterada.

## Recursos
- Indicadores CDI, Selic e IPCA via função Netlify existente.
- Datas de investimento inicial, aportes mensais e resgate.
- Cálculo por lote, com dias corridos reais entre datas.
- CDI projetado com dias úteis de segunda a sexta (sem calendário de feriados).
- Prefixado e IPCA+ capitalizados por dias corridos.
- IR regressivo por lote.
- IOF regressivo nos resgates até 29 dias.
- Comparação de CDB, LCI, LCA, prefixado e IPCA+.
- Ganho real estimado e demonstrativo por aporte.
- Exportação do demonstrativo para CSV.

## Premissas e limites importantes
- A taxa CDI, IPCA e demais taxas permanecem constantes durante toda a projeção.
- A contagem de dias úteis exclui fins de semana, mas não feriados.
- O simulador não modela carência, liquidez, marcação a mercado, spreads, taxas, eventos de crédito nem regras específicas de cada emissor.
- A tributação segue uma estimativa geral da tabela regressiva de renda fixa e IOF; confirme o enquadramento do produto e a legislação vigente.
- Para LCI/LCA, o modelo considera isenção de IR para pessoa física, mas não avalia elegibilidade, carência ou restrições de resgate.
- O ganho real mostrado é uma estimativa: saldo líquido deflacionado pelo IPCA projetado ao longo do prazo total menos os aportes nominais. Não é uma TIR real ponderada por fluxo de caixa.

## Validação pré-publicação
O JavaScript foi verificado sintaticamente. Antes de publicar, teste os campos de data, aporte mensal zero/positivo, resgate curto e longo, CSV e a resposta da função BCB existente.

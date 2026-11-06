# Investidor Inteligente — versão corrigida 1.1

## Correção crítica
A conversão de percentual do CDI foi corrigida. Agora, CDI de 14% e LCI de 95% do CDI geram taxa anual decimal de 0,133 (13,30%), e não 13,3 (1.330%).

## Publicação
Substitua o `index.html` do repositório GitHub por este arquivo. Se o Netlify estiver conectado ao repositório, ele publicará automaticamente após o commit/push.

## Teste de referência
Entradas: R$ 5.000 iniciais, R$ 500 mensais, 5 anos, CDI 14%.
A taxa LCI 95% CDI corresponde a 13,30% a.a. nominal, com saldo estimado na ordem de R$ 49 mil (a depender do arredondamento e método de capitalização mensal).

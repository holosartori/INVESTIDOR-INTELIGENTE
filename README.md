# Investidor Inteligente — Indicadores automáticos BCB

## Arquivos
- `index.html`: interface com consulta automática ao carregar e botão Atualizar agora.
- `netlify/functions/indicadores.js`: consulta o Banco Central e normaliza os indicadores.
- `netlify.toml`: configura a pasta de publicação e as funções.

## Indicadores
- CDI anualizado: SGS 4389 (% a.a., base 252).
- CDI diário para conferência: SGS 12 (% a.d.). A função anualiza a última taxa diária com 252 dias úteis e compara com a SGS 4389.
- Meta Selic: SGS 432 (% a.a.).
- IPCA: SGS 433 (% mensal). O IPCA de 12 meses é calculado por composição geométrica dos 12 últimos valores mensais.

## Instalação no repositório existente
1. Faça backup dos arquivos atuais.
2. Substitua `index.html` pelo deste pacote.
3. Adicione a pasta `netlify/functions/` e o arquivo `indicadores.js`.
4. Adicione/substitua `netlify.toml` na raiz.
5. Commit e push no GitHub. O Netlify deve reconstruir o site conectado ao repositório.
6. Abra `https://SEU-SITE/.netlify/functions/indicadores` para testar o JSON.
7. Abra o site: a consulta ocorre automaticamente; o botão permite atualizar novamente.

## Observações técnicas
- A consulta ao BCB ocorre na função Netlify, não diretamente no navegador, evitando dependência de CORS no frontend.
- A função aplica cache de borda para reduzir chamadas repetidas.
- Não requer chave de API.
- A série CDI 4389 é taxa anualizada base 252. Não confundir com SGS 12, que é taxa diária em % ao dia.
- A taxa equivalente de um título que paga x% CDI é calculada aplicando x% à taxa DI diária equivalente e compondo 252 dias úteis.
- O site deve ser publicado com Netlify Functions habilitadas; apenas hospedagem estática sem functions não fará a atualização.
- Cálculos de investimento seguem simplificados e não substituem cálculo por fluxo de caixa/datas reais, impostos por lote, custos e condições contratuais.

## Fontes
Banco Central do Brasil — API pública SGS: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados
Portal oficial: https://dadosabertos.bcb.gov.br/

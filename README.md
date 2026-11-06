# Investidor Inteligente — MVP

Site estático em HTML, CSS e JavaScript. Não exige servidor Python em produção.

## Testar localmente
Abra `index.html` no navegador. Para servir localmente:
```bash
python -m http.server 8000
```
Acesse http://localhost:8000

## Publicar no Netlify
1. Crie um repositório no GitHub e envie `index.html` e `README.md`.
2. No Netlify, escolha Add new site > Import an existing project.
3. Conecte o GitHub e selecione o repositório.
4. Build command: deixe vazio. Publish directory: `.`.
5. Publique. O Netlify fornecerá um endereço `*.netlify.app`.

## Limitações desta versão
- Taxas são editáveis e ilustrativas; não há atualização automática nesta versão.
- Cálculo mensal aproximado, com aportes no fim do mês.
- IR do CDB é estimado sobre o ganho total, não por lote/aporte.
- Não calcula marcação a mercado, custódia, IOF, spread ou regras específicas de cada título.
- Não é recomendação de investimento.

## Próxima evolução
Adicionar Netlify Functions para consultar séries do Banco Central e entregar indicadores normalizados ao navegador. Guardar chaves de serviços privados apenas em variáveis de ambiente do Netlify, nunca no HTML/JavaScript público.

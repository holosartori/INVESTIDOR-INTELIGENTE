// Investidor Inteligente — Netlify Function
// Corrige comparação de datas no runtime Netlify.
// SGS 4389 CDI anualizado; SGS 12 CDI diário; SGS 432 Selic meta;
// SGS 13522 IPCA acumulado em 12 meses.

const BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

function parseDateBR(s) {
  const [d,m,y] = s.split("/");
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}

// Não usar Intl.DateTimeFormat(...).format() presumindo ISO:
// o locale en-CA pode retornar formato diferente conforme o runtime.
// formatToParts garante ano, mês e dia separados.
function todaySP() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone:"America/Sao_Paulo",
    year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(p => [p.type,p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

async function fetchSgs(code, n) {
  const count = Math.max(1, Math.min(20, n));
  const url = `${BASE}.${code}/dados/ultimos/${count}?formato=json`;
  const response = await fetch(url, {
    headers: {"Accept":"application/json", "Cache-Control":"no-cache"}
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`BCB SGS ${code}: HTTP ${response.status}; resposta: ${body.slice(0,300)}`);
  }
  let rows;
  try { rows = JSON.parse(body); }
  catch { throw new Error(`BCB SGS ${code}: resposta não é JSON: ${body.slice(0,200)}`); }
  if (!Array.isArray(rows)) throw new Error(`BCB SGS ${code}: formato inesperado.`);
  const today = todaySP();
  const parsed = rows.map(r => ({
    date:r.data,
    isoDate:parseDateBR(r.data),
    value:Number(String(r.valor).replace(",","."))
  })).filter(r => Number.isFinite(r.value));
  const valid = parsed.filter(r => r.isoDate <= today).sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
  return { valid, latestReturned:parsed.sort((a,b)=>a.isoDate.localeCompare(b.isoDate)).at(-1)||null, today };
}
exports.handler = async () => {
  try {
    const [cdiAnnualResult,cdiDailyResult,selicResult,ipcaResult] = await Promise.all([
      fetchSgs(4389,20),
      fetchSgs(12,20),
      fetchSgs(432,20),
      fetchSgs(13522,10)
    ]);
    const cdiAnnualRows=cdiAnnualResult.valid;
    const cdiDailyRows=cdiDailyResult.valid;
    const selicRows=selicResult.valid;
    const ipcaRows=ipcaResult.valid;

    if (!cdiDailyRows.length) throw new Error("SGS 12 não retornou CDI diário válido até "+cdiDailyResult.today+".");
    if (!selicRows.length) {
      const last=selicResult.latestReturned;
      throw new Error(`SGS 432: nenhum registro passou pelo filtro de data. Data atual calculada em São Paulo: ${selicResult.today}. Último registro recebido: ${last ? last.date : "nenhum"}.`);
    }
    if (!ipcaRows.length) throw new Error("SGS 13522 não retornou IPCA acumulado em 12 meses válido.");

    const daily=cdiDailyRows.at(-1);
    const cdiAnnualFromDaily=(Math.pow(1+daily.value/100,252)-1)*100;
    const annualPublished=cdiAnnualRows.at(-1)||null;
    const diff=annualPublished?Math.abs(cdiAnnualFromDaily-annualPublished.value):null;
    const selic=selicRows.at(-1);
    const ipca=ipcaRows.at(-1);

    return {
      statusCode:200,
      headers:{
        "Content-Type":"application/json; charset=utf-8",
        "Cache-Control":"public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
        "Access-Control-Allow-Origin":"*"
      },
      body:JSON.stringify({
        ok:true,
        source:"Banco Central do Brasil — SGS",
        updatedAt:new Date().toISOString(),
        indicators:{
          cdiAnnualPercent:cdiAnnualFromDaily,
          cdiDate:daily.date,
          cdiDailyPercent:daily.value,
          cdiDailyDate:daily.date,
          cdiAnnualPublishedPercent:annualPublished?.value??null,
          cdiAnnualPublishedDate:annualPublished?.date??null,
          cdiConsistent:diff===null?null:diff<=0.03,
          cdiDifferencePp:diff,
          selicMetaPercent:selic.value,
          selicDate:selic.date,
          ipca12mPercent:ipca.value,
          ipcaDate:ipca.date
        },
        diagnostics:{
          todaySaoPaulo:selicResult.today,
          selicLatestReturned:selicResult.latestReturned,
          validSelicRecords:selicRows.length,
          ipcaSourceSeries:13522
        },
        methodology:{
          cdi:"SGS 12 anualizado em 252 dias úteis; SGS 4389 usado como conferência.",
          selic:"SGS 432: última observação até a data atual de São Paulo. Datas comparadas em ISO YYYY-MM-DD.",
          ipca:"SGS 13522: IPCA acumulado em 12 meses."
        }
      })
    };
  } catch(e) {
    return {
      statusCode:502,
      headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},
      body:JSON.stringify({ok:false,error:e.message,source:"Banco Central do Brasil — SGS",updatedAt:new Date().toISOString()})
    };
  }
};

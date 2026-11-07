// Investidor Inteligente — Netlify Function
// Fontes BCB/SGS:
// 4389 CDI anualizado (% a.a., base 252)
// 12 CDI diário (% a.d.)
// 432 Meta Selic (% a.a.)
// 13522 IPCA acumulado em 12 meses (%). Série direta — substitui a composição da SGS 433.

const BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

function parseDateBR(s) {
  const [d,m,y] = s.split("/");
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}
function todaySP() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone:"America/Sao_Paulo", year:"numeric", month:"2-digit", day:"2-digit"
  }).format(new Date());
}
async function fetchSgs(code, n) {
  const count = Math.max(1, Math.min(20, n));
  const url = `${BASE}.${code}/dados/ultimos/${count}?formato=json`;
  const response = await fetch(url, {
    headers: {
      "Accept":"application/json",
      "Cache-Control":"no-cache",
      "Pragma":"no-cache"
    }
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
  return rows.map(r => ({
    date:r.data,
    isoDate:parseDateBR(r.data),
    value:Number(String(r.valor).replace(",","."))
  })).filter(r => Number.isFinite(r.value) && r.isoDate <= today)
    .sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
}

exports.handler = async () => {
  try {
    const [cdiAnnualRows,cdiDailyRows,selicRows,ipca12Rows] = await Promise.all([
      fetchSgs(4389,20),
      fetchSgs(12,20),
      fetchSgs(432,10),
      fetchSgs(13522,10)
    ]);

    if (!cdiDailyRows.length) throw new Error("SGS 12 não retornou CDI diário válido.");
    if (!selicRows.length) throw new Error("SGS 432 não retornou observações válidas até hoje.");
    if (!ipca12Rows.length) throw new Error("SGS 13522 não retornou IPCA acumulado em 12 meses.");

    const daily = cdiDailyRows.at(-1);
    const cdiAnnualFromDaily = (Math.pow(1+daily.value/100,252)-1)*100;
    const annualPublished = cdiAnnualRows.at(-1) || null;
    const diff = annualPublished ? Math.abs(cdiAnnualFromDaily-annualPublished.value) : null;
    const selic = selicRows.at(-1);
    const ipca12 = ipca12Rows.at(-1);

    const result = {
      ok:true,
      source:"Banco Central do Brasil — SGS",
      updatedAt:new Date().toISOString(),
      indicators:{
        cdiAnnualPercent:cdiAnnualFromDaily,
        cdiDate:daily.date,
        cdiDailyPercent:daily.value,
        cdiDailyDate:daily.date,
        cdiAnnualPublishedPercent:annualPublished?.value ?? null,
        cdiAnnualPublishedDate:annualPublished?.date ?? null,
        cdiConsistent:diff===null?null:diff<=0.03,
        cdiDifferencePp:diff,
        selicMetaPercent:selic.value,
        selicDate:selic.date,
        ipca12mPercent:ipca12.value,
        ipcaDate:ipca12.date
      },
      diagnostics:{
        ipcaSourceSeries:13522,
        ipcaSeriesDescription:"IPCA acumulado em 12 meses",
        requestedCounts:{cdiAnnual:20,cdiDaily:20,selic:10,ipca12m:10},
        returnedCounts:{cdiAnnual:cdiAnnualRows.length,cdiDaily:cdiDailyRows.length,selic:selicRows.length,ipca12m:ipca12Rows.length}
      },
      methodology:{
        cdi:"SGS 12: última taxa diária, anualizada por (1 + taxa diária)^252 - 1. SGS 4389 é conferência.",
        selic:"SGS 432: última observação válida, sem datas futuras.",
        ipca:"SGS 13522: série oficial do IPCA acumulado em 12 meses; não precisa compor os 12 valores da SGS 433."
      }
    };
    return {
      statusCode:200,
      headers:{
        "Content-Type":"application/json; charset=utf-8",
        "Cache-Control":"public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
        "Access-Control-Allow-Origin":"*"
      },
      body:JSON.stringify(result)
    };
  } catch(e) {
    return {
      statusCode:502,
      headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},
      body:JSON.stringify({ok:false,error:e.message,source:"Banco Central do Brasil — SGS",updatedAt:new Date().toISOString()})
    };
  }
};

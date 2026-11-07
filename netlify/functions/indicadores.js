// Investidor Inteligente — Netlify Function
// CDI: SGS 12 (diário) anualizado em 252 dias úteis; SGS 4389 para conferência.
// Selic meta: SGS 432 consultada por intervalo explícito encerrado na data atual SP.
// IPCA 12m: SGS 13522.

const BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

function parseDateBR(s) {
  const [d,m,y] = s.split("/");
  return `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
}
function toDateBR(iso) {
  const [y,m,d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
function todaySP() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone:"America/Sao_Paulo", year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(new Date());
  const v = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${v.year}-${v.month}-${v.day}`;
}
function daysBefore(iso, days) {
  const [y,m,d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y,m-1,d-days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,"0")}-${String(date.getUTCDate()).padStart(2,"0")}`;
}
async function fetchJson(url, code) {
  const response = await fetch(url, {
    headers:{"Accept":"application/json","Cache-Control":"no-cache"}
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`BCB SGS ${code}: HTTP ${response.status}; ${body.slice(0,300)}`);
  }
  let rows;
  try { rows=JSON.parse(body); }
  catch { throw new Error(`BCB SGS ${code}: resposta inválida: ${body.slice(0,200)}`); }
  if (!Array.isArray(rows)) throw new Error(`BCB SGS ${code}: formato inesperado.`);
  return rows;
}
async function fetchLast(code,n) {
  const count=Math.max(1,Math.min(20,n));
  const url=`${BASE}.${code}/dados/ultimos/${count}?formato=json`;
  const rows=await fetchJson(url,code);
  return rows.map(r=>({date:r.data,isoDate:parseDateBR(r.data),value:Number(String(r.valor).replace(",","."))}))
    .filter(r=>Number.isFinite(r.value)).sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
}
async function fetchRange(code,startIso,endIso) {
  const url=`${BASE}.${code}/dados?formato=json&dataInicial=${encodeURIComponent(toDateBR(startIso))}&dataFinal=${encodeURIComponent(toDateBR(endIso))}`;
  const rows=await fetchJson(url,code);
  return rows.map(r=>({date:r.data,isoDate:parseDateBR(r.data),value:Number(String(r.valor).replace(",","."))}))
    .filter(r=>Number.isFinite(r.value)&&r.isoDate<=endIso)
    .sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
}
exports.handler=async()=>{
  try{
    const today=todaySP();
    const selicStart=daysBefore(today,60);
    const [cdiAnnualRows,cdiDailyRows,selicRows,ipcaRows]=await Promise.all([
      fetchLast(4389,20),
      fetchLast(12,20),
      fetchRange(432,selicStart,today),
      fetchLast(13522,10)
    ]);
    if(!cdiDailyRows.length)throw new Error("SGS 12 não retornou CDI diário.");
    if(!selicRows.length)throw new Error(`SGS 432 não retornou valores no intervalo ${toDateBR(selicStart)} a ${toDateBR(today)}.`);
    if(!ipcaRows.length)throw new Error("SGS 13522 não retornou IPCA acumulado em 12 meses.");

    const daily=cdiDailyRows.at(-1);
    const cdiAnnualFromDaily=(Math.pow(1+daily.value/100,252)-1)*100;
    const annualPublished=cdiAnnualRows.filter(x=>x.isoDate<=today).at(-1)||null;
    const diff=annualPublished?Math.abs(cdiAnnualFromDaily-annualPublished.value):null;
    const selic=selicRows.at(-1);
    const ipca=ipcaRows.filter(x=>x.isoDate<=today).at(-1)||null;
    if(!ipca)throw new Error("SGS 13522 não possui observação até a data atual.");

    return{
      statusCode:200,
      headers:{
        "Content-Type":"application/json; charset=utf-8",
        "Cache-Control":"public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
        "Access-Control-Allow-Origin":"*"
      },
      body:JSON.stringify({
        ok:true,source:"Banco Central do Brasil — SGS",updatedAt:new Date().toISOString(),
        indicators:{
          cdiAnnualPercent:cdiAnnualFromDaily,cdiDate:daily.date,
          cdiDailyPercent:daily.value,cdiDailyDate:daily.date,
          cdiAnnualPublishedPercent:annualPublished?.value??null,
          cdiAnnualPublishedDate:annualPublished?.date??null,
          cdiConsistent:diff===null?null:diff<=0.03,cdiDifferencePp:diff,
          selicMetaPercent:selic.value,selicDate:selic.date,
          ipca12mPercent:ipca.value,ipcaDate:ipca.date
        },
        diagnostics:{
          todaySaoPaulo:today,
          selicQueryStart:selicStart,
          selicQueryEnd:today,
          selicReturnedRecords:selicRows.length,
          selicLastRecord:selic.date,
          selicLastValue:selic.value
        },
        methodology:{
          cdi:"SGS 12 anualizado em 252 dias úteis; SGS 4389 para conferência.",
          selic:"SGS 432 consultada por dataInicial/dataFinal; dataFinal é a data atual de São Paulo, impedindo registros futuros.",
          ipca:"SGS 13522: IPCA acumulado em 12 meses."
        }
      })
    };
  }catch(e){
    return{
      statusCode:502,
      headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"},
      body:JSON.stringify({ok:false,error:e.message,source:"Banco Central do Brasil — SGS",updatedAt:new Date().toISOString()})
    };
  }
};

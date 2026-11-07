// Investidor Inteligente — Netlify Function
// Tratamento de HTTP 304 do endpoint público SGS do Banco Central.

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

async function fetchSgsBody(url, code) {
  // Primeira tentativa sem validadores condicionais e pedindo resposta não armazenada.
  let response = await fetch(url, {
    method:"GET",
    headers:{
      "Accept":"application/json",
      "Cache-Control":"no-cache, no-store, max-age=0",
      "Pragma":"no-cache"
    }
  });

  // 304 não traz corpo. Repetimos com query string única para evitar cache intermediário.
  if (response.status === 304) {
    const separator = url.includes("?") ? "&" : "?";
    const retryUrl = `${url}${separator}_cb=${Date.now()}`;
    response = await fetch(retryUrl, {
      method:"GET",
      headers:{
        "Accept":"application/json",
        "Cache-Control":"no-cache, no-store, max-age=0",
        "Pragma":"no-cache"
      }
    });
  }

  const body = await response.text();
  if (response.status === 304) {
    throw new Error(`BCB SGS ${code}: HTTP 304 mesmo após nova tentativa sem cache. URL consultada: ${url}`);
  }
  if (!response.ok) {
    throw new Error(`BCB SGS ${code}: HTTP ${response.status}; resposta: ${body.slice(0,350)}`);
  }
  return body;
}

async function getLast(code, n) {
  const count = Math.max(1, Math.min(20, n));
  const url = `${BASE}.${code}/dados/ultimos/${count}?formato=json`;
  let body;
  try {
    body = await fetchSgsBody(url, code);
  } catch(e) {
    throw new Error(e.message || `BCB SGS ${code}: falha de consulta`);
  }
  let rows;
  try { rows = JSON.parse(body); }
  catch { throw new Error(`BCB SGS ${code}: resposta não é JSON: ${body.slice(0,250)}`); }
  if (!Array.isArray(rows)) throw new Error(`BCB SGS ${code}: formato inesperado.`);
  const today = todaySP();
  return rows.map(r => ({
    date:r.data, isoDate:parseDateBR(r.data),
    value:Number(String(r.valor).replace(",","."))
  })).filter(r => Number.isFinite(r.value) && r.isoDate <= today)
    .sort((a,b)=>a.isoDate.localeCompare(b.isoDate));
}
function compoundPct(values) {
  return (values.reduce((f,v)=>f*(1+v/100),1)-1)*100;
}

exports.handler = async () => {
  try {
    const [cdiAnnualRows,cdiDailyRows,selicRows,ipcaRows] = await Promise.all([
      getLast(4389,20),
      getLast(12,20),
      getLast(432,10),
      getLast(433,12)
    ]);
    if (!cdiDailyRows.length) throw new Error("SGS 12 não retornou CDI diário válido.");
    if (!selicRows.length) throw new Error("SGS 432 não retornou observações válidas até hoje.");
    if (ipcaRows.length < 12) throw new Error(`SGS 433 retornou apenas ${ipcaRows.length} meses; são necessários 12.`);

    const daily = cdiDailyRows.at(-1);
    const cdiAnnualFromDaily = (Math.pow(1+daily.value/100,252)-1)*100;
    const annualPublished = cdiAnnualRows.at(-1) || null;
    const diff = annualPublished ? Math.abs(cdiAnnualFromDaily-annualPublished.value) : null;
    const selic = selicRows.at(-1);
    const ipca12 = ipcaRows.slice(-12);

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
        ipca12mPercent:compoundPct(ipca12.map(x=>x.value)),
        ipcaDateStart:ipca12[0].date,
        ipcaDateEnd:ipca12.at(-1).date,
        ipcaMonthlyObservations:ipca12
      },
      diagnostics:{
        cache304RetryEnabled:true,
        requestedCounts:{cdiAnnual:20,cdiDaily:20,selic:10,ipca:12},
        returnedCounts:{cdiAnnual:cdiAnnualRows.length,cdiDaily:cdiDailyRows.length,selic:selicRows.length,ipca:ipcaRows.length}
      },
      methodology:{
        cdi:"SGS 12 anualizado em 252 dias úteis; SGS 4389 usado como conferência.",
        selic:"SGS 432, últimos 10 registros, filtrando datas posteriores à data atual de São Paulo.",
        ipca:"SGS 433, composição geométrica dos últimos 12 meses."
      }
    };
    return {
      statusCode:200,
      headers:{
        "Content-Type":"application/json; charset=utf-8",
        "Cache-Control":"no-store, max-age=0",
        "Pragma":"no-cache",
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

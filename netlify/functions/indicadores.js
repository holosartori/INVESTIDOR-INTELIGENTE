// Netlify Function — indicadores do Banco Central (SGS)
// SGS 4389: CDI anualizado (% a.a., base 252)
// SGS 12: CDI diário (% a.d.)
// SGS 432: meta Selic (% a.a.)
// SGS 433: IPCA mensal (%)

const BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

function parseSgsDate(dateText) {
  const [day, month, year] = dateText.split("/");
  return `${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}`;
}

function todaySaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
}

async function lastValues(code, count) {
  const url = `${BASE}.${code}/dados/ultimos/${count}?formato=json`;
  const response = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!response.ok) throw new Error(`BCB SGS ${code}: HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error(`BCB SGS ${code}: resposta inválida`);
  const today = todaySaoPaulo();
  return data.map(row => ({
    date: row.data,
    isoDate: parseSgsDate(row.data),
    value: Number(String(row.valor).replace(",", "."))
  })).filter(row =>
    Number.isFinite(row.value) && row.isoDate <= today
  ).sort((a,b) => a.isoDate.localeCompare(b.isoDate));
}

function compoundPercent(monthlyRates) {
  return (monthlyRates.reduce((factor, rate) => factor * (1 + rate / 100), 1) - 1) * 100;
}

exports.handler = async function () {
  try {
    const [cdiAnnualSeries, cdiDailySeries, selicSeries, ipcaSeries] = await Promise.all([
      lastValues(4389, 20),
      lastValues(12, 20),
      lastValues(432, 30),
      lastValues(433, 15)
    ]);

    if (!cdiDailySeries.length) throw new Error("Sem observações válidas de CDI diário.");
    if (!selicSeries.length) throw new Error("Sem observações válidas de Selic após filtrar datas futuras.");
    if (ipcaSeries.length < 12) throw new Error("Histórico insuficiente para IPCA acumulado em 12 meses.");

    const cdiDaily = cdiDailySeries[cdiDailySeries.length - 1];
    const cdiAnnualFromDaily = (Math.pow(1 + cdiDaily.value / 100, 252) - 1) * 100;
    const cdiAnnualPublished = cdiAnnualSeries.length
      ? cdiAnnualSeries[cdiAnnualSeries.length - 1]
      : null;
    const cdiDifference = cdiAnnualPublished
      ? Math.abs(cdiAnnualFromDaily - cdiAnnualPublished.value)
      : null;

    const selic = selicSeries[selicSeries.length - 1];
    const ipca12 = ipcaSeries.slice(-12);
    const ipca12mPercent = compoundPercent(ipca12.map(row => row.value));

    const payload = {
      ok: true,
      source: "Banco Central do Brasil — SGS",
      updatedAt: new Date().toISOString(),
      indicators: {
        // CDI exibido vem da taxa diária mais recente, anualizada em 252 dias úteis.
        cdiAnnualPercent: cdiAnnualFromDaily,
        cdiDate: cdiDaily.date,
        cdiDailyPercent: cdiDaily.value,
        cdiDailyDate: cdiDaily.date,
        cdiAnnualPublishedPercent: cdiAnnualPublished ? cdiAnnualPublished.value : null,
        cdiAnnualPublishedDate: cdiAnnualPublished ? cdiAnnualPublished.date : null,
        cdiConsistent: cdiDifference === null ? null : cdiDifference <= 0.03,
        cdiDifferencePp: cdiDifference,
        selicMetaPercent: selic.value,
        selicDate: selic.date,
        ipca12mPercent: ipca12mPercent,
        ipcaDateStart: ipca12[0].date,
        ipcaDateEnd: ipca12[ipca12.length - 1].date,
        ipcaMonthlyObservations: ipca12
      },
      methodology: {
        cdi: "SGS 12: última taxa diária válida, anualizada por (1 + taxa diária)^252 - 1. SGS 4389 é mantida como conferência.",
        selic: "SGS 432: última observação com data não posterior à data atual de São Paulo.",
        ipca: "SGS 433: acumulado de 12 meses calculado por composição geométrica dos 12 últimos meses publicados."
      }
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=900, s-maxage=1800, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(payload)
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
      body: JSON.stringify({ ok: false, error: error.message, source: "Banco Central do Brasil — SGS" })
    };
  }
};

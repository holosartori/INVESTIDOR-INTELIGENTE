// Netlify Function — indicadores oficiais do Banco Central (SGS)
// CDI: SGS 4389 (% a.a., anualizado base 252). Conferência: SGS 12 (% ao dia).
// Selic meta: SGS 432 (% a.a.).
// IPCA: SGS 433 (% mensal); acumulado 12m calculado por composição dos 12 últimos meses.

const BASE = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";

async function lastValues(code, count) {
  const url = `${BASE}.${code}/dados/ultimos/${count}?formato=json`;
  const response = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "InvestidorInteligente/1.0" }
  });
  if (!response.ok) throw new Error(`BCB SGS ${code}: HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error(`BCB SGS ${code}: sem observações`);
  return data.map(row => ({
    date: row.data,
    value: Number(String(row.valor).replace(",", "."))
  })).filter(row => Number.isFinite(row.value));
}

function compoundPercent(monthlyRates) {
  return (monthlyRates.reduce((factor, rate) => factor * (1 + rate / 100), 1) - 1) * 100;
}

exports.handler = async function () {
  try {
    const [cdiAnnualSeries, cdiDailySeries, selicSeries, ipcaSeries] = await Promise.all([
      lastValues(4389, 10),
      lastValues(12, 10),
      lastValues(432, 10),
      lastValues(433, 12)
    ]);

    const cdi = cdiAnnualSeries[cdiAnnualSeries.length - 1];
    const cdiDaily = cdiDailySeries[cdiDailySeries.length - 1];
    const selic = selicSeries[selicSeries.length - 1];
    const ipca12 = ipcaSeries.slice(-12);

    if (ipca12.length < 12) throw new Error("Histórico insuficiente para calcular IPCA acumulado em 12 meses.");

    // Verificação independente: anualiza a última taxa DI diária com base 252.
    const cdiAnnualFromDaily = (Math.pow(1 + cdiDaily.value / 100, 252) - 1) * 100;
    const cdiDifference = Math.abs(cdiAnnualFromDaily - cdi.value);
    const cdiConsistent = cdiDifference <= 0.03; // tolerância de 0,03 p.p. para arredondamentos/divulgação.

    const ipca12m = compoundPercent(ipca12.map(row => row.value));
    const payload = {
      ok: true,
      source: "Banco Central do Brasil — SGS",
      updatedAt: new Date().toISOString(),
      indicators: {
        cdiAnnualPercent: cdi.value,
        cdiDate: cdi.date,
        cdiDailyPercent: cdiDaily.value,
        cdiDailyDate: cdiDaily.date,
        cdiAnnualFromDailyPercent: cdiAnnualFromDaily,
        cdiConsistent,
        cdiDifferencePp: cdiDifference,
        selicMetaPercent: selic.value,
        selicDate: selic.date,
        ipca12mPercent: ipca12,
        ipcaDateStart: ipca12[0].date,
        ipcaDateEnd: ipca12[ipca12.length - 1].date
      },
      methodology: {
        cdi: "SGS 4389: taxa CDI anualizada em % a.a., base 252. Conferida com SGS 12: taxa diária em % a.d.",
        selic: "SGS 432: meta Selic em % a.a.",
        ipca: "SGS 433: variação mensal do IPCA. Acumulado 12 meses calculado por composição geométrica."
      }
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=7200",
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

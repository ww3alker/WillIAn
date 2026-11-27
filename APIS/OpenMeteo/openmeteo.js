const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const OPEN_METEO_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

// Coordenadas padrão (Cascavel - PR) caso a propriedade ainda não tenha lat/lon cadastrados
export const COORDENADAS_PADRAO_AGRO = {
  nome: "Cascavel, PR",
  latitude: -24.9555,
  longitude: -53.4552
};

/**
 * Converte o nome de um município/cidade em latitude e longitude via Open-Meteo Geocoding (gratuito, sem chave).
 */
export async function geocodificarCidadeOpenMeteo(nomeCidade) {
  const termo = String(nomeCidade || "").trim();
  if (!termo) return null;

  const url = `${OPEN_METEO_GEOCODING_URL}?name=${encodeURIComponent(termo)}&count=1&language=pt&format=json`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Erro ao geocodificar cidade (${resp.status})`);
  }

  const dados = await resp.json();
  const primeiro = dados?.results?.[0];
  if (!primeiro) return null;

  const uf = primeiro.admin1 ? `, ${primeiro.admin1}` : "";
  return {
    nome: `${primeiro.name}${uf}`,
    latitude: Number(primeiro.latitude),
    longitude: Number(primeiro.longitude)
  };
}

/**
 * Busca dados reais de chuva em milímetros (mm), evapotranspiração e temperatura
 * usando a API pública Open-Meteo (sem necessidade de API Key).
 */
export async function buscarPluviometriaOpenMeteo({
  latitude,
  longitude,
  cidade
} = {}) {
  let lat = Number(latitude);
  let lon = Number(longitude);
  let localNome = cidade || COORDENADAS_PADRAO_AGRO.nome;

  if ((!Number.isFinite(lat) || !Number.isFinite(lon)) && cidade) {
    const geo = await geocodificarCidadeOpenMeteo(cidade);
    if (geo) {
      lat = geo.latitude;
      lon = geo.longitude;
      localNome = geo.nome;
    }
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    lat = COORDENADAS_PADRAO_AGRO.latitude;
    lon = COORDENADAS_PADRAO_AGRO.longitude;
    localNome = COORDENADAS_PADRAO_AGRO.nome;
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: [
      "precipitation_sum",
      "rain_sum",
      "precipitation_probability_max",
      "temperature_2m_max",
      "temperature_2m_min",
      "et0_fao_evapotranspiration"
    ].join(","),
    hourly: "precipitation,soil_moisture_0_to_1cm",
    past_days: "7",
    forecast_days: "7",
    timezone: "America/Sao_Paulo"
  });

  const resp = await fetch(`${OPEN_METEO_FORECAST_URL}?${params.toString()}`);
  if (!resp.ok) {
    throw new Error(`Falha na API Open-Meteo (${resp.status})`);
  }

  const dados = await resp.json();
  const daily = dados?.daily || {};
  const datas = daily.time || [];
  const precipitacoes = daily.precipitation_sum || [];
  const chuvas = daily.rain_sum || [];
  const probChuva = daily.precipitation_probability_max || [];
  const tempMax = daily.temperature_2m_max || [];
  const tempMin = daily.temperature_2m_min || [];
  const et0 = daily.et0_fao_evapotranspiration || [];

  // Índice 7 corresponde ao dia atual (past_days = 7 => índices 0..6 são os últimos 7 dias, índice 7 é hoje)
  const indiceHoje = Math.min(7, Math.max(0, datas.length - 1));
  const indiceOntem = Math.max(0, indiceHoje - 1);

  const chuvaHojeMm = Number((precipitacoes[indiceHoje] ?? chuvas[indiceHoje] ?? 0).toFixed(1));
  const chuvaOntemMm = Number((precipitacoes[indiceOntem] ?? chuvas[indiceOntem] ?? 0).toFixed(1));

  let acumuladoUltimos7DiasMm = 0;
  for (let i = 0; i <= indiceHoje; i++) {
    acumuladoUltimos7DiasMm += Number(precipitacoes[i] || 0);
  }

  let previsaoProximos7DiasMm = 0;
  for (let i = indiceHoje + 1; i < datas.length; i++) {
    previsaoProximos7DiasMm += Number(precipitacoes[i] || 0);
  }

  const historicoDiario = datas.map((dataIso, idx) => ({
    data: dataIso,
    chuvaMm: Number((precipitacoes[idx] ?? 0).toFixed(1)),
    probabilidadePct: probChuva[idx] ?? 0,
    tempMax: tempMax[idx] ?? null,
    tempMin: tempMin[idx] ?? null,
    et0Mm: et0[idx] ?? null,
    periodo: idx < indiceHoje ? "passado" : idx === indiceHoje ? "hoje" : "previsao"
  }));

  const umidadeSoloAtual = Array.isArray(dados?.hourly?.soil_moisture_0_to_1cm)
    ? dados.hourly.soil_moisture_0_to_1cm.find((v) => typeof v === "number") ?? null
    : null;

  return {
    fonte: "Open-Meteo (Sem API Key)",
    localizacao: {
      nome: localNome,
      latitude: lat,
      longitude: lon
    },
    dataHoje: datas[indiceHoje] || new Date().toISOString().slice(0, 10),
    chuvaHojeMm,
    chuvaOntemMm,
    acumuladoUltimos7DiasMm: Number(acumuladoUltimos7DiasMm.toFixed(1)),
    previsaoProximos7DiasMm: Number(previsaoProximos7DiasMm.toFixed(1)),
    umidadeSoloSuperficial: umidadeSoloAtual,
    historicoDiario
  };
}
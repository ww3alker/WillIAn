// =========================================================================
// ESPN HIDDEN API — CONFIGURADA PARA REGIÃO BRASIL (PT-BR) & 4 DOMÍNIOS
// =========================================================================

export const ESPN_BRASIL_CONFIG = {
  lang: "pt",
  region: "br",
  timeZone: "America/Sao_Paulo"
};

export const ESPN_DOMAINS = {
  SITE: "https://site.api.espn.com/apis/site/v2/sports",
  SITE_V2: "https://site.api.espn.com/apis/v2/sports",
  SITE_HEADER: "https://site.api.espn.com/apis/site/v2/leagues/header",
  CORE: "https://sports.core.api.espn.com/v2/sports",
  WEB_COMMON: "https://site.web.api.espn.com/apis/common/v3/sports",
  WEB_SEARCH: "https://site.web.api.espn.com/apis/common/v3/search",
  CDN: "https://cdn.espn.com/core"
};

function aplicarRegiaoBrasil(urlString) {
  try {
    const url = new URL(urlString);
    if (!url.searchParams.has("lang")) {
      url.searchParams.set("lang", ESPN_BRASIL_CONFIG.lang);
    }
    if (!url.searchParams.has("region")) {
      url.searchParams.set("region", ESPN_BRASIL_CONFIG.region);
    }
    return url.toString();
  } catch {
    return urlString;
  }
}

export const LIGAS_POPULARES_ESPN = [
  { id: "bra.1", esporte: "soccer", liga: "bra.1", nome: "Brasileirão Série A", sigla: "BRA A" },
  { id: "bra.2", esporte: "soccer", liga: "bra.2", nome: "Brasileirão Série B", sigla: "BRA B" },
  { id: "bra.copa_do_brazil", esporte: "soccer", liga: "bra.copa_do_brazil", nome: "Copa do Brasil", sigla: "CDB" },
  { id: "conmebol.libertadores", esporte: "soccer", liga: "conmebol.libertadores", nome: "Libertadores", sigla: "LIB" },
  { id: "conmebol.sudamericana", esporte: "soccer", liga: "conmebol.sudamericana", nome: "Sul-Americana", sigla: "SULA" },
  { id: "bra.camp.paulista", esporte: "soccer", liga: "bra.camp.paulista", nome: "Paulistão", sigla: "PAUL" },
  { id: "bra.camp.carioca", esporte: "soccer", liga: "bra.camp.carioca", nome: "Carioca", sigla: "CAR" },
  { id: "uefa.champions", esporte: "soccer", liga: "uefa.champions", nome: "Champions League", sigla: "UCL" },
  { id: "eng.1", esporte: "soccer", liga: "eng.1", nome: "Premier League", sigla: "ENG" },
  { id: "esp.1", esporte: "soccer", liga: "esp.1", nome: "LaLiga", sigla: "ESP" },
  { id: "nba", esporte: "basketball", liga: "nba", nome: "NBA", sigla: "NBA" },
  { id: "nfl", esporte: "football", liga: "nfl", nome: "NFL", sigla: "NFL" }
];

export const ESPN_ENDPOINTS = {
  site: {
    baseUrl: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}`),
    scoreboard: ({ esporte, liga, dates, week, seasontype, groups } = {}) => {
      const url = new URL(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}/scoreboard`);
      if (dates) url.searchParams.set("dates", dates);
      if (week) url.searchParams.set("week", week);
      if (seasontype) url.searchParams.set("seasontype", seasontype);
      if (groups) url.searchParams.set("groups", groups);
      return aplicarRegiaoBrasil(url.toString());
    },
    summary: ({ esporte, liga, eventId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.SITE}/${esporte}/${liga}/summary?event=${encodeURIComponent(eventId)}`
      ),
    news: ({ esporte, liga, limit = 25 }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}/news?limit=${limit}`),
    teams: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}/teams`),
    teamDetails: ({ esporte, liga, teamId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}/teams/${teamId}`),
    teamRoster: ({ esporte, liga, teamId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}/teams/${teamId}/roster`),
    teamSchedule: ({ esporte, liga, teamId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}/teams/${teamId}/schedule`),
    teamStatistics: ({ esporte, liga, teamId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}/teams/${teamId}/statistics`),
    injuries: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}/injuries`),
    transactions: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}/transactions`),
    rankings: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}/rankings`),
    leaders: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.SITE}/${esporte}/${liga}/leaders`),
    standings: ({ esporte, liga, season }) => {
      const url = new URL(`${ESPN_DOMAINS.SITE_V2}/${esporte}/${liga}/standings`);
      if (season) url.searchParams.set("season", season);
      return aplicarRegiaoBrasil(url.toString());
    },
    globalHeader: () => aplicarRegiaoBrasil(ESPN_DOMAINS.SITE_HEADER)
  },

  core: {
    baseUrl: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}`),
    sportsRoot: () => aplicarRegiaoBrasil(ESPN_DOMAINS.CORE),
    leagueMeta: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}`),
    seasons: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons`),
    seasonDetails: ({ esporte, liga, ano }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}`),
    seasonType: ({ esporte, liga, ano, tipo = 2 }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/types/${tipo}`),
    weeks: ({ esporte, liga, ano, tipo = 2 }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/types/${tipo}/weeks`),
    groups: ({ esporte, liga, ano, tipo = 2 }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/types/${tipo}/groups`),
    groupStandings: ({ esporte, liga, ano, tipo = 2, grupoId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/types/${tipo}/groups/${grupoId}/standings`
      ),
    awards: ({ esporte, liga, ano }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/awards`),
    draft: ({ esporte, liga, ano }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/draft`),
    events: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events`),
    weekEvents: ({ esporte, liga, ano, tipo = 2, semana }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/types/${tipo}/weeks/${semana}/events`
      ),
    venues: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/venues`),
    franchises: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/franchises`),
    positions: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/positions`),
    calendarWhitelist: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/calendar/whitelist`),
    calendarBlacklist: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/calendar/blacklist`),
    competitionMeta: ({ esporte, liga, eventId, compId = eventId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}`
      ),
    status: ({ esporte, liga, eventId, compId = eventId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/status`
      ),
    situation: ({ esporte, liga, eventId, compId = eventId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/situation`
      ),
    plays: ({ esporte, liga, eventId, compId = eventId, limit = 500 }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/plays?limit=${limit}`
      ),
    drives: ({ esporte, liga, eventId, compId = eventId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/drives`
      ),
    probabilities: ({ esporte, liga, eventId, compId = eventId, limit = 500 }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/probabilities?limit=${limit}`
      ),
    odds: ({ esporte, liga, eventId, compId = eventId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/odds`
      ),
    oddsMovement: ({ esporte, liga, eventId, compId = eventId, providerId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/odds/${providerId}/history/0/movement`
      ),
    predictor: ({ esporte, liga, eventId, compId = eventId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/predictor`
      ),
    officials: ({ esporte, liga, eventId, compId = eventId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/officials`
      ),
    broadcasts: ({ esporte, liga, eventId, compId = eventId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/broadcasts`
      ),
    matchLeaders: ({ esporte, liga, eventId, compId = eventId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/leaders`
      ),
    series: ({ esporte, liga, eventId, compId = eventId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/series`
      ),
    competitorRoster: ({ esporte, liga, eventId, compId = eventId, teamId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/competitors/${teamId}/roster`
      ),
    competitorStatistics: ({ esporte, liga, eventId, compId = eventId, teamId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/competitors/${teamId}/statistics`
      ),
    competitorLinescores: ({ esporte, liga, eventId, compId = eventId, teamId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/competitors/${teamId}/linescores`
      ),
    competitorRecord: ({ esporte, liga, eventId, compId = eventId, teamId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/events/${eventId}/competitions/${compId}/competitors/${teamId}/record`
      ),
    teamsIndex: ({ esporte, liga, limit = 1000 }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/teams?limit=${limit}`),
    seasonTeamAthletes: ({ esporte, liga, ano, teamId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/teams/${teamId}/athletes`
      ),
    depthCharts: ({ esporte, liga, ano, teamId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/teams/${teamId}/depthcharts`
      ),
    seasonTeamStatistics: ({ esporte, liga, ano, tipo = 2, teamId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/types/${tipo}/teams/${teamId}/statistics`
      ),
    athletesIndex: ({ esporte, liga, limit = 1000 }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/athletes?limit=${limit}`),
    athleteProfile: ({ esporte, liga, athleteId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/athletes/${athleteId}`),
    athleteSeasonStatistics: ({ esporte, liga, ano, tipo = 2, athleteId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/types/${tipo}/athletes/${athleteId}/statistics`
      ),
    athleteEventLog: ({ esporte, liga, ano, tipo = 2, athleteId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/types/${tipo}/athletes/${athleteId}/eventlog`
      ),
    athleteProjections: ({ esporte, liga, ano, tipo = 2, athleteId }) =>
      aplicarRegiaoBrasil(
        `${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/seasons/${ano}/types/${tipo}/athletes/${athleteId}/projections`
      ),
    coaches: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/coaches`),
    coachDetails: ({ esporte, liga, coachId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CORE}/${esporte}/leagues/${liga}/coaches/${coachId}`)
  },

  webCommon: {
    baseUrl: ({ esporte, liga }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.WEB_COMMON}/${esporte}/${liga}`),
    athleteOverview: ({ esporte, liga, athleteId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.WEB_COMMON}/${esporte}/${liga}/athletes/${athleteId}/overview`),
    athleteSplits: ({ esporte, liga, athleteId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.WEB_COMMON}/${esporte}/${liga}/athletes/${athleteId}/splits`),
    athleteGamelog: ({ esporte, liga, athleteId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.WEB_COMMON}/${esporte}/${liga}/athletes/${athleteId}/gamelog`),
    athleteStats: ({ esporte, liga, athleteId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.WEB_COMMON}/${esporte}/${liga}/athletes/${athleteId}/stats`),
    globalSearch: ({ termo, limit = 20 }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.WEB_SEARCH}?query=${encodeURIComponent(termo)}&limit=${limit}`)
  },

  cdn: {
    scoreboard: ({ liga }) => aplicarRegiaoBrasil(`${ESPN_DOMAINS.CDN}/${liga}/scoreboard?xhr=1`),
    game: ({ liga, eventId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CDN}/${liga}/game?xhr=1&gameId=${encodeURIComponent(eventId)}`),
    boxscore: ({ liga, eventId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CDN}/${liga}/boxscore?xhr=1&gameId=${encodeURIComponent(eventId)}`),
    playbyplay: ({ liga, eventId }) =>
      aplicarRegiaoBrasil(`${ESPN_DOMAINS.CDN}/${liga}/playbyplay?xhr=1&gameId=${encodeURIComponent(eventId)}`),
    standings: ({ liga }) => aplicarRegiaoBrasil(`${ESPN_DOMAINS.CDN}/${liga}/standings?xhr=1`)
  }
};

export const CATALOGO_ROTAS_ESPN = [
  {
    dominio: "1. Site API Brasil (Tempo Real)",
    id: "site.scoreboard",
    nome: "Placares e Jogos do Dia (/scoreboard?lang=pt&region=br)",
    builder: (p) => ESPN_ENDPOINTS.site.scoreboard(p)
  },
  {
    dominio: "1. Site API Brasil (Tempo Real)",
    id: "site.summary",
    nome: "Resumo & Escalações da Partida (/summary?event=)",
    builder: (p) => ESPN_ENDPOINTS.site.summary(p)
  },
  {
    dominio: "1. Site API Brasil (Tempo Real)",
    id: "site.standings",
    nome: "Classificação Geral (/standings)",
    builder: (p) => ESPN_ENDPOINTS.site.standings(p)
  },
  {
    dominio: "1. Site API Brasil (Tempo Real)",
    id: "site.news",
    nome: "Notícias ESPN Brasil (/news)",
    builder: (p) => ESPN_ENDPOINTS.site.news(p)
  },
  {
    dominio: "1. Site API Brasil (Tempo Real)",
    id: "site.teams",
    nome: "Times da Liga (/teams)",
    builder: (p) => ESPN_ENDPOINTS.site.teams(p)
  },
  {
    dominio: "2. Core API (Banco Profundo)",
    id: "core.plays",
    nome: "Lance a Lance Completo (/plays?limit=500)",
    builder: (p) => ESPN_ENDPOINTS.core.plays(p)
  },
  {
    dominio: "2. Core API (Banco Profundo)",
    id: "core.odds",
    nome: "Odds e Probabilidades (/odds)",
    builder: (p) => ESPN_ENDPOINTS.core.odds(p)
  },
  {
    dominio: "3. Web Common API (Busca Brasil)",
    id: "webCommon.globalSearch",
    nome: "Busca Global na ESPN Brasil (/search?query=)",
    builder: (p) => ESPN_ENDPOINTS.webCommon.globalSearch(p)
  }
];

export async function fetchEspnJson(url, options = {}) {
  const safeUrl = aplicarRegiaoBrasil(url.replace(/^http:\/\//i, "https://"));
  try {
    const resp = await fetch(safeUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      ...options
    });

    if (!resp.ok) {
      throw new Error(`ESPN API HTTP ${resp.status} em ${safeUrl}`);
    }
    return resp.json();
  } catch (erroDireto) {
    if (typeof window !== "undefined" && window.location?.origin?.startsWith("http")) {
      const proxyResp = await fetch(`/api/proxy/espn?url=${encodeURIComponent(safeUrl)}`);
      if (proxyResp.ok) {
        return proxyResp.json();
      }
    }
    throw erroDireto;
  }
}

export async function resolverRefEspn(objetoOuRef) {
  const refUrl = typeof objetoOuRef === "string" ? objetoOuRef : objetoOuRef?.$ref;
  if (!refUrl) return objetoOuRef;
  return fetchEspnJson(refUrl);
}

export function formatarDataHoraBrasil(isoString) {
  if (!isoString) return "";
  try {
    return new Date(isoString).toLocaleString("pt-BR", {
      timeZone: ESPN_BRASIL_CONFIG.timeZone,
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return isoString;
  }
}

export async function buscarPlacarLiga({ esporte, liga, dates, week, seasontype } = {}) {
  const url = ESPN_ENDPOINTS.site.scoreboard({ esporte, liga, dates, week, seasontype });
  const data = await fetchEspnJson(url);
  return {
    url,
    ligaNome: data?.leagues?.[0]?.name || liga,
    temporada: data?.leagues?.[0]?.season?.displayName || "",
    eventos: data?.events || []
  };
}

export async function buscarResumoPartida({ esporte, liga, eventId }) {
  const url = ESPN_ENDPOINTS.site.summary({ esporte, liga, eventId });
  const data = await fetchEspnJson(url);
  return { url, data };
}

export async function buscarEscalacaoPartida({ esporte, liga, eventId }) {
  const { url, data } = await buscarResumoPartida({ esporte, liga, eventId });
  const rostersBrutos = data?.rosters || [];
  const headerComp = data?.header?.competitions?.[0];
  const competitors = headerComp?.competitors || [];

  const equipes = rostersBrutos.map((r, idx) => {
    const compInfo =
      competitors.find((c) => c.team?.id === r.team?.id) || competitors[idx] || {};
    const jogadores = (r.roster || []).map((atleta) => ({
      nome: atleta.athlete?.displayName || atleta.athlete?.fullName || "Jogador",
      camisa: atleta.jersey || "",
      posicao: atleta.position?.abbreviation || atleta.position?.displayName || "",
      titular: Boolean(atleta.starter),
      capitao: Boolean(atleta.captain),
      substituido: Boolean(atleta.subbedOut),
      entrou: Boolean(atleta.subbedIn)
    }));

    const titulares = jogadores.filter((j) => j.titular);
    const reservas = jogadores.filter((j) => !j.titular);

    return {
      teamId: r.team?.id || compInfo.team?.id || String(idx),
      nome: r.team?.displayName || compInfo.team?.displayName || "Equipe",
      sigla: r.team?.abbreviation || compInfo.team?.abbreviation || "",
      logo: r.team?.logo || compInfo.team?.logo || "",
      homeAway: r.homeAway || compInfo.homeAway || (idx === 0 ? "home" : "away"),
      formacao: r.formation || "",
      tecnico: r.coach?.displayName || "",
      titulares: titulares.length > 0 ? titulares : jogadores.slice(0, 11),
      reservas: titulares.length > 0 ? reservas : jogadores.slice(11)
    };
  });

  const lancesChave = (data?.keyEvents || []).slice(0, 10).map((k) => ({
    tempo: k.clock?.displayValue || "",
    tipo: k.type?.text || "",
    texto: k.text || ""
  }));

  return {
    url,
    eventId,
    equipes,
    lancesChave,
    estadio: data?.gameInfo?.venue?.fullName || ""
  };
}

export async function buscarClassificacaoLiga({ esporte, liga, season }) {
  const url = ESPN_ENDPOINTS.site.standings({ esporte, liga, season });
  const data = await fetchEspnJson(url);
  return { url, data };
}

export async function buscarTimesLiga({ esporte, liga }) {
  const url = ESPN_ENDPOINTS.site.teams({ esporte, liga });
  const data = await fetchEspnJson(url);
  const teams = data?.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team) || [];
  return { url, teams };
}

export async function buscarElencoTime({ esporte, liga, teamId }) {
  const url = ESPN_ENDPOINTS.site.teamRoster({ esporte, liga, teamId });
  const data = await fetchEspnJson(url);
  return { url, data };
}

export async function buscarNoticiasLiga({ esporte, liga, limit = 20 }) {
  const url = ESPN_ENDPOINTS.site.news({ esporte, liga, limit });
  const data = await fetchEspnJson(url);
  return { url, articles: data?.articles || [] };
}

export async function buscarLanceALanceCore({ esporte, liga, eventId, limit = 250 }) {
  const url = ESPN_ENDPOINTS.core.plays({ esporte, liga, eventId, limit });
  const data = await fetchEspnJson(url);
  return { url, items: data?.items || [] };
}

export async function buscarOddsEProbabilidades({ esporte, liga, eventId }) {
  const [oddsRes, probRes, predRes] = await Promise.allSettled([
    fetchEspnJson(ESPN_ENDPOINTS.core.odds({ esporte, liga, eventId })),
    fetchEspnJson(ESPN_ENDPOINTS.core.probabilities({ esporte, liga, eventId, limit: 100 })),
    fetchEspnJson(ESPN_ENDPOINTS.core.predictor({ esporte, liga, eventId }))
  ]);

  return {
    odds: oddsRes.status === "fulfilled" ? oddsRes.value : null,
    probabilities: probRes.status === "fulfilled" ? probRes.value : null,
    predictor: predRes.status === "fulfilled" ? predRes.value : null
  };
}

/**
 * Coleta dados reais da ESPN Brasil quando a pergunta envolve jogos/rodada/classificação atual
 */
export async function coletarContextoEsportivoParaIA({
  esportePadrao = "soccer",
  ligaPadrao = "bra.1",
  pergunta = ""
} = {}) {
  const texto = pergunta.toLowerCase();
  let esporte = esportePadrao;
  let liga = ligaPadrao;

  if (texto.includes("série b") || texto.includes("serie b")) {
    esporte = "soccer";
    liga = "bra.2";
  } else if (texto.includes("copa do brasil")) {
    esporte = "soccer";
    liga = "bra.copa_do_brazil";
  } else if (texto.includes("libertadores")) {
    esporte = "soccer";
    liga = "conmebol.libertadores";
  } else if (texto.includes("sul-americana") || texto.includes("sul americana")) {
    esporte = "soccer";
    liga = "conmebol.sudamericana";
  } else if (texto.includes("paulist")) {
    esporte = "soccer";
    liga = "bra.camp.paulista";
  } else if (texto.includes("carioca")) {
    esporte = "soccer";
    liga = "bra.camp.carioca";
  } else if (texto.includes("champions")) {
    esporte = "soccer";
    liga = "uefa.champions";
  } else if (texto.includes("premier")) {
    esporte = "soccer";
    liga = "eng.1";
  } else if (texto.includes("laliga") || texto.includes("espanhol")) {
    esporte = "soccer";
    liga = "esp.1";
  } else if (texto.includes("italiano") || texto.includes("serie a")) {
    esporte = "soccer";
    liga = "ita.1";
  } else if (texto.includes("bundesliga") || texto.includes("alemão")) {
    esporte = "soccer";
    liga = "ger.1";
  } else if (texto.includes("nba") || texto.includes("basquete")) {
    esporte = "basketball";
    liga = "nba";
  } else if (texto.includes("nfl") || texto.includes("futebol americano")) {
    esporte = "football";
    liga = "nfl";
  } else if (texto.includes("brasileir") || texto.includes("série a")) {
    esporte = "soccer";
    liga = "bra.1";
  }

  try {
    const [placarRes, noticiasRes, tabelaRes] = await Promise.allSettled([
      buscarPlacarLiga({ esporte, liga }),
      buscarNoticiasLiga({ esporte, liga, limit: 6 }),
      buscarClassificacaoLiga({ esporte, liga })
    ]);

    const ligaNome =
      placarRes.status === "fulfilled" ? placarRes.value.ligaNome : `${esporte}/${liga}`;
    const eventos = placarRes.status === "fulfilled" ? placarRes.value.eventos : [];
    const noticias = noticiasRes.status === "fulfilled" ? noticiasRes.value.articles : [];

    const resumoJogos = eventos.slice(0, 12).map((ev) => {
      const comp = ev.competitions?.[0];
      const times = comp?.competitors || [];
      const casa = times.find((t) => t.homeAway === "home") || times[0];
      const fora = times.find((t) => t.homeAway === "away") || times[1];
      const estado = ev.status?.type?.state;
      const statusDesc = ev.status?.type?.shortDetail || ev.status?.type?.description || "";
      return {
        id: ev.id,
        estado,
        status: statusDesc,
        horarioBrasilia: formatarDataHoraBrasil(ev.date),
        mandante: casa?.team?.displayName || "Mandante",
        placarMandante: casa?.score ?? "-",
        visitante: fora?.team?.displayName || "Visitante",
        placarVisitante: fora?.score ?? "-",
        estadio: comp?.venue?.fullName || ""
      };
    });

    let escalacoesDestaque = [];
    const jogoAlvo =
      eventos.find((e) => e.status?.type?.state === "in") ||
      (texto.includes("escal") || texto.includes("titular") || texto.includes("hoje")
        ? eventos[0]
        : null);

    if (jogoAlvo) {
      try {
        const esc = await buscarEscalacaoPartida({ esporte, liga, eventId: jogoAlvo.id });
        escalacoesDestaque = esc.equipes.map((eq) => ({
          time: eq.nome,
          formacao: eq.formacao,
          tecnico: eq.tecnico,
          titulares: eq.titulares.map((j) => `${j.camisa ? `#${j.camisa} ` : ""}${j.nome} (${j.posicao})`)
        }));
      } catch {}
    }

    let classificacaoTop = [];
    if (tabelaRes.status === "fulfilled") {
      const entries =
        tabelaRes.value.data?.children?.[0]?.standings?.entries ||
        tabelaRes.value.data?.standings?.entries ||
        [];
      classificacaoTop = entries.slice(0, 10).map((entry, idx) => {
        const getS = (n) =>
          entry.stats?.find((s) => s.name === n || s.abbreviation === n)?.displayValue ?? "-";
        return `${idx + 1}º ${entry.team?.displayName}: ${getS("points")} pts (${getS("gamesPlayed")}J, ${getS("wins")}V, SG ${getS("pointDifferential")})`;
      });
    }

    const resumoNoticias = noticias.slice(0, 5).map((n) => `- ${n.headline}: ${n.description || ""}`);

    return {
      esporte,
      liga,
      ligaNome,
      textoContexto: [
        `Liga de referência (ESPN Brasil): ${ligaNome}`,
        `Data/Hora (Brasília): ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`,
        resumoJogos.length
          ? `Jogos/Placares:\n${resumoJogos
              .map(
                (j) =>
                  `• [${j.estado === "in" ? "AO VIVO" : j.estado === "pre" ? "PRÉ-JOGO" : "ENCERRADO"}] ${j.mandante} ${j.placarMandante} x ${j.placarVisitante} ${j.visitante} (${j.status} - ${j.horarioBrasilia})`
              )
              .join("\n")}`
          : "",
        escalacoesDestaque.length
          ? `Escalações:\n${escalacoesDestaque
              .map((e) => `• ${e.time}: ${e.titulares.join(", ") || "Não divulgada"}`)
              .join("\n")}`
          : "",
        classificacaoTop.length ? `Classificação:\n${classificacaoTop.join("\n")}` : "",
        resumoNoticias.length ? `Notícias recentes:\n${resumoNoticias.join("\n")}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    };
  } catch {
    return { esporte, liga, ligaNome: liga, textoContexto: "" };
  }
}
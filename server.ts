/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import fs from 'fs';

// Load environment variables from standard .env file
dotenv.config();

// Precedence loader: prioritize any FOOTBALL_API_KEY specified in local files .env or .env.example
// so that user edits in the direct browser file explorer are honored immediately.
// BUT do not overwrite a valid, existing process.env.FOOTBALL_API_KEY unless a stronger local key in .env exists.
function loadLocalFootballApiKey() {
  const envPath = path.join(process.cwd(), '.env');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  // Clean process.env.FOOTBALL_API_KEY first if present
  if (process.env.FOOTBALL_API_KEY) {
    process.env.FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY.trim().replace(/^["']|["']$/g, '');
  }

  const existingEnvKey = process.env.FOOTBALL_API_KEY;
  const isExistingPlaceholder = !existingEnvKey || 
    existingEnvKey === 'YOUR_FOOTBALL_API_KEY' || 
    existingEnvKey === 'MY_FOOTBALL_API_KEY';

  let keyFromFile: string | null = null;
  let loadedFrom = '';

  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^FOOTBALL_API_KEY\s*=\s*(.*)$/m);
      if (match && match[1]) {
        keyFromFile = match[1].trim();
        loadedFrom = '.env';
      }
    } catch (e) {
      console.error("Error reading .env:", e);
    }
  }

  // Only read from env.example as a worst-case scenario if no .env can be read AND there is no existing env key
  if (!keyFromFile && isExistingPlaceholder && fs.existsSync(envExamplePath)) {
    try {
      const content = fs.readFileSync(envExamplePath, 'utf8');
      const match = content.match(/^FOOTBALL_API_KEY\s*=\s*(.*)$/m);
      if (match && match[1]) {
        const val = match[1].trim();
        // Do not load suspended test key as a primary key override if we can avoid it
        if (val && val !== 'YOUR_FOOTBALL_API_KEY' && val !== 'MY_FOOTBALL_API_KEY') {
          keyFromFile = val;
          loadedFrom = '.env.example';
        }
      }
    } catch (e) {
      console.error("Error reading .env.example:", e);
    }
  }

  if (keyFromFile) {
    keyFromFile = keyFromFile.replace(/^["']|["']$/g, '').trim();
    const isFilePlaceholder = keyFromFile === 'YOUR_FOOTBALL_API_KEY' || keyFromFile === 'MY_FOOTBALL_API_KEY';
    
    if (keyFromFile && !isFilePlaceholder) {
      // If we have an existing functional env key and we are trying to load from .env.example, keep the process.env!
      if (!isExistingPlaceholder && loadedFrom === '.env.example') {
        console.log(`[Env Loader] Retaining existing injected FOOTBALL_API_KEY (${existingEnvKey?.slice(0, 4)}...) over ${loadedFrom} placeholder.`);
        return;
      }
      
      console.log(`[Env Loader] Prioritizing FOOTBALL_API_KEY from ${loadedFrom} file: ${keyFromFile.slice(0, 4)}...${keyFromFile.slice(-4)}`);
      process.env.FOOTBALL_API_KEY = keyFromFile;
    }
  }
}

loadLocalFootballApiKey();



// Helper for fetching with a timeout to prevent hanging connections
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Reusable function to fetch directly from API-Football (api-sports.io or RapidAPI fallback)
async function fetchFromApiFootball(endpoint: string, queryParams: Record<string, string | number> = {}) {
  let apiKey = process.env.FOOTBALL_API_KEY;
  if (apiKey) {
    apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
  }
  if (!apiKey || apiKey === 'YOUR_FOOTBALL_API_KEY' || apiKey === 'MY_FOOTBALL_API_KEY') {
    throw new Error("FOOTBALL_API_KEY non configurée.");
  }

  const urlParams = new URLSearchParams();
  Object.entries(queryParams).forEach(([k, v]) => {
    urlParams.set(k, String(v));
  });
  const queryStr = urlParams.toString();

  // Test direct API-Sports first, which is standard when purchasing from api-football.com
  const isRapidApiKey = (process.env.FOOTBALL_API_PROVIDER || 'apifootball') === 'rapidapi';
  
  let url = `https://v3.football.api-sports.io/${endpoint}${queryStr ? '?' + queryStr : ''}`;
  let headers: Record<string, string> = {
    'x-apisports-key': apiKey
  };

  if (isRapidApiKey) {
    url = `https://api-football-v1.p.rapidapi.com/v3/${endpoint}${queryStr ? '?' + queryStr : ''}`;
    headers = {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
    };
  }

  console.log(`[API-Football] Fetching from: ${url} with a 30s timeout...`);
  const startTime = Date.now();
  let response;
  try {
    response = await fetchWithTimeout(url, { headers }, 30000);
    const duration = Date.now() - startTime;
    console.log(`[API-Football] Received response from ${endpoint} in ${duration}ms (status HTTP: ${response.status})`);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    console.error(`[API-Football] Request failed after ${duration}ms: ${err.message}`);
    throw err;
  }

  if (!response.ok) {
    let errMsg = `HTTP Error ${response.status} ${response.statusText}`;
    throw new Error(errMsg);
  }

  const data = await response.json();
  if (data.errors && Object.keys(data.errors).length > 0 && !data.errors.rateLimit) {
    const apiError = JSON.stringify(data.errors);
    console.error(`[API-Football] API returned errors:`, apiError);
    // Extra guard: sometimes api-football returns warning warnings as errors
    if (Object.keys(data.errors).some(k => k.toLowerCase().includes('token') || k.toLowerCase().includes('key') || k.toLowerCase().includes('plan'))) {
      throw new Error(`Erreur d'authentification ou d'abonnement : ${apiError}`);
    }
  }

  return data;
}

// Helper to get beautiful custom colors based on team name
function getTeamColor(teamName: string, isHome: boolean): { color: string, textColor: string } {
  if (!teamName || typeof teamName !== 'string') {
    return {
      color: isHome ? "#EF4444" : "#2563EB",
      textColor: "#FFFFFF"
    };
  }
  const norm = teamName.toLowerCase();
  if (norm.includes('chelsea') || norm.includes('france') || norm.includes('italie') || norm.includes('italy')) {
    return { color: "#2563EB", textColor: "#FFFFFF" }; // Blue
  }
  if (norm.includes('real madrid')) {
    return { color: "#F8FAFC", textColor: "#0F172A" }; // Slate/White
  }
  if (norm.includes('barcelona') || norm.includes('barcelone')) {
    return { color: "#A21CAF", textColor: "#FEF08A" }; // Blaugrana / Yellow
  }
  if (norm.includes('liverpool') || norm.includes('arsenal') || norm.includes('espagne') || norm.includes('spain') || norm.includes('portugal') || norm.includes('belgique') || norm.includes('belgium')) {
    return { color: "#DC2626", textColor: "#FFFFFF" }; // Red
  }
  if (norm.includes('manchester city') || norm.includes('man. city') || norm.includes('mancity')) {
    return { color: "#38BDF8", textColor: "#0F172A" }; // Sky Blue
  }
  if (norm.includes('dortmund') || norm.includes('brésil') || norm.includes('brazil') || norm.includes('colombie') || norm.includes('colombia')) {
    return { color: "#EAB308", textColor: "#0F172A" }; // Yellow
  }
  if (norm.includes('celtics') || norm.includes('vert') || norm.includes('green') || norm.includes('grorud') || norm.includes('mexique') || norm.includes('mexico')) {
    return { color: "#15803D", textColor: "#FFFFFF" }; // Green
  }
  // Default fallbacks
  return {
    color: isHome ? "#EF4444" : "#2563EB",
    textColor: "#FFFFFF"
  };
}

// Maps API-Football raw matches response format into our frontend schema
function mapApiSportsFixtures(fixtures: any[]): any[] {
  if (!fixtures || !Array.isArray(fixtures)) return [];
  return fixtures.map((f: any) => {
    const fixtureId = String(f.fixture?.id || Math.random());
    const compName = f.league?.name || "Compétition";
    
    const homeTeam = f.teams?.home || {};
    const awayTeam = f.teams?.away || {};
    
    const homeScore = f.goals?.home ?? 0;
    const awayScore = f.goals?.away ?? 0;
    
    const elapsed = f.fixture?.status?.elapsed ?? 0;
    const shortStatus = f.fixture?.status?.short;
    
    // Status mapping
    let statusStr = 'UPCOMING';
    if (['1H', '2H', 'ET', 'P', 'BT'].includes(shortStatus)) {
      statusStr = 'IN_PLAY';
    } else if (shortStatus === 'HT') {
      statusStr = 'HALF_TIME';
    } else if (['FT', 'AET', 'PEN'].includes(shortStatus)) {
      statusStr = 'FINISHED';
    } else if (shortStatus === 'PST') {
      statusStr = 'POSTPONED';
    } else if (shortStatus === 'CAN') {
      statusStr = 'CANCELLED';
    } else if (shortStatus === 'SUSP') {
      statusStr = 'PAUSED';
    }

    const homeColors = getTeamColor(homeTeam.name || '', true);
    const awayColors = getTeamColor(awayTeam.name || '', false);

    // Mapped events
    const rawEvents = f.events || [];
    const mappedEvents = rawEvents.map((evt: any) => {
      let type = 'foul';
      const rawType = String(evt.type || 'foul').toLowerCase();
      const detail = String(evt.detail || '').toLowerCase();

      if (rawType.includes('goal')) {
        if (detail.includes('missed') || detail.includes('miss') || detail.includes('raté')) {
          type = 'missed_penalty';
        } else {
          type = 'goal';
        }
      } else if (rawType.includes('card')) {
        if (detail.includes('red')) {
          type = 'red_card';
        } else {
          type = 'yellow_card';
        }
      } else if (rawType.includes('subst') || rawType.includes('sub')) {
        type = 'substitution';
      } else if (rawType.includes('foul')) {
        type = 'foul';
      }

      const minute = evt.time?.elapsed ?? 0;
      const player = evt.player?.name || 'Joueur';
      const teamLabel = evt.team?.id === homeTeam.id ? 'home' : 'away';
      const detailStr = evt.detail ? ` (${evt.detail})` : '';
      
      let description = '';
      if (type === 'goal') {
        description = `⚽ BUT ! par ${player}${detailStr} - ${minute}'`;
      } else if (type === 'missed_penalty') {
        description = `❌ Penalty manqué par ${player} ${detailStr} - ${minute}'`;
      } else {
        description = `Action par ${player}${detailStr} - ${minute}'`;
      }

      return {
        id: `evt-${Math.random()}`,
        type,
        minute,
        second: 0,
        team: teamLabel,
        player,
        description
      };
    });

    return {
      id: fixtureId,
      competition: compName,
      homeTeam: {
        name: homeTeam.name || "Équipe Domicile",
        code: homeTeam.name?.slice(0, 3).toUpperCase() || "DOM",
        shortName: homeTeam.name || "Domicile",
        logoUrl: homeTeam.logo || "⚽",
        color: homeColors.color,
        textColor: homeColors.textColor,
        apiTeamId: homeTeam.id
      },
      awayTeam: {
        name: awayTeam.name || "Équipe Extérieur",
        code: awayTeam.name?.slice(0, 3).toUpperCase() || "EXT",
        shortName: awayTeam.name || "Extérieur",
        logoUrl: awayTeam.logo || "⚽",
        color: awayColors.color,
        textColor: awayColors.textColor,
        apiTeamId: awayTeam.id
      },
      homeScore,
      awayScore,
      minute: elapsed,
      status: statusStr,
      shortStatus: shortStatus || '',
      extraTime: f.fixture?.status?.extra ?? null,
      date: f.fixture?.date || "",
      events: mappedEvents,
      stats: f.statistics || null,
      hasRealStats: true,
      hasRealLineups: true
    };
  });
}

// Maps team statistics
function mapApiSportsStats(statsArray: any[]): { home: any, away: any, hasStats: boolean } {
  const defaultStats = {
    possession: 50,
    shots: 0,
    shotsOnTarget: 0,
    corners: 0,
    fouls: 0,
    yellowCards: 0,
    redCards: 0
  };

  if (!statsArray || !Array.isArray(statsArray) || statsArray.length < 2) {
    return { home: defaultStats, away: defaultStats, hasStats: false };
  }

  const findStat = (statsList: any[], typeName: string): number => {
    const found = statsList.find((s: any) => String(s.type).toLowerCase() === typeName.toLowerCase());
    if (!found || found.value === null || found.value === undefined) return 0;
    if (typeof found.value === 'string' && found.value.endsWith('%')) {
      return parseInt(found.value) || 0;
    }
    return parseInt(found.value) || 0;
  };

  const homeStatsRaw = statsArray[0]?.statistics || [];
  const awayStatsRaw = statsArray[1]?.statistics || [];

  const homeMapped = {
    possession: findStat(homeStatsRaw, 'Ball Possession') || 50,
    shots: findStat(homeStatsRaw, 'Total Shots') || (findStat(homeStatsRaw, 'Shots on Goal') + findStat(homeStatsRaw, 'Shots off Goal')),
    shotsOnTarget: findStat(homeStatsRaw, 'Shots on Goal'),
    corners: findStat(homeStatsRaw, 'Corner Kicks'),
    fouls: findStat(homeStatsRaw, 'Fouls'),
    yellowCards: findStat(homeStatsRaw, 'Yellow Cards'),
    redCards: findStat(homeStatsRaw, 'Red Cards')
  };

  const awayMapped = {
    possession: findStat(awayStatsRaw, 'Ball Possession') || (100 - homeMapped.possession),
    shots: findStat(awayStatsRaw, 'Total Shots') || (findStat(awayStatsRaw, 'Shots on Goal') + findStat(awayStatsRaw, 'Shots off Goal')),
    shotsOnTarget: findStat(awayStatsRaw, 'Shots on Goal'),
    corners: findStat(awayStatsRaw, 'Corner Kicks'),
    fouls: findStat(awayStatsRaw, 'Fouls'),
    yellowCards: findStat(awayStatsRaw, 'Yellow Cards'),
    redCards: findStat(awayStatsRaw, 'Red Cards')
  };

  const hasStats = (homeMapped.shots > 0 || awayMapped.shots > 0 || homeMapped.possession !== 50);

  return {
    home: homeMapped,
    away: awayMapped,
    hasStats
  };
}

interface CacheEntry {
  timestamp: number;
  data: any;
}

const apiCache: Record<string, CacheEntry> = {};
const CACHE_TTL = 30000; // 30 seconds Cache dynamic lifetime to avoid rate-limiting on free tokens

// Global shared controller state memory store for real-time OBS overlay syncing
let sharedControllerState = {
  selectedApiMatchId: "",
  streamSource: "greenscreen",
  selectedLineupTeam: "home",
  selectedDate: new Date().toISOString().split('T')[0],
  isTokenSavingMode: true,
  isPlayingSim: false,
  pinnedMatchIds: [] as string[],
  matchState: null as any,
  timestamp: Date.now(),
  assetsVersion: 1
};

// Isolated in-memory store for heavy media assets to prevent rate limit bottlenecks and massive POST payload sizes
let sharedAssets = {
  backgroundImage: null as string | null,
  competitionImage: null as string | null,
  streamerLogo: null as string | null,
  version: 1
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // OBS Real-time state synchronization endpoints
  app.post('/api/sync/state', (req, res) => {
    try {
      // Exclude large base64 assets if they happen to be in req.body to prevent server memory issues
      const { backgroundImage, competitionImage, streamerLogo, ...rest } = req.body;
      sharedControllerState = {
        ...sharedControllerState,
        ...rest,
        timestamp: Date.now()
      };
      return res.json({ success: true, state: sharedControllerState });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/sync/state', (req, res) => {
    return res.json(sharedControllerState);
  });

  // Dedicated endpoints for large base64 assets
  app.post('/api/sync/assets', (req, res) => {
    try {
      const nextVersion = sharedAssets.version + 1;
      sharedAssets = {
        ...sharedAssets,
        ...req.body,
        version: nextVersion
      };
      // Propagate assetsVersion back into sharedControllerState
      sharedControllerState.assetsVersion = nextVersion;
      return res.json({ success: true, version: nextVersion });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/sync/assets', (req, res) => {
    return res.json(sharedAssets);
  });

  // Unified API Proxy Route for real-world live fixtures mapped to API-Football (api-sports.io)
  const getLiveScores = async (req: express.Request, res: express.Response) => {
    let apiKey = process.env.FOOTBALL_API_KEY;
    if (apiKey) {
      apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
    }

    const requestedDate = req.query.date ? String(req.query.date).trim() : new Date().toISOString().split('T')[0];

    // check memory cache
    const cacheKey = `${requestedDate}-${apiKey || 'no-key'}`;
    const now = Date.now();
    if (apiCache[cacheKey] && (now - apiCache[cacheKey].timestamp) < CACHE_TTL) {
      console.log(`[Cache Hit] Returning cached matches for date: ${requestedDate}`);
      return res.json(apiCache[cacheKey].data);
    }

    const cacheAndSend = (payload: any) => {
      // Ne cacher que les succès avec des matchs réels
      if (!payload.error && payload.matches && payload.matches.length >= 0) {
        apiCache[cacheKey] = { timestamp: now, data: payload };
      }
      return res.json(payload);
    };

    if (!apiKey || apiKey === 'YOUR_FOOTBALL_API_KEY' || apiKey === 'MY_FOOTBALL_API_KEY') {
      console.log(`No valid FOOTBALL_API_KEY set. Returning error diagnostic payload.`);
      return cacheAndSend({
        source: 'api-football-error',
        matches: [],
        error: "Clé invalide ou non configurée",
        message: "Clé API non configurée. Veuillez ajouter FOOTBALL_API_KEY dans votre fichier .env.",
        diagnostic: {
          fournisseurActif: "API-Football (api-sports.io)",
          cleDetectee: false,
          dernierTestApi: "Aucun test effectué - Clé absente",
          statutHttp: 0,
          nombreMatchsRecuperes: 0
        }
      });
    }

    try {
      console.log(`[API Proxy] Querying API-Football fixtures for date: ${requestedDate}`);
      const rawData = await fetchFromApiFootball("fixtures", {
        date: requestedDate
      });
      const fixturesList = rawData.response || [];
      const mapped = mapApiSportsFixtures(fixturesList);

      console.log(`[API Proxy] Successfully fetched and mapped ${mapped.length} matches from API-Football.`);
      return cacheAndSend({
        source: 'api-sports-football',
        matches: mapped,
        diagnostic: {
          fournisseurActif: "API-Football (api-sports.io)",
          cleDetectee: true,
          dernierTestApi: "Succès",
          statutHttp: 200,
          nombreMatchsRecuperes: mapped.length
        }
      });
    } catch (err: any) {
      console.error("[API Proxy] API-Football match fetching failure:", err.message);
      
      const isForbidden = err.message.includes("403") || err.message.toLowerCase().includes("forbidden") || err.message.toLowerCase().includes("unauthorized") || err.message.toLowerCase().includes("suspendu");
      const isRateLimit = err.message.includes("429") || err.message.toLowerCase().includes("limit");
      
      let errorLabel = "Connexion API indisponible";
      if (isForbidden) errorLabel = "Clé invalide / Compte suspendu / Problème d'abonnement";
      else if (isRateLimit) errorLabel = "Limite de requêtes atteinte";

      return cacheAndSend({
        source: 'api-football-error',
        matches: [],
        error: errorLabel,
        message: `${errorLabel} - Détail de l'erreur : ${err.message}`,
        diagnostic: {
          fournisseurActif: "API-Football (api-sports.io)",
          cleDetectee: true,
          dernierTestApi: `Échoué: ${err.message}`,
          statutHttp: isForbidden ? 403 : isRateLimit ? 429 : 500,
          nombreMatchsRecuperes: 0
        }
      });
    }
  };

  // Helper mapping grid coordinate strings to pitch percentages
  const mapGridToCoords = (grid: string, position: string, index: number) => {
    if (position === 'G' || position?.toLowerCase() === 'gk') {
      return { x: 50, y: 90 };
    }
    if (grid && typeof grid === 'string' && grid.includes(':')) {
      const parts = grid.split(':');
      const rVal = parseInt(parts[0]);
      const cVal = parseInt(parts[1]);
      if (!isNaN(rVal) && !isNaN(cVal)) {
        let y = 50;
        if (rVal === 2) y = 72;
        else if (rVal === 3) y = 48;
        else if (rVal === 4) y = 24;
        else if (rVal >= 5) y = 10;
        else y = 90;
        return { rVal, cVal, y };
      }
    }
    let y = 50;
    if (position === 'D' || position?.toLowerCase() === 'def') y = 72;
    else if (position === 'M' || position?.toLowerCase() === 'mid') y = 48;
    else if (position === 'F' || position?.toLowerCase() === 'att' || position?.toLowerCase() === 'fwd') y = 18;
    return { rVal: 0, cVal: index + 1, y };
  };

  // Helper parsing lineups and arranging starting XI beautifully on pitch
  const parseLineupPlayers = (startXI: any[]) => {
    if (!startXI || !Array.isArray(startXI)) return [];
    
    const rowPlayers: Record<number, any[]> = {};
    const mappedList = startXI.map((item: any, idx: number) => {
      const p = item.player || {};
      const name = (p.name || "Joueur").toUpperCase();
      const number = p.number ?? (idx + 2);
      const apiPos = p.pos || "M";
      
      let position = "MID";
      if (apiPos === 'G') position = "GK";
      else if (apiPos === 'D') position = "DEF";
      else if (apiPos === 'M') position = "MID";
      else if (apiPos === 'F') position = "ATT";

      const coords = mapGridToCoords(p.grid, apiPos, idx);
      let rowId = coords.rVal;
      if (rowId === undefined || rowId === 0) {
        if (position === "GK") rowId = 1;
        else if (position === "DEF") rowId = 2;
        else if (position === "MID") rowId = 3;
        else rowId = 4;
      }

      return {
        id: String(p.id || `pl-${idx}-${number}`),
        name,
        number,
        position,
        rowId,
        cVal: coords.cVal || (idx + 1),
        x: 50,
        y: coords.y
      };
    });

    mappedList.forEach((p) => {
      if (!rowPlayers[p.rowId]) {
        rowPlayers[p.rowId] = [];
      }
      rowPlayers[p.rowId].push(p);
    });

    Object.keys(rowPlayers).forEach((rowStr) => {
      const rowId = parseInt(rowStr);
      const list = rowPlayers[rowId];
      list.sort((a, b) => a.cVal - b.cVal);
      const count = list.length;
      list.forEach((p, index) => {
        if (count === 1) {
          p.x = 50;
        } else {
          p.x = Math.round(15 + (70 / (count - 1)) * index);
        }
      });
    });

    return mappedList.map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.position,
      x: p.x,
      y: p.y
    }));
  };

  // Mount routes to keep full compatibility & satisfy ad-blockers using safe route
  app.get('/api/scores/live', getLiveScores);
  app.get('/api/football/matches', getLiveScores);
  app.get('/api/sportsfeed/data', getLiveScores);

  // Live diagnostic endpoint checking key configuration, cache values, and actual API status
  app.get('/api/football/diagnostic', async (req, res) => {
    let apiKey = process.env.FOOTBALL_API_KEY || '';
    if (apiKey) {
      apiKey = apiKey.trim().replace(/^["']|["']$/g, '');
    }

    const hasKey = !!apiKey && apiKey !== 'YOUR_FOOTBALL_API_KEY' && apiKey !== 'MY_FOOTBALL_API_KEY';
    
    // Inspect actual memory cache
    const cacheKeys = Object.keys(apiCache);
    const cacheSummary = cacheKeys.map(k => {
      const entry = apiCache[k];
      return {
        key: k,
        createdAt: new Date(entry.timestamp).toISOString(),
        ageSeconds: Math.floor((Date.now() - entry.timestamp) / 1000),
        origin: entry.data?.source || 'unknown',
        matchesCount: entry.data?.matches?.length ?? 0
      };
    });

    const report: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      fournisseurActif: "API-Football (api-sports.io)",
      cleDetectee: hasKey,
      statusHTTP: 0,
      dernierTestApi: "Aucun test effectué",
      competitionsCount: 0,
      nombreMatchsRecuperes: 0,
      sampleMatch: null,
      errorDetails: null,
      cacheStatus: {
        totalKeys: cacheKeys.length,
        entries: cacheSummary
      }
    };

    if (!hasKey) {
      report.dernierTestApi = "Échoué (Clé API absente ou non configurée)";
      return res.json(report);
    }

    try {
      // Test 1: Fetch status/verification of account
      const rawData = await fetchFromApiFootball("status");
      report.dernierTestApi = "Connexion réussie avec l'api API-Football !";
      report.statusHTTP = 200;
      
      if (rawData.response) {
        report.accountStats = {
          requestsRemaining: (rawData.response.requests?.limit_day ?? 0) - (rawData.response.requests?.current_day ?? 0),
          totalLimit: rawData.response.requests?.limit_day,
          accountType: rawData.response.subscription?.plan,
          activeSeats: rawData.response.subscription?.active ? 1 : 0
        };
      }

      // Test 2: Fetch matches for today to check matches mapping
      const todayStr = new Date().toISOString().split('T')[0];
      const matchData = await fetchFromApiFootball("fixtures", { date: todayStr });
      const fixturesList = matchData.response || [];
      report.nombreMatchsRecuperes = fixturesList.length;

      if (fixturesList.length > 0) {
        const f = fixturesList[0];
        report.sampleMatch = {
          id: f.fixture?.id,
          competition: f.league?.name,
          homeTeam: f.teams?.home?.name,
          awayTeam: f.teams?.away?.name,
          score: `${f.goals?.home ?? 0} - ${f.goals?.away ?? 0}`,
          status: f.fixture?.status?.short,
          date: f.fixture?.date
        };
      }
    } catch (err: any) {
      report.dernierTestApi = "Erreur de connexion : " + err.message;
      report.statusHTTP = err.message.includes("403") ? 403 : err.message.includes("429") ? 429 : 500;
      report.errorDetails = err.message;
    }

    return res.json(report);
  });

  // Endpoint to obtain real team statistics from API-Football
  app.get('/api/football/statistics', async (req, res) => {
    const fixtureId = req.query.fixture || req.query.id;
    if (!fixtureId) {
      return res.status(400).json({ error: "Missing fixture/id query parameter." });
    }

    try {
      console.log(`[API Proxy] Fetching team statistics from API-Football for fixture ${fixtureId}`);
      const rawData = await fetchFromApiFootball("fixtures/statistics", { fixture: String(fixtureId) });
      const statsArray = rawData.response || [];
      
      const mapped = mapApiSportsStats(statsArray);
      return res.json({
        success: true,
        response: statsArray,
        ...mapped
      });
    } catch (err: any) {
      console.error(`Error fetching stats for fixture ${fixtureId}:`, err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Endpoint to obtain real team lineups from API-Football
  app.get('/api/football/lineups', async (req, res) => {
    const fixtureId = req.query.fixture || req.query.id;
    if (!fixtureId) {
      return res.status(400).json({ error: "Missing fixture/id query parameter." });
    }

    try {
      console.log(`[API Proxy] Fetching team lineups from API-Football for fixture ${fixtureId}`);
      const rawData = await fetchFromApiFootball("fixtures/lineups", { fixture: String(fixtureId) });
      const lineups = rawData.response || [];
      
      if (!lineups || lineups.length < 2) {
        return res.json({
          success: false,
          home: { formation: "Non disponible", players: [] },
          away: { formation: "Non disponible", players: [] }
        });
      }

      const homeL = lineups[0];
      const awayL = lineups[1];

      const homeXI = parseLineupPlayers(homeL.startXI || []);
      const awayXI = parseLineupPlayers(awayL.startXI || []);

      return res.json({
        success: true,
        home: {
          formation: homeL.formation || "4-3-3",
          players: homeXI
        },
        away: {
          formation: awayL.formation || "4-3-3",
          players: awayXI
        }
      });
    } catch (err: any) {
      console.error(`Error fetching lineups for fixture ${fixtureId}:`, err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Endpoint to obtain real team events, statistics, lineups, and current match state in one call
  app.get('/api/football/match-details', async (req, res) => {
    const fixtureId = req.query.fixture || req.query.id;
    if (!fixtureId) {
      return res.status(400).json({ error: "Missing fixture/id query parameter." });
    }

    try {
      console.log(`[API Proxy] Fetching match details from API-Football for fixture ${fixtureId}`);
      const rawData = await fetchFromApiFootball("fixtures", { id: String(fixtureId) });
      const fixturesList = rawData.response || [];
      if (fixturesList.length === 0) {
        return res.status(404).json({ error: "Match not found" });
      }

      const f = fixturesList[0];
      const mapped = mapApiSportsFixtures([f])[0];

      return res.json({
        success: true,
        match: mapped
      });
    } catch (err: any) {
      console.error(`Error fetching match details for fixture ${fixtureId}:`, err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // Vite development middleware or static production dist folder serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Live Football Scoreboard Backend online on http://0.0.0.0:${PORT}`);
  });
}

startServer();

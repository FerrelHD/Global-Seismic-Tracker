import { WildfireHotspot } from '../types/seismic';
import { supabase, FALLBACK_WILDFIRE_HOTSPOTS } from './supabase';

const FIRMS_STORAGE_KEY = 'firms_live_hotspots_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface FIRMSResult {
  hotspots: WildfireHotspot[];
  source: 'live_firms' | 'supabase_db' | 'curated_snapshot';
  lastUpdated: string;
}

function resolveIsland(lat: number, lon: number): string {
  if (lat >= -6 && lat <= 6 && lon >= 95 && lon <= 109) return 'Sumatra';
  if (lat >= -4.5 && lat <= 4.5 && lon >= 108.5 && lon <= 119) return 'Kalimantan';
  if (lat >= -9 && lat <= -5.5 && lon >= 105 && lon <= 115) return 'Jawa';
  if (lat >= -11 && lat <= -8 && lon >= 114.5 && lon <= 126) return 'Bali & Nusa Tenggara';
  if (lat >= -6 && lat <= 2 && lon >= 118.5 && lon <= 125.5) return 'Sulawesi';
  if (lat >= -9.5 && lat <= 1 && lon >= 125.5 && lon <= 141) return 'Papua & Maluku';
  return 'Nusantara';
}

function parseNASAcsv(csvText: string): WildfireHotspot[] {
  const lines = csvText.trim().split('\n');
  if (lines.length <= 1) return [];

  const headers = lines[0].split(',').map((h) => h.trim());
  const latIdx = headers.indexOf('latitude');
  const lonIdx = headers.indexOf('longitude');
  const frpIdx = headers.indexOf('frp');
  const confIdx = headers.indexOf('confidence');
  const dateIdx = headers.indexOf('acq_date');
  const timeIdx = headers.indexOf('acq_time');
  const satIdx = headers.indexOf('satellite');

  if (latIdx === -1 || lonIdx === -1) return [];

  const hotspots: WildfireHotspot[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map((p) => p.trim());
    if (parts.length < headers.length) continue;

    const lat = parseFloat(parts[latIdx]);
    const lon = parseFloat(parts[lonIdx]);
    const frp = parseFloat(parts[frpIdx]) || 0;
    const confRaw = parts[confIdx]?.toLowerCase() || 'n';
    const sat = parts[satIdx] || 'VIIRS_SNPP';

    if (isNaN(lat) || isNaN(lon)) continue;

    const dateStr = parts[dateIdx] || '';
    const timeStr = parts[timeIdx]?.padStart(4, '0') || '0000';
    const hh = timeStr.slice(0, 2);
    const mm = timeStr.slice(2, 4);
    const detectedAt = dateStr ? `${dateStr}T${hh}:${mm}:00Z` : new Date().toISOString();

    let confidence: 'low' | 'nominal' | 'high' = 'nominal';
    if (confRaw === 'h' || confRaw === 'high' || parseInt(confRaw) >= 80) confidence = 'high';
    else if (confRaw === 'l' || confRaw === 'low' || parseInt(confRaw) < 40) confidence = 'low';

    hotspots.push({
      id: `firms-live-${dateStr}-${timeStr}-${i}`,
      latitude: lat,
      longitude: lon,
      frp,
      confidence,
      island: resolveIsland(lat, lon),
      satellite: sat === 'N' ? 'VIIRS_SNPP' : sat,
      detected_at: detectedAt,
    });
  }

  return hotspots.sort((a, b) => b.frp - a.frp).slice(0, 400);
}

/**
 * High-reliability 4-tier fetcher for active wildfire hotspots across Nusantara:
 * 1. Vercel Edge Proxy `/api/firms` (Production CDN Cache)
 * 2. Direct NASA FIRMS (Local Dev / Fallback)
 * 3. Supabase DB Table `wildfire_hotspots`
 * 4. High-precision curated snapshot of critical peatland clusters (Zero-Crash Guarantee)
 */
export async function fetchLiveWildfireHotspots(force = false): Promise<FIRMSResult> {
  // Check local cache if not forced
  if (!force) {
    try {
      const cachedRaw = localStorage.getItem(FIRMS_STORAGE_KEY);
      if (cachedRaw) {
        const parsed = JSON.parse(cachedRaw);
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.hotspots)) {
          return {
            hotspots: parsed.hotspots,
            source: parsed.source || 'live_firms',
            lastUpdated: new Date(parsed.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          };
        }
      }
    } catch {
      // Ignore cache parse error
    }
  }

  // Tier 1: Try Vercel Edge Proxy `/api/firms`
  try {
    const res = await fetch('/api/firms');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        saveToCache(data, 'live_firms');
        return {
          hotspots: data,
          source: 'live_firms',
          lastUpdated: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };
      }
    }
  } catch {
    // /api/firms may 404 in local Vite dev server
  }

  // Tier 2: Direct NASA FIRMS API (Local Dev with valid key)
  try {
    const mapKey = import.meta.env.VITE_NASA_FIRMS_KEY || '07f1b45f7415962d481155788cfd4bdc';
    if (mapKey) {
      const directUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/95,-11,141,6/1`;
      const res = await fetch(directUrl);
      if (res.ok) {
        const csv = await res.text();
        const parsed = parseNASAcsv(csv);
        if (parsed.length > 0) {
          saveToCache(parsed, 'live_firms');
          return {
            hotspots: parsed,
            source: 'live_firms',
            lastUpdated: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          };
        }
      }
    }
  } catch (directErr) {
    console.warn('Direct NASA FIRMS query failed, falling back:', directErr);
  }

  // Tier 3: Try Supabase Database table
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('wildfire_hotspots')
        .select('*')
        .gte('latitude', -11.0)
        .lte('latitude', 6.0)
        .gte('longitude', 95.0)
        .lte('longitude', 141.0)
        .order('detected_at', { ascending: false })
        .limit(400);

      if (!error && data && data.length > 0) {
        saveToCache(data as WildfireHotspot[], 'supabase_db');
        return {
          hotspots: data as WildfireHotspot[],
          source: 'supabase_db',
          lastUpdated: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };
      }
    }
  } catch (err) {
    console.warn('Supabase DB table wildfire_hotspots fallback:', err);
  }

  // Tier 4: Curated high-precision peatland snapshot
  return {
    hotspots: FALLBACK_WILDFIRE_HOTSPOTS,
    source: 'curated_snapshot',
    lastUpdated: 'Snapshot Curated',
  };
}

function saveToCache(hotspots: WildfireHotspot[], source: 'live_firms' | 'supabase_db') {
  try {
    localStorage.setItem(
      FIRMS_STORAGE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        source,
        hotspots,
      })
    );
  } catch {
    // Storage quota or disabled
  }
}

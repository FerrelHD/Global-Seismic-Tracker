import { WildfireHotspot } from '../types/seismic';
import { supabase, FALLBACK_WILDFIRE_HOTSPOTS } from './supabase';

const FIRMS_STORAGE_KEY = 'firms_live_hotspots_v1';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export interface FIRMSResult {
  hotspots: WildfireHotspot[];
  source: 'live_firms' | 'supabase_db' | 'curated_snapshot';
  lastUpdated: string;
}

/**
 * High-reliability 3-tier fetcher for active wildfire hotspots across Nusantara:
 * 1. Supabase Edge Function / Direct NASA FIRMS (if configured)
 * 2. Supabase DB Table `wildfire_hotspots`
 * 3. High-precision curated snapshot of critical peatland clusters (Zero-Crash Guarantee)
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

  // Tier 1: Try Supabase Edge Function `firms-live`
  try {
    const edgeFunctionUrl = import.meta.env.VITE_SUPABASE_URL
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/firms-live`
      : null;

    if (edgeFunctionUrl) {
      const res = await fetch(edgeFunctionUrl, {
        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        },
      });

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
    }
  } catch (err) {
    console.warn('Edge function firms-live not reachable, falling back to DB/Snapshot:', err);
  }

  // Tier 2: Try Supabase Database table
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
        .limit(500);

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

  // Tier 3: Curated high-precision peatland snapshot
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

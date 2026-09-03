import { createClient, User } from '@supabase/supabase-js';
import { SeismicEvent, Bookmark } from '../types/seismic';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  'https://wyguzokuixndqfbyqhwp.supabase.co';

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  '';

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const STORAGE_KEY = 'seismic_bookmarks_local';

export function getLocalBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalBookmark(event: SeismicEvent, custom_note = ''): Bookmark[] {
  const current = getLocalBookmarks();
  const exists = current.some((b) => b.event_id === event.id || b.event.usgs_id === event.usgs_id);
  if (exists) return current;

  const newBookmark: Bookmark = {
    id: `local-${Date.now()}`,
    event_id: event.id || event.usgs_id,
    event,
    custom_note,
    created_at: new Date().toISOString(),
  };

  const updated = [newBookmark, ...current];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function removeLocalBookmark(idOrEventId: string): Bookmark[] {
  const current = getLocalBookmarks();
  const updated = current.filter(
    (b) => b.id !== idOrEventId && b.event_id !== idOrEventId && b.event.usgs_id !== idOrEventId
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export interface BMKGAlert {
  tanggal: string;
  jam: string;
  datetime: string;
  coordinates: string;
  lintang: string;
  bujur: string;
  magnitude: string;
  kedalaman: string;
  wilayah: string;
  potensi: string;
  dirasakan?: string;
  shakemap?: string;
}

export async function fetchBMKGAutogempa(): Promise<BMKGAlert | null> {
  try {
    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json');
    if (!res.ok) return null;
    const json = await res.json();
    const g = json?.Infogempa?.gempa;
    if (!g) return null;
    return {
      tanggal: g.Tanggal,
      jam: g.Jam,
      datetime: g.DateTime,
      coordinates: g.Coordinates,
      lintang: g.Lintang,
      bujur: g.Bujur,
      magnitude: g.Magnitude,
      kedalaman: g.Kedalaman,
      wilayah: g.Wilayah,
      potensi: g.Potensi,
      dirasakan: g.Dirasakan,
      shakemap: g.Shakemap,
    };
  } catch (err) {
    console.warn('BMKG feed unreachable or CORS blocked, falling back gracefully:', err);
    return null;
  }
}

export async function fetchSeismicEvents(): Promise<SeismicEvent[]> {
  // 1. If Supabase database is connected, query synchronized Indonesian events from Supabase
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('seismic_events')
        .select('*')
        .gte('latitude', -11.0)
        .lte('latitude', 6.0)
        .gte('longitude', 95.0)
        .lte('longitude', 141.0)
        .order('occurred_at', { ascending: false })
        .limit(600);

      if (!error && data && data.length > 0) {
        return data as SeismicEvent[];
      }
    }
  } catch (err) {
    console.warn('Supabase query fallback to direct USGS Indonesia feed:', err);
  }

  // 2. Primary Feed: Direct USGS API with Indonesian Archipelago Bounding Box (M2.5+ across Nusantara)
  // Bounds: Lat -11.0 to 6.0, Lon 95.0 to 141.0
  try {
    const usgsIndoUrl =
      'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=2.5&minlatitude=-11.0&maxlatitude=6.0&minlongitude=95.0&maxlongitude=141.0&limit=500';

    const res = await fetch(usgsIndoUrl);
    if (res.ok) {
      const json = await res.json();
      const features = json.features || [];
      if (features.length > 0) {
        return features.map((f: any) => ({
          id: f.id,
          usgs_id: f.id,
          magnitude: f.properties?.mag ?? null,
          depth: Number(f.geometry.coordinates[2]),
          latitude: Number(f.geometry.coordinates[1]),
          longitude: Number(f.geometry.coordinates[0]),
          place: f.properties?.place || 'Indonesia Archipelago',
          occurred_at: new Date(f.properties?.time).toISOString(),
        }));
      }
    }
  } catch (err) {
    console.warn('USGS Indonesia Bounding Box query failed, trying global feed:', err);
  }

  // 2. Fallback: Direct USGS GeoJSON 7-day all feed filtered for Indonesia or global
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson');
    const json = await res.json();
    const features = json.features || [];

    return features.map((f: any) => ({
      id: f.id,
      usgs_id: f.id,
      magnitude: f.properties?.mag ?? null,
      depth: Number(f.geometry.coordinates[2]),
      latitude: Number(f.geometry.coordinates[1]),
      longitude: Number(f.geometry.coordinates[0]),
      place: f.properties?.place || 'Unknown',
      occurred_at: new Date(f.properties?.time).toISOString(),
    }));
  } catch (fallbackErr) {
    console.error('All seismic feeds failed:', fallbackErr);
    return [];
  }
}

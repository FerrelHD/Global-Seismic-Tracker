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

export async function fetchSeismicEvents(): Promise<SeismicEvent[]> {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('seismic_events')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(600);

      if (!error && data && data.length > 0) {
        return data as SeismicEvent[];
      }
    }
  } catch (err) {
    console.warn('Supabase query fallback to direct USGS feed:', err);
  }

  // Fallback direct USGS GeoJSON 7-day feed
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
}

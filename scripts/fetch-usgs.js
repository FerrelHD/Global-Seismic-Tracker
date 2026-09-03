import { createClient } from '@supabase/supabase-js';

// Native Node 20.12+ .env loader (ponytail: zero extra deps)
try {
  process.loadEnvFile?.();
} catch {}

const USGS_INDO_URL =
  'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=2.5&minlatitude=-11.0&maxlatitude=6.0&minlongitude=95.0&maxlongitude=141.0&limit=1000';
const USGS_GLOBAL_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function syncUSGS() {
  console.log(`[ETL] Fetching Indonesian seismic events feed from USGS...`);
  let features = [];

  try {
    const res = await fetch(USGS_INDO_URL);
    if (res.ok) {
      const data = await res.json();
      features = data.features || [];
      console.log(`[ETL] Received ${features.length} Indonesian features from USGS Bounding Box query.`);
    }
  } catch (err) {
    console.warn(`[ETL] Bounding box query failed, falling back to global feed:`, err.message);
  }

  if (features.length === 0) {
    console.log(`[ETL] Fetching global feed fallback...`);
    const res = await fetch(USGS_GLOBAL_URL);
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    features = (data.features || []).filter((f) => {
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) return false;
      const [lon, lat] = coords;
      return lat >= -11.0 && lat <= 6.0 && lon >= 95.0 && lon <= 141.0;
    });
    console.log(`[ETL] Filtered ${features.length} Indonesian events from global feed.`);
  }

  // USGS geometry.coordinates format: [longitude, latitude, depth]
  const records = features
    .filter((f) => f.id && f.geometry?.coordinates?.length >= 3)
    .map((f) => {
      const [longitude, latitude, depth] = f.geometry.coordinates;
      return {
        usgs_id: f.id,
        magnitude: f.properties?.mag ?? null,
        depth: Number(depth),
        latitude: Number(latitude),
        longitude: Number(longitude),
        place: f.properties?.place || 'Indonesia Archipelago',
        occurred_at: new Date(f.properties?.time).toISOString(),
      };
    });

  if (records.length === 0) {
    console.log('[ETL] No records to process.');
    return { count: 0 };
  }

  // Batch upsert in chunks of 500
  const CHUNK_SIZE = 500;
  let totalUpserted = 0;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('seismic_events')
      .upsert(chunk, { onConflict: 'usgs_id', ignoreDuplicates: false });

    if (error) throw error;
    totalUpserted += chunk.length;
  }

  console.log(`[ETL] Successfully upserted ${totalUpserted} events into Supabase.`);
  return { count: totalUpserted };
}

// Auto-run when executed directly
if (process.argv[1]?.endsWith('fetch-usgs.js')) {
  syncUSGS().catch((err) => {
    console.error('[ETL Error]', err.message);
    process.exit(1);
  });
}

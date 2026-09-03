import { createClient } from '@supabase/supabase-js';

// Native Node 20.12+ .env loader (ponytail: zero extra deps)
try {
  process.loadEnvFile?.();
} catch {}

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function syncUSGS() {
  console.log(`[ETL] Fetching feed from USGS...`);
  const res = await fetch(USGS_URL);
  if (!res.ok) throw new Error(`USGS HTTP ${res.status}: ${res.statusText}`);

  const data = await res.json();
  const features = data.features || [];
  console.log(`[ETL] Received ${features.length} features.`);

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
        place: f.properties?.place || 'Unknown',
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

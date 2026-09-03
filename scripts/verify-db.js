import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile?.();
} catch {}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function verify() {
  console.log('--- Checking Supabase seismic_events table ---');

  // 1. Total rows
  const { count, error: countErr } = await supabase
    .from('seismic_events')
    .select('*', { count: 'exact', head: true });
  if (countErr) throw countErr;

  // 2. Highest magnitude
  const { data: maxMagData, error: maxMagErr } = await supabase
    .from('seismic_events')
    .select('usgs_id, magnitude, place, occurred_at')
    .not('magnitude', 'is', null)
    .order('magnitude', { ascending: false })
    .limit(1);
  if (maxMagErr) throw maxMagErr;

  // 3. Most recent event
  const { data: latestData, error: latestErr } = await supabase
    .from('seismic_events')
    .select('usgs_id, magnitude, place, occurred_at')
    .order('occurred_at', { ascending: false })
    .limit(1);
  if (latestErr) throw latestErr;

  console.log(`✓ Total Rows Inserted : ${count ?? 0}`);
  if (maxMagData?.[0]) {
    const top = maxMagData[0];
    console.log(`✓ Highest Magnitude   : M${top.magnitude} - ${top.place} (${top.occurred_at})`);
  }
  if (latestData?.[0]) {
    const rec = latestData[0];
    console.log(`✓ Most Recent Event   : ${rec.place} at ${rec.occurred_at} (M${rec.magnitude ?? '?'})`);
  }

  if (count === 0) {
    console.warn('⚠ Table is currently empty. Run `npm run sync` to ingest data.');
  } else {
    console.log('--- Verification Complete: Database is live & functional! ---');
  }
}

verify().catch((err) => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=600', // 10-minute cache header
};

interface FIRMSRecord {
  id: string;
  latitude: number;
  longitude: number;
  frp: number;
  confidence: 'low' | 'nominal' | 'high';
  island: string;
  satellite: string;
  detected_at: string;
}

function resolveIsland(lat: number, lon: number): string {
  if (lat >= -6 && lat <= 6 && lon >= 95 && lon <= 109) return 'Sumatra';
  if (lat >= -4.5 && lat <= 4.5 && lon >= 108.5 && lon <= 119) return 'Kalimantan';
  if (lat >= -9 && lat <= -5.5 && lon >= 105 && lon <= 115) return 'Jawa';
  if (lat >= -6 && lat <= 2 && lon >= 118.5 && lon <= 125.5) return 'Sulawesi';
  if (lat >= -9.5 && lat <= 0 && lon >= 130 && lon <= 141) return 'Papua';
  return 'Nusantara';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const mapKey = Deno.env.get('NASA_FIRMS_MAP_KEY') || 'YOUR_NASA_MAP_KEY';
    // Use VIIRS S-NPP Near-Real-Time 375m sensor for Indonesia
    const url = `https://firms.modaps.eosdis.nasa.gov/api/country/csv/${mapKey}/VIIRS_SNPP_NRT/IDN/1`;

    const upstream = await fetch(url);
    if (!upstream.ok) {
      throw new Error(`NASA FIRMS upstream status: ${upstream.status}`);
    }

    const csvText = await upstream.text();
    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const headers = lines[0].split(',').map((h) => h.trim());
    const latIdx = headers.indexOf('latitude');
    const lonIdx = headers.indexOf('longitude');
    const frpIdx = headers.indexOf('frp');
    const confIdx = headers.indexOf('confidence');
    const dateIdx = headers.indexOf('acq_date');
    const timeIdx = headers.indexOf('acq_time');
    const satIdx = headers.indexOf('satellite');

    const hotspots: FIRMSRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length < headers.length) continue;

      const lat = parseFloat(parts[latIdx]);
      const lon = parseFloat(parts[lonIdx]);
      const frp = parseFloat(parts[frpIdx]) || 0;
      const confRaw = parts[confIdx] || 'n';
      const sat = parts[satIdx] || 'VIIRS_SNPP';

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
        satellite: sat,
        detected_at: detectedAt,
      });
    }

    // Limit to top 500 highest-intensity or most recent hotspots
    const sorted = hotspots.sort((a, b) => b.frp - a.frp).slice(0, 500);

    return new Response(JSON.stringify(sorted), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

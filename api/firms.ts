export const config = {
  runtime: 'edge',
};

interface FIRMSHotspot {
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
  if (lat >= -11 && lat <= -8 && lon >= 114.5 && lon <= 126) return 'Bali & Nusa Tenggara';
  if (lat >= -6 && lat <= 2 && lon >= 118.5 && lon <= 125.5) return 'Sulawesi';
  if (lat >= -9.5 && lat <= 1 && lon >= 125.5 && lon <= 141) return 'Papua & Maluku';
  return 'Nusantara';
}

export default async function handler(req: Request): Promise<Response> {
  // Allow OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const mapKey =
      process.env.NASA_FIRMS_MAP_KEY ||
      process.env.VITE_NASA_FIRMS_KEY ||
      '07f1b45f7415962d481155788cfd4bdc';

    // VIIRS S-NPP Near-Real-Time sensor over Indonesian Archipelago Bounding Box
    // Bounds: 95E, -11S to 141E, 6N. Day range: 1 (past 24 hours)
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/95,-11,141,6/1`;

    const upstream = await fetch(url, {
      headers: {
        'User-Agent': 'Nusantara-Hazard-Observatory/1.0',
      },
    });

    if (!upstream.ok) {
      throw new Error(`NASA upstream status: ${upstream.status}`);
    }

    const csvText = await upstream.text();
    if (!csvText || csvText.startsWith('Invalid API call') || !csvText.includes(',')) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    const lines = csvText.trim().split('\n');
    if (lines.length <= 1) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
        },
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

    if (latIdx === -1 || lonIdx === -1) {
      throw new Error('Malformed CSV headers from NASA FIRMS');
    }

    const hotspots: FIRMSHotspot[] = [];

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

    // Limit to top 400 highest-intensity or most significant hotspots
    const sorted = hotspots.sort((a, b) => b.frp - a.frp).slice(0, 400);

    return new Response(JSON.stringify(sorted), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch live NASA FIRMS telemetry', details: err?.message }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

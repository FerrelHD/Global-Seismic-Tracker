import { RegionalWindData } from '../types/seismic';

// Key monitoring hubs covering the peatland & fire belts across Nusantara
const WIND_STATIONS = [
  { region: 'Riau / Sumatra Tengah', latitude: 0.8, longitude: 101.8 },
  { region: 'Sumatera Selatan / Jambi', latitude: -2.8, longitude: 104.5 },
  { region: 'Kalimantan Barat', latitude: -1.5, longitude: 110.2 },
  { region: 'Kalimantan Tengah', latitude: -2.4, longitude: 114.1 },
  { region: 'Kalimantan Selatan', latitude: -3.4, longitude: 115.0 },
  { region: 'Papua Selatan', latitude: -7.8, longitude: 139.8 },
];

const STORAGE_KEY = 'nusantara_wind_telemetry_v1';
const CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

// Fallback prevailing trade winds (dry-season typical: southeasterly to northeasterly)
const DEFAULT_WIND_DATA: RegionalWindData[] = WIND_STATIONS.map((s, idx) => ({
  region: s.region,
  latitude: s.latitude,
  longitude: s.longitude,
  windSpeed: 12 + (idx % 3) * 3.5, // 12 - 19 km/h
  windDirection: 45 + (idx % 4) * 20, // 45° - 105° (NE to E)
  gustSpeed: 18 + (idx % 3) * 4,
  timestamp: new Date().toISOString(),
}));

/**
 * Fetches real-time wind speed (km/h) and wind direction (degrees 0-360)
 * from Open-Meteo Free Public API for Indonesian hotspot clusters.
 * Fully CORS compliant and requires zero API key.
 */
export async function fetchNusantaraWindTelemetry(): Promise<RegionalWindData[]> {
  try {
    // Check cached data
    const cachedRaw = localStorage.getItem(STORAGE_KEY);
    if (cachedRaw) {
      const parsed = JSON.parse(cachedRaw);
      if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && Array.isArray(parsed.data)) {
        return parsed.data;
      }
    }

    const lats = WIND_STATIONS.map((s) => s.latitude).join(',');
    const lons = WIND_STATIONS.map((s) => s.longitude).join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo status: ${res.status}`);
    }

    const json = await res.json();
    const results: any[] = Array.isArray(json) ? json : [json];

    const windData: RegionalWindData[] = results.map((item, index) => {
      const station = WIND_STATIONS[index] || WIND_STATIONS[0];
      const cur = item.current || {};
      return {
        region: station.region,
        latitude: station.latitude,
        longitude: station.longitude,
        windSpeed: typeof cur.wind_speed_10m === 'number' ? cur.wind_speed_10m : 14,
        windDirection: typeof cur.wind_direction_10m === 'number' ? cur.wind_direction_10m : 55,
        gustSpeed: cur.wind_gusts_10m,
        timestamp: new Date().toISOString(),
      };
    });

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ timestamp: Date.now(), data: windData })
    );

    return windData;
  } catch (err) {
    console.warn('Open-Meteo wind telemetry query fallback to prevailing winds:', err);
    return DEFAULT_WIND_DATA;
  }
}

/**
 * Finds the closest regional wind vector for any coordinate in Indonesia
 */
export function getInterpolatedWind(
  lat: number,
  lon: number,
  telemetry: RegionalWindData[] = DEFAULT_WIND_DATA
): { windSpeed: number; windDirection: number; region: string } {
  if (!telemetry || telemetry.length === 0) {
    return { windSpeed: 14, windDirection: 55, region: 'Prevailing Trade Wind' };
  }

  let closest = telemetry[0];
  let minDistance = Infinity;

  for (const item of telemetry) {
    const dLat = item.latitude - lat;
    const dLon = item.longitude - lon;
    const dist = dLat * dLat + dLon * dLon;
    if (dist < minDistance) {
      minDistance = dist;
      closest = item;
    }
  }

  return {
    windSpeed: closest.windSpeed,
    windDirection: closest.windDirection,
    region: closest.region,
  };
}

/**
 * Returns compass cardinal direction from degrees
 */
export function degreesToCompass(deg: number): string {
  const directions = ['UTARA (N)', 'TIMUR LAUT (NE)', 'TIMUR (E)', 'TENGGARA (SE)', 'SELATAN (S)', 'BARAT DAYA (SW)', 'BARAT (W)', 'BARAT LAUT (NW)'];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return directions[index];
}

export const config = {
  runtime: 'edge',
};

import { VolcanoActivity, AlertLevel } from '../src/types/seismic';
import { INDONESIA_ACTIVE_VOLCANOES } from '../src/data/volcanoes';

// Clean volcano name for fuzzy matching against MAGMA Indonesia reports
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^gunung\s+/i, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export default async function handler(req: Request): Promise<Response> {
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
    // Clone baseline catalogue
    const volcanoes: VolcanoActivity[] = JSON.parse(JSON.stringify(INDONESIA_ACTIVE_VOLCANOES));

    // Attempt to scrape live activity levels from MAGMA Indonesia portal with 6s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const upstream = await fetch('https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas', {
        headers: {
          'User-Agent': 'Nusantara-Hazard-Observatory/1.0 (PVMBG Telemetry Relay)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (upstream.ok) {
        const html = await upstream.text();
        if (html && !html.includes('502 Bad Gateway') && html.includes('<table')) {
          // Parse sections by alert level in MAGMA HTML
          // MAGMA typically displays Level IV (Awas), Level III (Siaga), Level II (Waspada) cards
          const sections = html.split(/card-status|card-header/i);

          const liveLevels = new Map<string, { level: AlertLevel; reportUrl?: string }>();

          for (const section of sections) {
            let detectedLevel: AlertLevel | null = null;
            if (/level\s*iv|awas/i.test(section)) detectedLevel = 'Level IV';
            else if (/level\s*iii|siaga/i.test(section)) detectedLevel = 'Level III';
            else if (/level\s*ii|waspada/i.test(section)) detectedLevel = 'Level II';
            else if (/level\s*i|normal/i.test(section)) detectedLevel = 'Level I';

            if (!detectedLevel) continue;

            // Extract table rows containing volcano names
            const rowMatches = section.matchAll(/<tr[^>]*>[\s\S]*?<td>\s*([^<]+?)(?:\s*-\s*[^<]*)?<a\s+href="([^"]+)"/gi);
            for (const match of rowMatches) {
              const rawName = match[1]?.trim();
              const reportUrl = match[2]?.trim();
              if (rawName) {
                liveLevels.set(normalizeName(rawName), {
                  level: detectedLevel,
                  reportUrl,
                });
              }
            }
          }

          // Merge live alert level updates into our volcano models
          if (liveLevels.size > 0) {
            for (const v of volcanoes) {
              const norm = normalizeName(v.name);
              for (const [key, val] of liveLevels.entries()) {
                if (norm.includes(key) || key.includes(norm)) {
                  v.alert_level = val.level;
                  v.updated_at = new Date().toISOString();
                  if (val.reportUrl && !v.status_description.includes('PVMBG Laporan:')) {
                    v.status_description += ` [Laporan Resmi PVMBG: ${val.reportUrl}]`;
                  }
                  break;
                }
              }
            }
          }
        }
      }
    } catch (fetchErr) {
      // MAGMA ESDM network timeout or transient error - graceful fallback to verified catalogue
      console.warn('MAGMA ESDM portal query failed, using verified baseline:', fetchErr);
    }

    return new Response(JSON.stringify(volcanoes), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify(INDONESIA_ACTIVE_VOLCANOES), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  }
}

import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function newsDevApiPlugin(): Plugin {
  return {
    name: 'news-dev-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/news')) {
          return next();
        }

        try {
          const urlObj = new URL(req.url, 'http://localhost:3000');
          const query = urlObj.searchParams.get('q') || 'gempa indonesia';
          const lang = urlObj.searchParams.get('lang') === 'en' ? 'en' : 'id';

          const gnewsQuery = `${query} when:7d`;
          const rssUrl =
            lang === 'en'
              ? `https://news.google.com/rss/search?q=${encodeURIComponent(gnewsQuery)}&hl=en-US&gl=US&ceid=US:en`
              : `https://news.google.com/rss/search?q=${encodeURIComponent(gnewsQuery)}&hl=id&gl=ID&ceid=ID:id`;

          const upstream = await fetch(rssUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; NusantaraObservatory/1.0)',
              Accept: 'application/rss+xml, application/xml, text/xml, */*',
            },
          });

          if (!upstream.ok) {
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: true, articles: [] }));
            return;
          }

          const xml = await upstream.text();
          const articles: any[] = [];
          const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
          let match: RegExpExecArray | null;

          while ((match = itemRegex.exec(xml)) !== null) {
            const item = match[1];
            const titleMatch = /<title>(.*?)<\/title>/is.exec(item);
            const linkMatch = /<link>(.*?)<\/link>/is.exec(item);
            const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/is.exec(item);
            const sourceMatch = /<source(?:\s+url="([^"]*)")?>([\s\S]*?)<\/source>/is.exec(item);

            let rawTitle = titleMatch ? titleMatch[1].trim() : '';
            const link = linkMatch ? linkMatch[1].trim() : '';
            const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
            let source = sourceMatch?.[2]?.trim() || '';

            if (!rawTitle || !link) continue;

            rawTitle = rawTitle
              .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
              .replace(/&amp;/g, '&')
              .replace(/&quot;/g, '"');
            source = source.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').replace(/&amp;/g, '&');

            if (source) {
              const regex = new RegExp(`\\s*-\\s*${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
              rawTitle = rawTitle.replace(regex, '');
            }

            // Relative time formatting
            let relativeTime = 'Baru saja';
            const pubTime = new Date(pubDate).getTime();
            if (!isNaN(pubTime)) {
              const diffMin = Math.floor((Date.now() - pubTime) / 60000);
              const diffHours = Math.floor(diffMin / 60);
              const diffDays = Math.floor(diffHours / 24);
              if (lang === 'id') {
                relativeTime = diffMin < 60 ? `${Math.max(1, diffMin)} mnt lalu` : diffHours < 24 ? `${diffHours} jam lalu` : `${diffDays} hari lalu`;
              } else {
                relativeTime = diffMin < 60 ? `${Math.max(1, diffMin)}m ago` : diffHours < 24 ? `${diffHours}h ago` : `${diffDays}d ago`;
              }
            }

            // Location relevance check: discard irrelevant fallbacks (e.g. Bandung news when query is Pematangsiantar)
            const genericTerms = new Set([
              'gempa', 'earthquake', 'seismic', 'tremor',
              'erupsi', 'eruption', 'gunung', 'volcano',
              'kebakaran', 'hutan', 'wildfire', 'fire', 'karhutla',
              'titik', 'api', 'hotspot', 'lahan',
              'indonesia', 'in', 'of', 'and', 'dan', 'di', 'ke', 'dari', 'terkini', 'hari', 'ini'
            ]);
            const queryTokens = query
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, ' ')
              .split(/\s+/)
              .filter((t: string) => t.length > 2 && !genericTerms.has(t));

            if (queryTokens.length > 0) {
              const titleLower = rawTitle.toLowerCase();
              const isRelevant = queryTokens.some((token: string) => titleLower.includes(token));
              if (!isRelevant) continue;
            }

            articles.push({
              title: rawTitle,
              source: source || 'Media',
              link,
              pubDate,
              relativeTime,
            });

            if (articles.length >= 8) break;
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              query,
              count: articles.length,
              articles,
              fetchedAt: new Date().toISOString(),
            })
          );
        } catch (err: any) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: true, message: err.message, articles: [] }));
        }
      });
    },
  };
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

function firmsDevApiPlugin(): Plugin {
  let cachedHotspots: any[] = [];
  let lastFetched = 0;
  const TTL = 10 * 60 * 1000; // 10 minutes

  return {
    name: 'firms-dev-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/firms')) {
          return next();
        }

        if (cachedHotspots.length > 0 && Date.now() - lastFetched < TTL) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(cachedHotspots));
          return;
        }

        try {
          const mapKey = process.env.VITE_NASA_FIRMS_KEY || '07f1b45f7415962d481155788cfd4bdc';
          const primaryUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_NOAA20_NRT/95,-11,141,6/2`;
          const fallbackUrl = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${mapKey}/VIIRS_SNPP_NRT/95,-11,141,6/2`;

          let upstream = await fetch(primaryUrl, {
            headers: { 'User-Agent': 'Nusantara-Hazard-Observatory/1.0' },
          }).catch(() => null);

          if (!upstream || !upstream.ok) {
            upstream = await fetch(fallbackUrl, {
              headers: { 'User-Agent': 'Nusantara-Hazard-Observatory/1.0' },
            }).catch(() => null);
          }

          if (upstream && upstream.ok) {
            const csv = await upstream.text();
            const lines = csv.trim().split('\n');
            if (lines.length > 1) {
              const headers = lines[0].split(',').map((h) => h.trim());
              const latIdx = headers.indexOf('latitude');
              const lonIdx = headers.indexOf('longitude');
              const frpIdx = headers.indexOf('frp');
              const confIdx = headers.indexOf('confidence');
              const dateIdx = headers.indexOf('acq_date');
              const timeIdx = headers.indexOf('acq_time');
              const satIdx = headers.indexOf('satellite');

              const hotspots: any[] = [];
              for (let i = 1; i < lines.length; i++) {
                const parts = lines[i].split(',').map((p) => p.trim());
                if (parts.length < headers.length) continue;
                const lat = parseFloat(parts[latIdx]);
                const lon = parseFloat(parts[lonIdx]);
                const frp = parseFloat(parts[frpIdx]) || 0;
                const confRaw = parts[confIdx]?.toLowerCase() || 'n';
                const sat = parts[satIdx] || 'VIIRS';

                if (isNaN(lat) || isNaN(lon)) continue;

                const dateStr = parts[dateIdx] || '';
                const timeStr = parts[timeIdx]?.padStart(4, '0') || '0000';
                const hh = timeStr.slice(0, 2);
                const mm = timeStr.slice(2, 4);
                const detectedAt = dateStr ? `${dateStr}T${hh}:${mm}:00Z` : new Date().toISOString();

                let confidence = 'nominal';
                if (confRaw === 'h' || confRaw === 'high' || parseInt(confRaw) >= 80) confidence = 'high';
                else if (confRaw === 'l' || confRaw === 'low' || parseInt(confRaw) < 40) confidence = 'low';

                hotspots.push({
                  id: `firms-live-${dateStr}-${timeStr}-${i}`,
                  latitude: lat,
                  longitude: lon,
                  frp,
                  confidence,
                  island: resolveIsland(lat, lon),
                  satellite: sat === 'N' ? 'VIIRS_SNPP' : sat === '1' || sat === 'J1' ? 'VIIRS_NOAA20' : sat,
                  detected_at: detectedAt,
                });
              }

              if (hotspots.length > 0) {
                cachedHotspots = hotspots
                  .sort((a, b) => {
                    const timeDiff = new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
                    if (Math.abs(timeDiff) > 3600000 * 6) return timeDiff;
                    return b.frp - a.frp;
                  })
                  .slice(0, 500);
                lastFetched = Date.now();

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(cachedHotspots));
                return;
              }
            }
          }
        } catch (err: any) {
          console.warn('[FirmsDevPlugin] Error fetching live NASA FIRMS:', err.message);
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(cachedHotspots));
      });
    },
  };
}

function volcanoesDevApiPlugin(): Plugin {
  let cachedVolcanoes: any[] = [];
  let lastFetched = 0;
  const TTL = 30 * 60 * 1000; // 30 minutes

  return {
    name: 'volcanoes-dev-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        if (!req.url?.startsWith('/api/volcanoes')) {
          return next();
        }

        if (cachedVolcanoes.length > 0 && Date.now() - lastFetched < TTL) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(cachedVolcanoes));
          return;
        }

        try {
          const { INDONESIA_ACTIVE_VOLCANOES } = await import('./src/data/volcanoes');
          const volcanoes = JSON.parse(JSON.stringify(INDONESIA_ACTIVE_VOLCANOES));

          // Try fetching MAGMA Indonesia with 5s timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          try {
            const upstream = await fetch('https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas', {
              headers: {
                'User-Agent': 'Nusantara-Hazard-Observatory/1.0',
                Accept: 'text/html,application/xhtml+xml',
              },
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (upstream.ok) {
              const html = await upstream.text();
              if (html && !html.includes('502 Bad Gateway') && html.includes('<table')) {
                const sections = html.split(/card-status|card-header/i);
                const liveLevels = new Map<string, { level: string; reportUrl?: string }>();

                for (const section of sections) {
                  let detectedLevel: string | null = null;
                  if (/level\s*iv|awas/i.test(section)) detectedLevel = 'Level IV';
                  else if (/level\s*iii|siaga/i.test(section)) detectedLevel = 'Level III';
                  else if (/level\s*ii|waspada/i.test(section)) detectedLevel = 'Level II';
                  else if (/level\s*i|normal/i.test(section)) detectedLevel = 'Level I';

                  if (!detectedLevel) continue;

                  const rowMatches = section.matchAll(/<tr[^>]*>[\s\S]*?<td>\s*([^<]+?)(?:\s*-\s*[^<]*)?<a\s+href="([^"]+)"/gi);
                  for (const match of rowMatches) {
                    const rawName = match[1]?.trim()?.toLowerCase().replace(/^gunung\s+/i, '').replace(/[^a-z0-9]/g, '');
                    const reportUrl = match[2]?.trim();
                    if (rawName) {
                      liveLevels.set(rawName, { level: detectedLevel, reportUrl });
                    }
                  }
                }

                if (liveLevels.size > 0) {
                  for (const v of volcanoes) {
                    const norm = v.name.toLowerCase().replace(/^gunung\s+/i, '').replace(/[^a-z0-9]/g, '');
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
          } catch {
            // MAGMA timeout/offline - fallback baseline
          }

          cachedVolcanoes = volcanoes;
          lastFetched = Date.now();

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(cachedVolcanoes));
          return;
        } catch (err: any) {
          console.warn('[VolcanoesDevPlugin] Error handling volcanoes:', err.message);
        }

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(cachedVolcanoes));
      });
    },
  };
}

export default defineConfig({
  plugins: [tailwindcss(), react(), newsDevApiPlugin(), firmsDevApiPlugin(), volcanoesDevApiPlugin()],
  envPrefix: ['VITE_', 'SUPABASE_'],
  server: {
    port: 3000,
    open: false,
  },
});

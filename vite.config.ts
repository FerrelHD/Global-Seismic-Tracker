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

export default defineConfig({
  plugins: [tailwindcss(), react(), newsDevApiPlugin()],
  envPrefix: ['VITE_', 'SUPABASE_'],
  server: {
    port: 3000,
    open: false,
  },
});

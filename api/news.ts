export const config = {
  runtime: 'edge',
};

export interface NewsArticle {
  title: string;
  source: string;
  sourceUrl?: string;
  link: string;
  pubDate: string;
  relativeTime: string;
  snippet?: string;
}

function cleanTitle(rawTitle: string, sourceName: string): string {
  let cleaned = rawTitle
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Google News often appends " - MediaName" to the end of the title
  if (sourceName) {
    const regex = new RegExp(`\\s*-\\s*${sourceName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    cleaned = cleaned.replace(regex, '');
  }

  // Also remove common generic trailing dash suffixes if present
  cleaned = cleaned.replace(/\s*-\s*[^-]+$/, (match) => {
    const tail = match.replace(/^\s*-\s*/, '').trim();
    if (tail.length <= 25 && !tail.includes(',')) {
      return '';
    }
    return match;
  });

  return cleaned.trim();
}

function formatRelativeTime(dateStr: string, lang: 'id' | 'en' = 'id'): string {
  try {
    const pubTime = new Date(dateStr).getTime();
    if (isNaN(pubTime)) return lang === 'id' ? 'Baru saja' : 'Just now';
    const now = Date.now();
    const diffMs = Math.max(0, now - pubTime);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (lang === 'id') {
      if (diffMin < 1) return 'Baru saja';
      if (diffMin < 60) return `${diffMin} mnt lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays < 7) return `${diffDays} hari lalu`;
      return `${Math.floor(diffDays / 7)} minggu lalu`;
    } else {
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return `${Math.floor(diffDays / 7)}w ago`;
    }
  } catch {
    return lang === 'id' ? 'Baru saja' : 'Just now';
  }
}

const GENERIC_DISASTER_TERMS = new Set([
  'gempa', 'earthquake', 'seismic', 'tremor',
  'erupsi', 'eruption', 'gunung', 'volcano',
  'kebakaran', 'hutan', 'wildfire', 'fire', 'karhutla',
  'titik', 'api', 'hotspot', 'lahan',
  'indonesia', 'in', 'of', 'and', 'dan', 'di', 'ke', 'dari', 'terkini', 'hari', 'ini'
]);

function isArticleRelevant(title: string, query: string): boolean {
  const queryTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !GENERIC_DISASTER_TERMS.has(t));

  if (queryTokens.length === 0) return true;
  const titleLower = title.toLowerCase();
  return queryTokens.some((token) => titleLower.includes(token));
}

function parseGoogleNewsRSS(xml: string, lang: 'id' | 'en' = 'id', query: string = ''): NewsArticle[] {
  const articles: NewsArticle[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const itemContent = match[1];

    // Extract Title
    const titleMatch = /<title>(.*?)<\/title>/is.exec(itemContent);
    const rawTitle = titleMatch ? titleMatch[1].trim() : '';

    // Extract Link
    const linkMatch = /<link>(.*?)<\/link>/is.exec(itemContent);
    const link = linkMatch ? linkMatch[1].trim() : '';

    // Extract PubDate
    const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/is.exec(itemContent);
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';

    // Extract Source
    const sourceMatch = /<source(?:\s+url="([^"]*)")?>([\s\S]*?)<\/source>/is.exec(itemContent);
    const sourceUrl = sourceMatch?.[1] || '';
    let source = sourceMatch?.[2] || '';
    source = source
      .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
      .replace(/&amp;/g, '&')
      .trim();

    if (!source && link) {
      try {
        const urlHost = new URL(link).hostname.replace('www.', '');
        source = urlHost.split('.')[0].toUpperCase();
      } catch {
        source = 'MEDIA';
      }
    }

    if (!rawTitle || !link) continue;

    const title = cleanTitle(rawTitle, source);

    // Validate relevance: don't show Bandung news when searching for Pematangsiantar or other specific places
    if (query && !isArticleRelevant(title, query)) {
      continue;
    }

    articles.push({
      title,
      source: source || 'Portal Berita',
      sourceUrl,
      link,
      pubDate,
      relativeTime: formatRelativeTime(pubDate, lang),
    });

    if (articles.length >= 8) break;
  }

  return articles;
}

export default async function handler(req: Request): Promise<Response> {
  // CORS Preflight
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
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || 'gempa indonesia';
    const lang = (url.searchParams.get('lang') === 'en' ? 'en' : 'id') as 'id' | 'en';

    // Query Google News RSS with time constraint for fresh real-time reporting
    // "when:7d" ensures articles are from the past week
    const gnewsQuery = `${query} when:7d`;
    const rssUrl =
      lang === 'en'
        ? `https://news.google.com/rss/search?q=${encodeURIComponent(gnewsQuery)}&hl=en-US&gl=US&ceid=US:en`
        : `https://news.google.com/rss/search?q=${encodeURIComponent(gnewsQuery)}&hl=id&gl=ID&ceid=ID:id`;

    const upstream = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NusantaraObservatory/1.0; +https://github.com/FerrelHD/Global-Seismic-Tracker)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
    });

    if (!upstream.ok) {
      throw new Error(`Google News RSS returned HTTP ${upstream.status}`);
    }

    const xml = await upstream.text();
    const articles = parseGoogleNewsRSS(xml, lang, query);

    return new Response(
      JSON.stringify({
        query,
        count: articles.length,
        articles,
        fetchedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, s-maxage=180, stale-while-revalidate=300',
        },
      }
    );
  } catch (err: any) {
    console.error('Error fetching Google News RSS:', err);
    return new Response(
      JSON.stringify({
        error: true,
        message: err.message || 'Failed to fetch disaster news',
        articles: [],
      }),
      {
        status: 200, // Return 200 with empty articles array to avoid breaking client UI
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

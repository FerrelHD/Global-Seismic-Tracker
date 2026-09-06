export const config = {
  runtime: 'edge',
};

interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  url: string;
  snippet?: string;
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

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || 'gempa bumi erupsi';

  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      query + ' Indonesia'
    )}&hl=id&gl=ID&ceid=ID:id`;

    const upstream = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!upstream.ok) {
      throw new Error(`Google News status: ${upstream.status}`);
    }

    const xml = await upstream.text();
    const items: NewsItem[] = [];

    // Lightweight regex-based XML item parser for Edge runtime (no heavy DOMParser dependency)
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const itemContent = match[1];
      const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent);
      const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent);
      const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent);
      const sourceMatch = /<source[^>]*>([\s\S]*?)<\/source>/.exec(itemContent);

      const rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim() : '';
      const link = linkMatch ? linkMatch[1].trim() : '';
      const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
      const source = sourceMatch ? sourceMatch[1].trim() : 'Media Nasional';

      // Clean Google News title formatting (which usually has " - Source" at the end)
      let cleanTitle = rawTitle;
      if (cleanTitle.includes(' - ')) {
        const parts = cleanTitle.split(' - ');
        parts.pop(); // remove last part which is publisher name
        cleanTitle = parts.join(' - ');
      }

      if (cleanTitle && link) {
        items.push({
          id: `news-edge-${index++}`,
          title: cleanTitle,
          source: source,
          publishedAt: pubDate ? new Date(pubDate).toLocaleDateString('id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Terbaru',
          url: link,
        });
      }
    }

    return new Response(JSON.stringify(items), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Failed to fetch news feed' }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

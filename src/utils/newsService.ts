import { SeismicEvent } from '../types/seismic';

export interface DisasterNewsArticle {
  title: string;
  source: string;
  sourceUrl?: string;
  link: string;
  pubDate: string;
  relativeTime: string;
  snippet?: string;
}

export interface DisasterNewsResult {
  query: string;
  articles: DisasterNewsArticle[];
  isPending: boolean;
  googleNewsSearchUrl: string;
}

// In-memory cache for news queries (TTL 5 minutes)
const newsCache = new Map<string, { result: DisasterNewsResult; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Extracts a concise search keyword for news from a USGS/BMKG place string.
 * Example inputs:
 *  - "14 km SW of Pelabuhanratu, Indonesia" -> "Pelabuhanratu"
 *  - "Pusat gempa berada di laut 64 km BaratDaya Garut" -> "Garut"
 *  - "Southern Sumatra, Indonesia" -> "Sumatra"
 *  - "Ruteng, Manggarai" -> "Ruteng Manggarai"
 */
export function extractDisasterLocationKeyword(place: string): string {
  if (!place) return 'Indonesia';

  let cleaned = place;

  // Remove common USGS directional prefixes like "14 km SW of ", "235 km ENE of "
  cleaned = cleaned.replace(/^\d+\s*(?:km|miles|mi)\s+[NSEWnsew]{1,4}\s+of\s+/i, '');

  // Remove trailing country tags like ", Indonesia"
  cleaned = cleaned.replace(/,\s*Indonesia$/i, '');

  // Remove BMKG descriptions like "Pusat gempa berada di laut ... km Barat Daya "
  cleaned = cleaned.replace(/Pusat gempa berada di (?:laut|darat)\s*\d*\s*km\s*[A-Za-z\s]*\s+/i, '');

  // Strip generic punctuation
  cleaned = cleaned.replace(/[,.-]/g, ' ').replace(/\s+/g, ' ').trim();

  // If result is empty or too short, return original cleaned
  return cleaned || 'Indonesia';
}

export interface DisasterNewsQueryTarget {
  place?: string | null;
  wilayah?: string;
  id?: string;
  usgs_id?: string;
  disasterType?: 'earthquake' | 'volcano' | 'wildfire';
  customQuery?: string;
}

/**
 * Generates an optimized Google News search query for earthquakes, active volcanoes, or wildfires.
 */
export function buildDisasterNewsQuery(
  event: Partial<SeismicEvent> & DisasterNewsQueryTarget,
  lang: 'id' | 'en' = 'id'
): string {
  if (event.customQuery) {
    return event.customQuery;
  }

  // Volcano queries
  if (event.disasterType === 'volcano') {
    const raw = (event.place || '').replace(/^(?:Gunung|G\.)\s+/i, '').trim();
    return lang === 'en' ? `eruption ${raw} volcano` : `erupsi ${raw}`;
  }

  // Wildfire / Karhutla queries
  if (event.disasterType === 'wildfire') {
    const raw = (event.place || 'Indonesia').replace(/\s+REGION$/i, '').trim();
    return lang === 'en' ? `wildfire forest fire ${raw}` : `kebakaran hutan ${raw}`;
  }

  // Earthquake queries (default)
  const rawPlace = event.wilayah || event.place || '';
  const keyword = extractDisasterLocationKeyword(rawPlace);

  if (lang === 'en') {
    return `earthquake ${keyword}`;
  }
  return `gempa ${keyword}`;
}

/**
 * Direct Google News search URL for fallback or direct deep linking.
 */
export function getGoogleNewsSearchUrl(query: string, lang: 'id' | 'en' = 'id'): string {
  const enc = encodeURIComponent(query);
  if (lang === 'en') {
    return `https://news.google.com/search?q=${enc}&hl=en-US&gl=US&ceid=US:en`;
  }
  return `https://news.google.com/search?q=${enc}&hl=id&gl=ID&ceid=ID:id`;
}

/**
 * Fetches verified live news articles for a seismic event, active volcano, or wildfire.
 */
export async function fetchDisasterNews(
  event: Partial<SeismicEvent> & DisasterNewsQueryTarget,
  lang: 'id' | 'en' = 'id'
): Promise<DisasterNewsResult> {
  const query = buildDisasterNewsQuery(event, lang);
  const cacheKey = `${query}_${lang}`;
  const now = Date.now();

  const searchUrl = getGoogleNewsSearchUrl(query, lang);

  // Check cache
  const cached = newsCache.get(cacheKey);
  if (cached && cached.expiry > now) {
    return cached.result;
  }

  try {
    const res = await fetch(`/api/news?q=${encodeURIComponent(query)}&lang=${lang}`);
    if (res.ok) {
      const data = await res.json();
      const articles: DisasterNewsArticle[] = Array.isArray(data.articles) ? data.articles : [];

      const result: DisasterNewsResult = {
        query,
        articles,
        isPending: articles.length === 0,
        googleNewsSearchUrl: searchUrl,
      };

      newsCache.set(cacheKey, { result, expiry: now + CACHE_TTL_MS });
      return result;
    }
  } catch (err) {
    console.warn('[NewsService] Failed to fetch from /api/news, providing search fallback:', err);
  }

  // Graceful fallback if endpoint is unreachable
  const fallbackResult: DisasterNewsResult = {
    query,
    articles: [],
    isPending: true,
    googleNewsSearchUrl: searchUrl,
  };

  return fallbackResult;
}

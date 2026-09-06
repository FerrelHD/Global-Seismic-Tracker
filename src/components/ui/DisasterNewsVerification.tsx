import React, { useEffect, useState } from 'react';
import { ExternalLink, Newspaper, RefreshCw, Search, ShieldCheck, Clock } from 'lucide-react';
import { SeismicEvent } from '../../types/seismic';
import {
  fetchDisasterNews,
  DisasterNewsResult,
  DisasterNewsArticle,
  buildDisasterNewsQuery,
  DisasterNewsQueryTarget,
} from '../../utils/newsService';

interface DisasterNewsVerificationProps {
  event: Partial<SeismicEvent> & DisasterNewsQueryTarget;
  lang?: 'id' | 'en';
  className?: string;
}

export const DisasterNewsVerification: React.FC<DisasterNewsVerificationProps> = ({
  event,
  lang = 'id',
  className = '',
}) => {
  const [newsData, setNewsData] = useState<DisasterNewsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadNews = async (force = false) => {
    if (force) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const result = await fetchDisasterNews(event, lang);
      setNewsData(result);
    } catch (err) {
      console.warn('Error loading news verification:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, [event.id, event.usgs_id, event.place, event.disasterType, event.customQuery, lang]);

  const query = newsData?.query || buildDisasterNewsQuery(event, lang);
  const articles = newsData?.articles || [];
  const searchUrl = newsData?.googleNewsSearchUrl || `https://news.google.com/search?q=${encodeURIComponent(query)}`;
  const hasArticles = articles.length > 0;

  return (
    <div
      className={`rounded-2xl border border-slate-200/85 bg-gradient-to-b from-white/95 to-slate-50/90 shadow-sm overflow-hidden text-left ${className}`}
    >
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-slate-200/70 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Newspaper className="w-3.5 h-3.5 text-slate-100" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[11px] tracking-wider text-slate-900 uppercase">
                {lang === 'id' ? 'Verifikasi Berita Terkini' : 'Live News Verification'}
              </span>

              {/* Status Verification Badge */}
              {isLoading ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 font-mono text-[9px] text-slate-500 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>{lang === 'id' ? 'MEMERIKSA...' : 'SCANNING...'}</span>
                </span>
              ) : hasArticles ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-mono text-[9px] font-semibold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {lang === 'id'
                      ? `${articles.length} BERITA TERVERIFIKASI`
                      : `${articles.length} VERIFIED REPORTS`}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-mono text-[9px] font-semibold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  <span>{lang === 'id' ? 'MENUNGGU LIPUTAN MEDIA' : 'AWAITING MEDIA COVERAGE'}</span>
                </span>
              )}
            </div>
            <p className="text-[9.5px] font-mono text-slate-600 truncate max-w-[260px] sm:max-w-xs mt-0.5">
              {lang === 'id' ? 'Pencarian:' : 'Query:'} &ldquo;{query}&rdquo;
            </p>
          </div>
        </div>

        {/* Refresh & Search External Link */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            onClick={() => loadNews(true)}
            disabled={isLoading || isRefreshing}
            title={lang === 'id' ? 'Segarkan Berita' : 'Refresh News'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-slate-900' : ''}`} />
          </button>
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={lang === 'id' ? 'Buka pencarian lengkap di Google News' : 'Open in Google News'}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors font-mono text-[10px] tracking-wide"
          >
            <Search className="w-3 h-3 text-slate-500" />
            <span className="hidden sm:inline">Google News</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3">
        {isLoading ? (
          /* Shimmer Skeleton */
          <div className="space-y-2.5 py-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-2.5 rounded-xl border border-slate-100 bg-white/70 space-y-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-16 bg-slate-200 rounded-full" />
                  <div className="h-3 w-12 bg-slate-100 rounded-full" />
                </div>
                <div className="h-3.5 w-4/5 bg-slate-200 rounded" />
                <div className="h-3 w-3/5 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : hasArticles ? (
          /* Articles List */
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {articles.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group block p-3 rounded-xl border border-slate-200/70 hover:border-slate-400/90 bg-white/95 hover:bg-white shadow-2xs hover:shadow-xs transition-all duration-200 text-left"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono text-[9px] font-bold tracking-wider uppercase shadow-2xs">
                      {item.source}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9.5px] font-mono text-slate-400">
                      <Clock className="w-2.5 h-2.5 text-slate-400" />
                      <span>{item.relativeTime}</span>
                    </span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 transition-colors shrink-0" />
                </div>

                <h4 className="text-[12px] font-sans font-semibold text-slate-800 group-hover:text-slate-950 leading-snug line-clamp-2 transition-colors">
                  {item.title}
                </h4>
              </a>
            ))}
          </div>
        ) : (
          /* Empty / Pending State */
          <div className="py-4 px-3 text-center space-y-2">
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 border border-amber-200/80 mx-auto flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[11px] font-mono font-medium text-slate-700">
                {lang === 'id' ? 'Belum Ada Artikel Media Terindeks' : 'No Media Articles Indexed Yet'}
              </p>
              <p className="text-[10px] font-mono text-slate-600 max-w-xs mx-auto mt-0.5 leading-relaxed">
                {lang === 'id'
                  ? 'Peristiwa mungkin baru terjadi beberapa menit yang lalu dan wartawan sedang memverifikasi laporan di lapangan.'
                  : 'The seismic event may have occurred minutes ago and journalists are still compiling field reports.'}
              </p>
            </div>
            <div className="pt-1">
              <a
                href={searchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] tracking-wide transition-all shadow-xs"
              >
                <Search className="w-3 h-3" />
                <span>{lang === 'id' ? 'Pantau Langsung di Google News' : 'Check Google News Live'}</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Notice */}
      <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200/60 flex items-center justify-between text-[9px] font-mono text-slate-600">
        <span>{lang === 'id' ? 'Sumber Berita Terverifikasi Google News' : 'Verified via Google News Feeds'}</span>
        <span className="text-slate-400">Past 7 Days</span>
      </div>
    </div>
  );
};

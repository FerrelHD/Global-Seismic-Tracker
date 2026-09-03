import React, { useMemo, useState } from 'react';
import { SeismicEvent } from '../../types/seismic';
import { X, Bookmark as BookmarkIcon, Search, Radio } from 'lucide-react';

interface EventsListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  events: SeismicEvent[];
  selectedRegion: string;
  onSelectEvent: (event: SeismicEvent) => void;
  isBookmarked: (event: SeismicEvent) => boolean;
  onToggleBookmark: (event: SeismicEvent) => void;
}

function formatRelativeTime(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function cleanLocation(place: string | null): string {
  if (!place) return 'Unknown Epicenter';
  const parts = place.split(' of ');
  return parts.length > 1 ? parts[1] : place;
}

export const EventsListDrawer: React.FC<EventsListDrawerProps> = ({
  isOpen,
  onClose,
  events,
  selectedRegion,
  onSelectEvent,
  isBookmarked,
  onToggleBookmark,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'm5' | 'm6' | 'saved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Process and filter events
  const filteredEvents = useMemo(() => {
    let list = [...events].sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0));

    if (filterMode === 'm6') {
      list = list.filter((e) => (e.magnitude ?? 0) >= 6.0);
    } else if (filterMode === 'm5') {
      list = list.filter((e) => (e.magnitude ?? 0) >= 5.0);
    } else if (filterMode === 'saved') {
      list = list.filter((e) => isBookmarked(e));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          (e.place && e.place.toLowerCase().includes(q)) ||
          (e.magnitude && `m${e.magnitude}`.includes(q))
      );
    }

    return list.slice(0, 80);
  }, [events, filterMode, searchQuery, isBookmarked]);

  const savedCount = useMemo(() => {
    return events.filter((e) => isBookmarked(e)).length;
  }, [events, isBookmarked]);

  if (!isOpen) return null;

  return (
    <>
      {/* Subtle backdrop so the 3D globe remains faintly visible */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-50 transition-opacity duration-300 opacity-100 pointer-events-auto animate-in fade-in"
      />

      {/* High-End Minimalist Telemetry Ledger Drawer */}
      <aside
        data-lenis-prevent="true"
        onWheel={(e) => e.stopPropagation()}
        className="fixed top-0 left-0 bottom-0 h-full w-full max-w-md z-50 shadow-2xl bg-white/92 backdrop-blur-2xl border-r border-slate-200/80 rounded-r-3xl flex flex-col justify-between animate-in slide-in-from-left duration-300 ease-out font-sans overflow-hidden"
      >
        {/* 1. Header: Clean Minimalist Title & Live Status */}
        <div className="shrink-0 px-6 pt-5 pb-4 border-b border-slate-200/70 bg-white/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 tracking-tight flex items-center gap-2">
                  Live Seismic Feed
                </h2>
                <p className="text-[11px] text-slate-400 font-mono tracking-wide mt-0.5">
                  {events.length.toLocaleString()} total shocks recorded
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              title="Close drawer"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Filter Segmented Pills */}
          <div className="flex items-center gap-1.5 mt-4 pt-1">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode('m5')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                filterMode === 'm5'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              M5.0+
            </button>
            <button
              onClick={() => setFilterMode('m6')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                filterMode === 'm6'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              Major M6.0+
            </button>
            <button
              onClick={() => setFilterMode('saved')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                filterMode === 'saved'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200/80'
              }`}
            >
              <BookmarkIcon className="w-3 h-3" />
              <span>Saved</span>
              {savedCount > 0 && (
                <span className="text-[10px] px-1.5 rounded-full bg-slate-200/80 text-slate-800">
                  {savedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* 2. Scrollable Data List (Native Scroll with Lenis Prevention) */}
        <div
          data-lenis-prevent="true"
          onWheel={(e) => e.stopPropagation()}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain select-none divide-y divide-slate-100/80 px-2 py-1"
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {filteredEvents.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-8 text-slate-400 font-sans text-xs">
              <Radio className="w-6 h-6 text-slate-300 mb-2" />
              <p className="font-medium text-slate-600">No events found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try selecting another filter above</p>
            </div>
          ) : (
            filteredEvents.map((evt, idx) => {
              const mag = evt.magnitude?.toFixed(1) ?? 'N/A';
              const magVal = evt.magnitude ?? 0;
              const bookmarked = isBookmarked(evt);
              const relTime = formatRelativeTime(evt.occurred_at);

              return (
                <div
                  key={evt.usgs_id || evt.id}
                  onClick={() => {
                    onSelectEvent(evt);
                    onClose();
                  }}
                  className="group relative flex items-center justify-between gap-3 px-4 py-2.5 my-0.5 rounded-lg hover:bg-slate-100/80 transition-colors duration-150 cursor-pointer"
                >
                  {/* Subtle Left Edge Accent on Hover */}
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-slate-900 rounded-r scale-y-0 group-hover:scale-y-100 transition-transform duration-150 ease-out origin-center" />

                  {/* Magnitude: Clean Scientific Monospace + Status Beacon (No Clunky Capsule) */}
                  <div className="shrink-0 w-12 flex items-center gap-1.5 pl-0.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        magVal >= 6.0
                          ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)] animate-pulse'
                          : magVal >= 5.0
                          ? 'bg-amber-500'
                          : 'bg-slate-300'
                      }`}
                    />
                    <span
                      className={`font-mono text-sm tabular-nums tracking-tight ${
                        magVal >= 6.0
                          ? 'text-rose-600 font-bold'
                          : magVal >= 5.0
                          ? 'text-slate-900 font-semibold'
                          : 'text-slate-600 font-medium'
                      }`}
                    >
                      {mag}
                    </span>
                  </div>

                  {/* Clean Location & Subtext */}
                  <div className="flex-1 min-w-0 pr-1 pl-1">
                    <h3 className="text-xs font-medium text-slate-900 tracking-tight truncate group-hover:text-blue-600 transition-colors">
                      {cleanLocation(evt.place)}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                      <span>{evt.depth.toFixed(0)} km</span>
                      <span className="text-slate-300">/</span>
                      <span>{relTime}</span>
                    </div>
                  </div>

                  {/* Bookmark Button */}
                  <div className="shrink-0 flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBookmark(evt);
                      }}
                      title={bookmarked ? 'Remove bookmark' : 'Save bookmark'}
                      className={`p-1.5 rounded-lg transition-all duration-150 cursor-pointer ${
                        bookmarked
                          ? 'text-blue-600 opacity-100'
                          : 'text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-700 hover:bg-slate-200/60'
                      }`}
                    >
                      <BookmarkIcon className={`w-3.5 h-3.5 ${bookmarked ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 3. Minimalist Footer Bar */}
        <div className="shrink-0 px-6 py-3 border-t border-slate-200/70 bg-slate-50/70 flex items-center justify-between text-[11px] text-slate-500 font-sans">
          <span className="flex items-center gap-1.5 text-slate-600 font-medium">
            Click row to focus 3D globe
          </span>
          <span className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 shadow-2xs text-slate-600 font-medium">
              ESC
            </kbd>
            <span>close</span>
          </span>
        </div>
      </aside>
    </>
  );
};
